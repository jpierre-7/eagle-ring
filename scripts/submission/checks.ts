/**
 * The checks on a Submission PR (spec §4 "CI checks on a Submission PR").
 *
 * Pure: no git, no disk, no network of its own. The caller hands in what the
 * PR changes, the Member files before and after, and a function that fetches
 * a Site. `scripts/check-submission.ts` gathers those from git; the tests hand
 * them in directly.
 *
 * Every message is written for the submitter: it says what is wrong and what
 * to do about it.
 */
import yaml from 'js-yaml'
import { createMemberSchema, MEMBERS_DIR, slugFromEntry } from '../../src/lib/member.ts'
import {
  EXTENSION_FORMAT,
  imageInfo,
  parseScreenshotEntry,
  SCREENSHOT_MAX_BYTES,
  SCREENSHOTS_DIR,
  screenshotNameProblem,
  screenshotSizeProblem,
} from '../../src/lib/screenshot.ts'
import { PROFILE_HOSTS } from './profile-hosts.ts'

/** Used when there is no CODEOWNERS file, or it names nobody. */
export const DEFAULT_MAINTAINERS: readonly string[] = ['jpierre-7']

/** Where GitHub looks for CODEOWNERS, in its own order of precedence. */
export const CODEOWNERS_PATHS = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'] as const

export const NEEDS_APPROVAL_LABEL = 'needs-maintainer-approval'

export type ChangeStatus = 'added' | 'modified' | 'deleted'

export interface ChangedFile {
  /** Path from the repo root, with forward slashes. */
  path: string
  status: ChangeStatus
}

/** A Member file's path and raw YAML text. */
export interface MemberFileText {
  path: string
  text: string
}

/** A screenshot's path and raw bytes. */
export interface ScreenshotFile {
  path: string
  bytes: Uint8Array
}

/** What happened when CI fetched a Site: `ok`, or why it failed. */
export type SiteProbe = { ok: true } | { ok: false; reason: string }

export interface SubmissionInput {
  /** The PR author's GitHub login. */
  author: string
  /** The Maintainer's GitHub handles, from CODEOWNERS on the base branch. */
  maintainers: readonly string[]
  /** Every file the PR adds, edits or deletes. */
  changedFiles: readonly ChangedFile[]
  /** Every Member file after the PR (the head of the PR). */
  headMembers: readonly MemberFileText[]
  /** Member files before the PR, at least the ones the PR edits or deletes. */
  baseMembers: readonly MemberFileText[]
  /** Every screenshot after the PR. Leave out when there are none. */
  headScreenshots?: readonly ScreenshotFile[]
  /** Fetches a Site once. Leave out to skip the reachability warning. */
  probeSite?: (site: string) => Promise<SiteProbe>
  /** The year the schema treats as now. Defaults to the real year. */
  currentYear?: number
}

export interface Finding {
  /** The Member file the finding is about, when there is one. */
  file?: string
  message: string
}

export interface SubmissionReport {
  /** Whether the author is the Maintainer (and so exempt from the scope rule). */
  byMaintainer: boolean
  /** Member files the PR adds, edits or deletes. */
  memberChanges: ChangedFile[]
  /** Screenshots the PR adds, edits or deletes. */
  screenshotChanges: ChangedFile[]
  /** Blocking: the PR can't merge until these are fixed. */
  errors: Finding[]
  /** Not blocking: the Maintainer takes a look. */
  warnings: Finding[]
  /** Edits or deletions of someone else's record: needs Maintainer approval. */
  needsApproval: Finding[]
}

// ---------------------------------------------------------------------------
// Small rules, exported for the tests
// ---------------------------------------------------------------------------

/**
 * The Maintainer's handles from a CODEOWNERS file: every `@user` owner on any
 * rule, without the `@`. Teams (`@org/team`) and email owners are skipped.
 * Falls back to {@link DEFAULT_MAINTAINERS} when the file is missing or names
 * nobody.
 */
