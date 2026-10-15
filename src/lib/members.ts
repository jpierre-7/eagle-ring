/**
 * The shared Member module: the loaded Members plus every helper. Pages and
 * endpoints import from here; the pure helpers live in `./member` so they can
 * be tested without Astro.
 */
import { getCollection } from 'astro:content'
import type { ImageMetadata } from 'astro'
import { ringOrder, type Member } from './member'
import { parseScreenshotEntry, SCREENSHOTS_DIR, screenshotNameProblem, screenshotSizeProblem } from './screenshot'

export * from './member'

/** Every Member, validated, in ring order (alphabetical by slug). */
export const members: Member[] = ringOrder(
  (await getCollection('members')).map(({ id, data }) => ({ slug: id, ...data })),
)

/**
 * Each Member's screenshot, by slug (spec §3 "Screenshot"). Checked here as
 * well as in CI, so a bad one fails `npm run build` with the file named: the
 * filename, a Member to go with, one per Member, and 16:9 from 1280×720 to
 * 1920×1080. The file size limit is CI's alone.
 */
export const screenshots: Map<string, ImageMetadata> = (() => {
  const files = import.meta.glob<ImageMetadata>('../content/screenshots/*', { eager: true, import: 'default' })
  const slugs = new Set(members.map((member) => member.slug))
  const found = new Map<string, ImageMetadata>()
  for (const [key, image] of Object.entries(files)) {
    const entry = key.slice(key.lastIndexOf('/') + 1)
    const file = `${SCREENSHOTS_DIR}/${entry}`
    const fail = (why: string): never => {
      throw new Error(`Invalid screenshot ${file}\n  ${why}`)
    }
    const nameProblem = screenshotNameProblem(entry)
    if (nameProblem) fail(`the filename ${nameProblem}`)
    const { slug } = parseScreenshotEntry(entry)
    if (!slugs.has(slug)) fail(`there is no Member file for "${slug}"`)
    if (found.has(slug)) fail(`"${slug}" already has a screenshot; a Member has one at most`)
    // Reading a field of an imported image marks the full-size original as
    // used, and Astro then publishes it next to the preview. Read the size
    // from Astro's own unmarked copy (`clone`, as `getImage` does), so only
    // the 640×360 preview ships.
    const { width, height } = (image as ImageMetadata & { clone?: ImageMetadata }).clone ?? image
    const sizeProblem = screenshotSizeProblem(width, height)
    if (sizeProblem) fail(`the picture ${sizeProblem}`)
    found.set(slug, image)
  }
  return found
})()
