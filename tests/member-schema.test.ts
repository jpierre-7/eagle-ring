// Spec §3: every rule in the Member schema table, run against the fixture
// files in tests/fixtures/members/. Fixtures never live in src/content/members/.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { createMemberSchema, isValidSlug, slugFromEntry } from '../src/lib/member'

// Pinned, so the fixtures mean the same thing every year.
const CURRENT_YEAR = 2026
const schema = createMemberSchema({ currentYear: CURRENT_YEAR })

const FIXTURES = join(import.meta.dirname, 'fixtures', 'members')

function load(dir: 'valid' | 'invalid') {
  return readdirSync(join(FIXTURES, dir))
    .filter((file) => file.endsWith('.yaml'))
    .map((file) => {
      const text = readFileSync(join(FIXTURES, dir, file), 'utf8')
      const expectField = /^# expect-field: (\S+)/.exec(text)?.[1]
      return { file, data: yaml.load(text), expectField }
    })
}

describe('valid Member files', () => {
  const fixtures = load('valid')

  it('has fixtures to check', () => {
    expect(fixtures.length).toBeGreaterThan(0)
  })

  it.each(fixtures)('$file passes the schema and its filename is a valid slug', ({ file, data }) => {
    const result = schema.safeParse(data)
    expect(result.error?.issues).toBeUndefined()
    expect(() => slugFromEntry(file)).not.toThrow()
  })

  it('keeps the spec §3 example as written', () => {
    const kevin = schema.parse(fixtures.find((f) => f.file === 'kevin-tran.yaml')!.data)
    expect(kevin).toEqual({
      name: 'Kevin Tran',
      site: 'https://kevintran.github.io/',
      graduationYear: 2023,
      github: 'kvtran',
      tagline: 'Data analyst. Plots things in R.',
      status: 'transferred',
    })
  })
})

describe('invalid Member files', () => {
  const fixtures = load('invalid')

  it('has fixtures to check, each naming the field it breaks', () => {
    expect(fixtures.length).toBeGreaterThan(0)
    for (const { file, expectField } of fixtures) expect(expectField, file).toBeDefined()
  })

  it.each(fixtures)('$file fails on $expectField', ({ data, expectField }) => {
    const result = schema.safeParse(data)
    expect(result.success).toBe(false)
    const fields = result.error!.issues.flatMap((issue) =>
      issue.code === 'unrecognized_keys' ? issue.keys : [issue.path.join('.')],
    )
    expect(fields).toContain(expectField)
  })
})

describe('Graduation Year range follows the current year', () => {
  const member = { name: 'A', site: 'https://a.dev', github: 'a' }

  it('allows up to the current year + 6', () => {
    expect(schema.safeParse({ ...member, graduationYear: CURRENT_YEAR + 6 }).success).toBe(true)
    expect(schema.safeParse({ ...member, graduationYear: CURRENT_YEAR + 7 }).success).toBe(false)
  })

  it('moves with the year the build runs in', () => {
    const later = createMemberSchema({ currentYear: CURRENT_YEAR + 1 })
    expect(later.safeParse({ ...member, graduationYear: CURRENT_YEAR + 7 }).success).toBe(true)
  })

  it('defaults to the real current year', () => {
    const year = new Date().getFullYear()
    const live = createMemberSchema()
    expect(live.safeParse({ ...member, graduationYear: year + 6 }).success).toBe(true)
    expect(live.safeParse({ ...member, graduationYear: year + 7 }).success).toBe(false)
  })
})

describe('Standing', () => {
  const member = { name: 'A', site: 'https://a.dev', github: 'a' }

  it.each(['graduated', 'transferred', 'attended'])('accepts %s up to the current year', (status) => {
    expect(schema.safeParse({ ...member, graduationYear: CURRENT_YEAR, status }).success).toBe(true)
  })

  it('is rejected on a future Graduation Year', () => {
    const result = schema.safeParse({ ...member, graduationYear: CURRENT_YEAR + 1, status: 'attended' })
    expect(result.error?.issues.map((i) => i.path)).toEqual([['status']])
  })

  it('is optional on a future Graduation Year', () => {
    expect(schema.safeParse({ ...member, graduationYear: CURRENT_YEAR + 1 }).success).toBe(true)
  })
})