export function maintainersFromCodeowners(text: string | undefined): string[] {
  const handles = new Set<string>()
  for (const raw of (text ?? '').split(/\r?\n/)) {
    const line = raw.replace(/(^|\s)#.*$/, '').trim()
    if (!line) continue
    const [, ...owners] = line.split(/\s+/)
    for (const owner of owners) {
      const match = /^@([A-Za-z0-9-]+)$/.exec(owner)
      if (match) handles.add(match[1])
    }
  }
  return handles.size > 0 ? [...handles] : [...DEFAULT_MAINTAINERS]
}

function sameHandle(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase()
}

/**
 * A Site in the form used to compare Sites: the host lowercased (the URL
 * parser does that) and trailing slashes dropped, the path otherwise kept.
 * `https://Kevin.GitHub.io/` and `https://kevin.github.io` compare equal.
 */
export function normaliseSite(site: string): string {
  try {
    const url = new URL(site)
    return `${url.protocol}//${url.host}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return site.trim().replace(/\/+$/, '').toLowerCase()
  }
}

/** The denylisted domain a Site sits on, or `undefined` when it is allowed. */
export function profileHost(site: string): string | undefined {
  let host: string
  try {
    host = new URL(site).hostname.toLowerCase().replace(/\.$/, '')
  } catch {
    return undefined
  }
  return PROFILE_HOSTS.find((domain) => host === domain || host.endsWith(`.${domain}`))
}

/** The part of a path under `src/content/members/`, or `undefined`. */
function memberEntry(path: string): string | undefined {
  const prefix = `${MEMBERS_DIR}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : undefined
}

/** The part of a path under `src/content/screenshots/`, or `undefined`. */
function screenshotEntry(path: string): string | undefined {
  const prefix = `${SCREENSHOTS_DIR}/`
  return path.startsWith(prefix) ? path.slice(prefix.length) : undefined
}

/** The slug a Member file or screenshot path belongs to, from its filename. */
function recordSlug(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1)
  const dot = name.lastIndexOf('.')
  return dot === -1 ? name : name.slice(0, dot)
}

/** The Member file path for a slug. */
const memberPath = (slug: string) => `${MEMBERS_DIR}/${slug}.yaml`

/** Folders that hold CI and the checks themselves. A Submission never touches them. */
export const CI_DIRS = ['scripts', '.github'] as const

/** Whether a path is part of CI or the checks (under {@link CI_DIRS}). */
export function isCiPath(path: string): boolean {
  return CI_DIRS.some((dir) => path.startsWith(`${dir}/`))
}

function listFiles(paths: readonly string[]): string {
  return paths.map((p) => `\`${p}\``).join(', ')
}

type Parsed =
  | { ok: true; data: unknown }
  | { ok: false; message: string }

function parseYaml(text: string): Parsed {
  try {
    return { ok: true, data: yaml.load(text) }
  } catch (error) {
    const reason = error instanceof yaml.YAMLException ? error.reason : String(error)
    return { ok: false, message: reason }
  }
}

/** The `github` field of a record, if it has a usable one. */
function recordOwner(text: string | undefined): string | undefined {
  if (text === undefined) return undefined
  const parsed = parseYaml(text)
  if (!parsed.ok || typeof parsed.data !== 'object' || parsed.data === null) return undefined
  const github = (parsed.data as Record<string, unknown>).github
  return typeof github === 'string' && github.trim() ? github.trim() : undefined
}

// ---------------------------------------------------------------------------
// The checks
// ---------------------------------------------------------------------------

/**
 * Blocking: one Member's record and nothing else, unless by the Maintainer.
 * The record is one Member file, plus that Member's screenshot if they add,
 * replace or delete one; a screenshot can also change on its own.
 */
function checkScope(
  memberChanges: ChangedFile[],
  screenshotChanges: ChangedFile[],
  otherChanges: ChangedFile[],
): Finding[] {
  const findings: Finding[] = []
  if (memberChanges.length === 0 && screenshotChanges.length === 0) {
    findings.push({
      message:
        `This PR doesn't add, edit or delete a Member file. A Submission changes exactly one file in \`${MEMBERS_DIR}/\`: ` +
        `your own \`<your-slug>.yaml\`, plus your screenshot in \`${SCREENSHOTS_DIR}/\` if you have one. ` +
        'If this PR is not a Submission, the Maintainer will review it by hand.',
    })
  }
  if (memberChanges.length > 1) {
    findings.push({
      message:
        `This PR changes ${memberChanges.length} Member files: ${listFiles(memberChanges.map((c) => c.path))}. ` +
        'A Submission changes only one Member file, your own. Keep your file and take the others out of this PR. ' +
        'If you renamed your file, rename it back: the slug (the filename) never changes after it is merged.',
    })
  }
  const slugs = new Set([...memberChanges, ...screenshotChanges].map((c) => recordSlug(c.path)))
  if (memberChanges.length <= 1 && slugs.size > 1) {
    findings.push({
      message:
        `This PR changes the records of ${slugs.size} Members: ${listFiles([...memberChanges, ...screenshotChanges].map((c) => c.path))}. ` +
        'A Submission changes only your own record: your Member file and your screenshot, both named after your slug. ' +
        'Take the other files out of this PR.',
    })
  }
  const ciChanges = otherChanges.filter((c) => isCiPath(c.path))
  const restChanges = otherChanges.filter((c) => !isCiPath(c.path))
  if (ciChanges.length > 0) {
    findings.push({
      message:
        `This PR changes the checks themselves (${listFiles(ciChanges.map((c) => c.path))}). ` +
        "Submissions can't change CI; the Maintainer reviews those by hand. " +
        'Undo those changes, or open a separate PR for them.',
    })
  }
  if (restChanges.length > 0) {
    findings.push({
      message:
        `This PR also changes files outside \`${MEMBERS_DIR}/\` and \`${SCREENSHOTS_DIR}/\`: ` +
        `${listFiles(restChanges.map((c) => c.path))}. ` +
        'A Submission changes only your Member file and your screenshot. Undo those changes, or open a separate PR for them.',
    })
  }
  return findings
}

/**
 * Blocking checks on one added or edited Member file: its filename, its YAML,
 * the schema, the denylist and uniqueness. Returns the parsed Site when it is
 * fine to fetch.
 */
function checkMemberFile(
  change: ChangedFile,
  input: SubmissionInput,
  schema: ReturnType<typeof createMemberSchema>,
  errors: Finding[],
): string | undefined {
  const file = change.path
  const fail = (message: string) => errors.push({ file, message })

  const entry = memberEntry(file)!
  try {
    slugFromEntry(entry)
  } catch (error) {
    const why = String((error as Error).message).split('\n').slice(1).join(' ').trim()
    fail(
      `The filename is not a valid slug. ${why}. Rename the file to \`${MEMBERS_DIR}/<your-slug>.yaml\`, ` +
        'for example `kevin-tran.yaml`.',
    )
  }

  const text = input.headMembers.find((m) => m.path === file)?.text
  if (text === undefined) {
    fail(`CI couldn't read \`${file}\`. Check that it is a normal text file.`)
    return undefined
  }

  const parsed = parseYaml(text)
  if (!parsed.ok) {
    fail(
      `\`${file}\` isn't valid YAML (${parsed.message}). Each line should be \`field: value\` with no indentation; ` +
        'compare it with the example file in CONTRIBUTING.md.',
    )
    return undefined
  }

  const result = schema.safeParse(parsed.data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      if (issue.code === 'unrecognized_keys') {
        for (const key of issue.keys) {
          fail(`\`${key}\` is not a Member field. Remove it, or check its spelling against CONTRIBUTING.md.`)
        }
      } else if (issue.path.length === 0) {
        fail(
          `\`${file}\` must be a list of \`field: value\` lines (name, site, graduationYear, github, ` +
            'and optionally tagline, status and faculty; Faculty may leave out graduationYear). ' +
            'Compare it with the example file in CONTRIBUTING.md.',
        )
      } else {
        fail(`\`${issue.path.join('.')}\` ${issue.message}.`)
      }
    }
  }

  // Denylist and uniqueness only need the two fields, so they still run when
  // another field is wrong: the submitter sees every problem at once.
  const data = (typeof parsed.data === 'object' && parsed.data !== null ? parsed.data : {}) as Record<
    string,
    unknown
  >
  const site = typeof data.site === 'string' ? data.site.trim() : undefined
  const github = typeof data.github === 'string' ? data.github.trim() : undefined

  const others = input.headMembers
    .filter((m) => m.path !== file && m.path.endsWith('.yaml'))
    .map((m) => ({ path: m.path, parsed: parseYaml(m.text) }))
    .flatMap(({ path, parsed }) =>
      parsed.ok && typeof parsed.data === 'object' && parsed.data !== null
        ? [{ path, data: parsed.data as Record<string, unknown> }]
        : [],
    )

  let siteUsable = site !== undefined && result.success
  if (site) {
    const host = profileHost(site)
    if (host) {
      siteUsable = false
      fail(
        `\`site\` (${site}) is a profile page on ${host}, not a personal Site. ` +
          'Use the address of a website you run yourself, such as a GitHub Pages site (`https://<you>.github.io/`).',
      )
    }
    const key = normaliseSite(site)
    for (const other of others) {
      if (typeof other.data.site === 'string' && normaliseSite(other.data.site.trim()) === key) {
        siteUsable = false
        fail(
          `\`site\` (${site}) is already in the ring, in \`${other.path}\`. Each Site can be listed once. ` +
            'If that record is yours, edit it instead of adding a new file.',
        )
      }
    }
  }
  if (github) {
    for (const other of others) {
      if (typeof other.data.github === 'string' && sameHandle(other.data.github.trim(), github)) {
        fail(
          `\`github\` (${github}) is already used by \`${other.path}\`. Each GitHub account has one Member record. ` +
            'If that record is yours, edit it instead of adding a new file.',
        )
      }
    }
  }

  return siteUsable ? site : undefined
}

