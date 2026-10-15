// Spec §3 "Screenshot": the filename and size rules, and reading a picture's
// type and size from its header. Pictures are made with sharp, which Astro
// already depends on, so the header reader is checked against real encoders.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { imageInfo, screenshotNameProblem, screenshotSizeProblem } from '../src/lib/screenshot'

const picture = (width: number, height: number) =>
  sharp({ create: { width, height, channels: 3, background: '#facc15' } })

describe('imageInfo', () => {
  it('reads a PNG', async () => {
    expect(imageInfo(await picture(1366, 768).png().toBuffer())).toEqual({ format: 'png', width: 1366, height: 768 })
  })

  it('reads a baseline and a progressive JPEG', async () => {
    const expected = { format: 'jpeg', width: 1920, height: 1080 }
    expect(imageInfo(await picture(1920, 1080).jpeg().toBuffer())).toEqual(expected)
    expect(imageInfo(await picture(1920, 1080).jpeg({ progressive: true }).toBuffer())).toEqual(expected)
  })

  it('reads lossy, lossless and extended WebP', async () => {
    const expected = { format: 'webp', width: 1280, height: 720 }
    expect(imageInfo(await picture(1280, 720).webp().toBuffer())).toEqual(expected)
    expect(imageInfo(await picture(1280, 720).webp({ lossless: true }).toBuffer())).toEqual(expected)
    const withAlpha = sharp({ create: { width: 1280, height: 720, channels: 4, background: '#facc1580' } })
    expect(imageInfo(await withAlpha.webp().toBuffer())).toEqual(expected)
  })

  it('reads the real example screenshot', () => {
    const bytes = readFileSync(join(import.meta.dirname, '..', 'src/content/screenshots/khizar-ahmed.webp'))
    expect(imageInfo(bytes)).toEqual({ format: 'webp', width: 1280, height: 720 })
  })

  it('gives undefined for other files and cut-short headers', async () => {
    expect(imageInfo(new TextEncoder().encode('name: Kevin Tran\n'))).toBeUndefined()
    expect(imageInfo(await picture(1280, 720).gif().toBuffer())).toBeUndefined()
    expect(imageInfo((await picture(1280, 720).png().toBuffer()).subarray(0, 12))).toBeUndefined()
    expect(imageInfo((await picture(1280, 720).jpeg().toBuffer()).subarray(0, 20))).toBeUndefined()
    expect(imageInfo(new Uint8Array())).toBeUndefined()
  })
})

describe('screenshotNameProblem', () => {
  it.each(['kevin-tran.webp', 'kevin-tran.png', 'kevin-tran.jpg', 'jo.webp'])('accepts %s', (entry) => {
    expect(screenshotNameProblem(entry)).toBeUndefined()
  })

  it.each([
    ['kevin-tran.jpeg', /must be named <your-slug>\.webp, \.png, \.jpg/],
    ['kevin-tran.WEBP', /lowercase/],
    ['kevin-tran.gif', /must be named/],
    ['kevin-tran', /must be named/],
    ['Kevin-Tran.webp', /lowercase letters and digits/],
    ['sub/kevin-tran.webp', /not in a subfolder/],
  ])('rejects %s', (entry, message) => {
    expect(screenshotNameProblem(entry)).toMatch(message)
  })
})

describe('screenshotSizeProblem', () => {
  it.each([
    [1280, 720],
    [1366, 768],
    [1600, 900],
    [1920, 1080],
  ])('accepts %i×%i', (width, height) => {
    expect(screenshotSizeProblem(width, height)).toBeUndefined()
  })

  it('rejects sizes outside 1280×720 to 1920×1080', () => {
    expect(screenshotSizeProblem(1024, 576)).toMatch(/is 1024×576; it must be from 1280×720 to 1920×1080/)
    expect(screenshotSizeProblem(2560, 1440)).toMatch(/is 2560×1440/)
  })

  it('rejects anything not 16:9 and says the right height', () => {
    expect(screenshotSizeProblem(1280, 800)).toMatch(/isn't 16:9; at 1280 pixels wide it must be 720 high/)
    expect(screenshotSizeProblem(1440, 900)).toMatch(/must be 810 high/)
  })
})
