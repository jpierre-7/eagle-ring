/**
 * Site screenshots: the optional 16:9 picture of a Member's Site that the
 * Directory shows on hover (spec §3 "Screenshot").
 *
 * Pure, like `./member`: the build (`./members`) and the Submission checks
 * both use these rules, and the tests run them without Astro.
 */
// `.ts` because the Submission checks load this under plain Node.
import { slugProblem } from './member.ts'

/** The folder every screenshot lives in, relative to the repo root. */
export const SCREENSHOTS_DIR = 'src/content/screenshots'

/** The allowed file types, as written in the filename (lowercase). */
export const SCREENSHOT_EXTENSIONS = ['webp', 'png', 'jpg'] as const
export type ScreenshotExtension = (typeof SCREENSHOT_EXTENSIONS)[number]

/** The largest allowed file: 500 KB. A 1280×720 WebP is usually under 150 KB. */
export const SCREENSHOT_MAX_BYTES = 500 * 1024

/** Allowed widths in pixels: 1280×720 up to 1920×1080. */
export const SCREENSHOT_MIN_WIDTH = 1280
export const SCREENSHOT_MAX_WIDTH = 1920

/** The size the Directory shows: 320 CSS pixels wide, built at twice that. */
export const PREVIEW_WIDTH = 640
export const PREVIEW_HEIGHT = 360

/** Why a screenshot's filename is invalid, or `undefined` when it is fine. */
export function screenshotNameProblem(entry: string): string | undefined {
  if (entry.includes('/')) return 'screenshots go directly in the folder, not in a subfolder'
  const dot = entry.lastIndexOf('.')
  const ext = dot === -1 ? '' : entry.slice(dot + 1)
  if (!(SCREENSHOT_EXTENSIONS as readonly string[]).includes(ext)) {
    return `must be named <your-slug>.${SCREENSHOT_EXTENSIONS.join(', .')} (lowercase)`
  }
  const slug = entry.slice(0, dot)
  const problem = slugProblem(slug)
  return problem ? `"${slug}" ${problem}` : undefined
}

/** The slug and extension of a screenshot filename. Check the name first. */
export function parseScreenshotEntry(entry: string): { slug: string; ext: ScreenshotExtension } {
  const dot = entry.lastIndexOf('.')
  return { slug: entry.slice(0, dot), ext: entry.slice(dot + 1) as ScreenshotExtension }
}

/** Why a screenshot's pixel size is wrong, or `undefined` when it is fine. */
export function screenshotSizeProblem(width: number, height: number): string | undefined {
  const size = `${width}×${height}`
  if (width < SCREENSHOT_MIN_WIDTH || width > SCREENSHOT_MAX_WIDTH) {
    return `is ${size}; it must be from ${SCREENSHOT_MIN_WIDTH}×720 to ${SCREENSHOT_MAX_WIDTH}×1080 pixels`
  }
  // 16:9, allowing a pixel of rounding (1366×768 is 16:9 to the nearest pixel).
  if (Math.abs(height - (width * 9) / 16) > 1) {
    return `is ${size}, which isn't 16:9; at ${width} pixels wide it must be ${Math.round((width * 9) / 16)} high`
  }
  return undefined
}

/** A picture's real type and pixel size, read from its first bytes. */
export interface ImageInfo {
  format: 'png' | 'jpeg' | 'webp'
  width: number
  height: number
}

/**
 * Reads the type and size from a PNG, JPEG or WebP file's header, so CI can
 * check a screenshot without an image library. `undefined` for anything else
 * or a file cut short.
 */
export function imageInfo(bytes: Uint8Array): ImageInfo | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (at: number, length: number) => String.fromCharCode(...bytes.subarray(at, at + length))
  try {
    // PNG: the signature, then the IHDR chunk with width and height.
    if (bytes.length >= 24 && ascii(1, 3) === 'PNG' && bytes[0] === 0x89 && ascii(12, 4) === 'IHDR') {
      return { format: 'png', width: view.getUint32(16), height: view.getUint32(20) }
    }
    // JPEG: walk the segments to the first frame header (SOFn).
    if (bytes[0] === 0xff && bytes[1] === 0xd8) {
      let at = 2
      while (at + 9 < bytes.length) {
        if (bytes[at] !== 0xff) return undefined
        const marker = bytes[at + 1]
        if (marker === 0xff) {
          at++
          continue
        }
        const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
        if (isFrame) return { format: 'jpeg', width: view.getUint16(at + 7), height: view.getUint16(at + 5) }
        at += 2 + view.getUint16(at + 2)
      }
      return undefined
    }
    // WebP: a RIFF file whose first chunk is lossy, lossless or extended.
    if (bytes.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
      const chunk = ascii(12, 4)
      if (chunk === 'VP8 ') {
        return { format: 'webp', width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
      }
      if (chunk === 'VP8L') {
        const bits = view.getUint32(21, true)
        return { format: 'webp', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 }
      }
      if (chunk === 'VP8X') {
        const u24 = (at: number) => bytes[at] | (bytes[at + 1] << 8) | (bytes[at + 2] << 16)
        return { format: 'webp', width: u24(24) + 1, height: u24(27) + 1 }
      }
    }
  } catch {
    // A header cut short: DataView reads past the end throw.
  }
  return undefined
}

/** The image format each extension must hold. */
export const EXTENSION_FORMAT: Record<ScreenshotExtension, ImageInfo['format']> = {
  webp: 'webp',
  png: 'png',
  jpg: 'jpeg',
}