/**
 * Blocking checks on one added or replaced screenshot: its filename, that it
 * belongs to a Member, its real file type, its file size and its pixel size.
 */
function checkScreenshotFile(change: ChangedFile, input: SubmissionInput, errors: Finding[]): void {
  const file = change.path
  const fail = (message: string) => errors.push({ file, message })
  const rules = `a 16:9 WebP, PNG or JPEG from 1280×720 to 1920×1080 pixels, at most ${SCREENSHOT_MAX_BYTES / 1024} KB`

  const entry = screenshotEntry(file)!
  const nameProblem = screenshotNameProblem(entry)
  if (nameProblem) {
    fail(
      `The screenshot's filename is wrong: it ${nameProblem}. Name it after your slug, ` +
        `for example \`${SCREENSHOTS_DIR}/kevin-tran.webp\`.`,
    )
    return
  }
  const { slug, ext } = parseScreenshotEntry(entry)

  if (!input.headMembers.some((m) => m.path === memberPath(slug))) {
    fail(
      `There is no Member file \`${memberPath(slug)}\` for this screenshot. ` +
        'A screenshot is named after the slug of the Member file it goes with.',
    )
  }

  const bytes = input.headScreenshots?.find((s) => s.path === file)?.bytes
  if (bytes === undefined) {
    fail(`CI couldn't read \`${file}\`.`)
    return
  }
  if (bytes.length > SCREENSHOT_MAX_BYTES) {
    fail(
      `The screenshot is ${Math.ceil(bytes.length / 1024)} KB; the most allowed is ${SCREENSHOT_MAX_BYTES / 1024} KB. ` +
        'Save it as WebP, or at 1280×720, to make it smaller.',
    )
  }
  const info = imageInfo(bytes)
  if (!info) {
    fail(`The screenshot isn't a picture CI can read. It must be ${rules}.`)
    return
  }
  if (info.format !== EXTENSION_FORMAT[ext]) {
    fail(
      `The screenshot is named \`.${ext}\` but is really a ${info.format.toUpperCase()} file. ` +
        'Rename it to match, or save it again in the right format.',
    )
  }
  const sizeProblem = screenshotSizeProblem(info.width, info.height)
  if (sizeProblem) fail(`The screenshot ${sizeProblem}. It must be ${rules}.`)
}