describe('Faculty', () => {
  const member = { name: 'A', site: 'https://a.dev', github: 'a' }
  const issues = (data: unknown) =>
    schema.safeParse(data).error?.issues.map((issue) => [issue.path.join('.'), issue.message])

  it('may leave out Graduation Year', () => {
    expect(issues({ ...member, faculty: true })).toBeUndefined()
  })

  it('may keep a Graduation Year and Standing', () => {
    expect(issues({ ...member, faculty: true, graduationYear: 2012, status: 'graduated' })).toBeUndefined()
  })

  it('is only ever true; "not Faculty" leaves the field out', () => {
    expect(issues({ ...member, graduationYear: 2023, faculty: false })).toEqual([
      ['faculty', 'must be true if you are Faculty; otherwise leave the field out'],
    ])
  })

  it('is the only way to leave out Graduation Year', () => {
    expect(issues(member)).toEqual([
      ['graduationYear', 'is required, as a year from 1990 to 2032; only Faculty (faculty: true) may leave it out'],
    ])
  })

  it('says why Standing needs a Graduation Year', () => {
    expect(issues({ ...member, faculty: true, status: 'attended' })).toEqual([
      [
        'status',
        'must be left out when there is no graduationYear; a Standing describes your time as a student at the School, so it needs the year you graduated or left',
      ],
    ])
  })

  it('names only the faculty problem when faculty has the wrong value', () => {
    expect(issues({ ...member, faculty: 'true' })).toEqual([
      ['faculty', 'must be true if you are Faculty; otherwise leave the field out'],
    ])
  })

  it('names only the Standing problem when status is not a Standing', () => {
    expect(issues({ ...member, faculty: true, status: 'bogus' })).toEqual([
      ['status', 'must be one of graduated, transferred, attended'],
    ])
  })

  it('does not judge Standing against a Graduation Year that is itself invalid', () => {
    expect(issues({ ...member, graduationYear: 2040, status: 'graduated' })).toEqual([
      ['graduationYear', 'must be from 1990 to 2032'],
    ])
  })

  it('adds no field problems to a file that is a list, not fields', () => {
    expect(issues([member])?.map(([path]) => path)).toEqual([''])
  })

  it('reports a missing Graduation Year alongside other problems', () => {
    expect(issues({ site: 'https://a.dev', github: 'a' })).toEqual([
      ['name', 'is required, as text'],
      ['graduationYear', 'is required, as a year from 1990 to 2032; only Faculty (faculty: true) may leave it out'],
    ])
  })
})

describe('slug (the filename)', () => {
  it.each(['kevin-tran', 'jo', 'a1', 'mary-jane-watson', 'x'.repeat(32), '2024-grad'])('accepts %s', (slug) => {
    expect(isValidSlug(slug)).toBe(true)
    expect(slugFromEntry(`${slug}.yaml`)).toBe(slug)
  })

  it.each([
    ['one character', 'k'],
    ['33 characters', 'x'.repeat(33)],
    ['uppercase', 'Kevin-Tran'],
    ['underscore', 'kevin_tran'],
    ['double hyphen', 'kevin--tran'],
    ['leading hyphen', '-kevin'],
    ['trailing hyphen', 'kevin-'],
    ['space', 'kevin tran'],
    ['dot', 'kevin.tran'],
    ['accented letter', 'josé'],
  ])('rejects %s (%s)', (_, slug) => {
    expect(isValidSlug(slug)).toBe(false)
    expect(() => slugFromEntry(`${slug}.yaml`)).toThrow(`src/content/members/${slug}.yaml`)
  })

  it('names the file and the slug rule in the error', () => {
    expect(() => slugFromEntry('Kevin_Tran.yaml')).toThrow(
      /Invalid Member file src\/content\/members\/Kevin_Tran\.yaml\n\s+slug \(the filename\): "Kevin_Tran" must be lowercase/,
    )
  })

  it.each(['kevin-tran.yml', 'kevin-tran.json', 'kevin-tran', 'sub/kevin-tran.yaml'])(
    'rejects the misplaced or misnamed file %s',
    (entry) => {
      expect(() => slugFromEntry(entry)).toThrow(`src/content/members/${entry}`)
    },
  )
})