/**
 * Blocking: a Member file the PR touches must not end up with a screenshot
 * that has no Member file (deleting a record deletes its screenshot too), and
 * a Member has one screenshot at most.
 */
function checkScreenshotPairs(slugs: Set<string>, input: SubmissionInput, errors: Finding[]): void {
  const shots = (input.headScreenshots ?? []).filter((s) => {
    const entry = screenshotEntry(s.path)
    return entry !== undefined && screenshotNameProblem(entry) === undefined
  })
  for (const slug of slugs) {
    const own = shots.filter((s) => recordSlug(s.path) === slug).map((s) => s.path)
    const hasMember = input.headMembers.some((m) => m.path === memberPath(slug))
    if (own.length > 0 && !hasMember && !errors.some((e) => own.includes(e.file ?? ''))) {
      errors.push({
        file: own[0],
        message:
          `\`${memberPath(slug)}\` is gone but its screenshot is still here. ` +
          'When you delete a Member file, delete its screenshot in the same PR.',
      })
    }
    if (own.length > 1) {
      errors.push({
        file: own[0],
        message:
          `There are ${own.length} screenshots for \`${slug}\`: ${listFiles(own)}. ` +
          'A Member has one screenshot at most. Keep one and delete the others.',
      })
    }
  }
}

/**
 * Needs approval: an edit or deletion of a record the author doesn't own.
 * `change` is a Member file, or a screenshot, whose owner is in the Member
 * file of the same slug.
 */
function checkOwnership(change: ChangedFile, input: SubmissionInput): Finding | undefined {
  const isShot = screenshotEntry(change.path) !== undefined
  const recordPath = isShot ? memberPath(recordSlug(change.path)) : change.path
  const before = input.baseMembers.find((m) => m.path === recordPath)?.text
  const owner = recordOwner(before)
  if (owner && sameHandle(owner, input.author)) return undefined
  const verb = change.status === 'deleted' ? 'deletes' : change.status === 'added' ? 'adds' : 'edits'
  const what = isShot ? 'the screenshot of a record' : 'a record'
  const whose = owner ? `${what} that belongs to @${owner}` : `${what} whose owner CI could not read`
  return {
    file: change.path,
    message:
      `@${input.author} ${verb} \`${change.path}\`, ${whose}. This needs Maintainer approval. ` +
      'If this is your record and you renamed your GitHub account, say so in the PR description.',
  }
}

/** Runs every check on a Submission PR. */
export async function checkSubmission(input: SubmissionInput): Promise<SubmissionReport> {
  const schema = createMemberSchema({ currentYear: input.currentYear })
  const byMaintainer = input.maintainers.some((m) => sameHandle(m, input.author))
  const memberChanges = input.changedFiles.filter((c) => memberEntry(c.path) !== undefined)
  const screenshotChanges = input.changedFiles.filter((c) => screenshotEntry(c.path) !== undefined)
  const otherChanges = input.changedFiles.filter(
    (c) => memberEntry(c.path) === undefined && screenshotEntry(c.path) === undefined,
  )

  const errors: Finding[] = []
  const warnings: Finding[] = []
  const needsApproval: Finding[] = []

  if (!byMaintainer) errors.push(...checkScope(memberChanges, screenshotChanges, otherChanges))

  const sitesToFetch: Array<{ file: string; site: string }> = []
  for (const change of memberChanges) {
    if (change.status !== 'deleted') {
      const site = checkMemberFile(change, input, schema, errors)
      if (site) sitesToFetch.push({ file: change.path, site })
    }
    if (change.status !== 'added' && !byMaintainer) {
      const flag = checkOwnership(change, input)
      if (flag) needsApproval.push(flag)
    }
  }

  for (const change of screenshotChanges) {
    if (change.status !== 'deleted') checkScreenshotFile(change, input, errors)
    // A screenshot that comes with a new Member file is that Member's own; one
    // added to, changed in or deleted from an existing record is checked like
    // an edit to that record, unless the Member file's own change already was.
    const slug = recordSlug(change.path)
    const recordInPr = memberChanges.find((c) => c.path === memberPath(slug))
    const existed = input.baseMembers.some((m) => m.path === memberPath(slug))
    if (!byMaintainer && existed && recordInPr?.status !== 'modified' && recordInPr?.status !== 'deleted') {
      const flag = checkOwnership(change, input)
      if (flag) needsApproval.push(flag)
    }
  }
  checkScreenshotPairs(
    new Set([...memberChanges, ...screenshotChanges].map((c) => recordSlug(c.path))),
    input,
    errors,
  )

  if (input.probeSite) {
    for (const { file, site } of sitesToFetch) {
      const probe = await input.probeSite(site)
      if (!probe.ok) {
        warnings.push({
          file,
          message:
            `CI couldn't load ${site} (${probe.reason}). This doesn't block the PR: some Sites block bots or start ` +
            'slowly, so the Maintainer will open it by hand. If the Site is down or the address has a typo, fix it.',
        })
      }
    }
  }

  return { byMaintainer, memberChanges, screenshotChanges, errors, warnings, needsApproval }
}

// ---------------------------------------------------------------------------
// Fetching a Site
// ---------------------------------------------------------------------------

/** A current desktop browser's user agent; some hosts turn away obvious bots. */
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

export const SITE_TIMEOUT_MS = 15_000

/**
 * Fetches a Site once, following redirects, with a timeout and a browser-like
 * user agent. Never throws.
 */
export async function probeSite(
  site: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs: number = SITE_TIMEOUT_MS,
): Promise<SiteProbe> {
  try {
    const response = await fetchImpl(site, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'user-agent': BROWSER_USER_AGENT,
        accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    })
    await response.body?.cancel().catch(() => {})
    if (!response.ok) return { ok: false, reason: `it answered HTTP ${response.status}` }
    return { ok: true }
  } catch (error) {
    const err = error as Error & { cause?: { code?: string; message?: string } }
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return { ok: false, reason: `no answer within ${Math.round(timeoutMs / 1000)} seconds` }
    }
    const detail = err.cause?.code ?? err.cause?.message ?? err.message
    return { ok: false, reason: `the request failed: ${detail}` }
  }
}

// ---------------------------------------------------------------------------
// The job summary
// ---------------------------------------------------------------------------

function section(title: string, findings: Finding[]): string[] {
  if (findings.length === 0) return []
  return [
    `### ${title}`,
    '',
    ...findings.map((f) => `- ${f.file ? `**\`${f.file}\`**: ` : ''}${f.message}`),
    '',
  ]
}

/** The report as Markdown, for the job summary and the log. */
export function formatReport(report: SubmissionReport, author: string): string {
  const lines = ['## Submission checks', '']
  const who = report.byMaintainer
    ? `@${author} is the Maintainer, so the one-Member-file rule and the ownership check are skipped.`
    : `PR author: @${author}.`
  const files =
    report.memberChanges.length > 0
      ? `Member files in this PR: ${report.memberChanges.map((c) => `\`${c.path}\` (${c.status})`).join(', ')}.`
      : 'This PR changes no Member files.'
  const shots =
    report.screenshotChanges.length > 0
      ? [`Screenshots in this PR: ${report.screenshotChanges.map((c) => `\`${c.path}\` (${c.status})`).join(', ')}.`]
      : []
  lines.push(who, files, ...shots, '')

  if (report.errors.length === 0) {
    lines.push('**Result: passed.** The blocking checks all pass.', '')
  } else {
    lines.push(
      `**Result: failed.** Fix ${report.errors.length === 1 ? 'the problem' : `the ${report.errors.length} problems`} ` +
        'below and push again; the checks re-run on every push.',
      '',
    )
  }
  lines.push(...section('Must fix', report.errors))
  lines.push(...section('Needs Maintainer approval', report.needsApproval))
  lines.push(...section('Warnings (not blocking)', report.warnings))
  return lines.join('\n')
}
