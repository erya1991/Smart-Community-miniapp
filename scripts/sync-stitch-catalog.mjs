import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Only download original images referenced by the frozen Stitch HTML.
const jobs = [
  { app: 'resident', screen: '_5', names: ['vegetables', 'rice', 'peach', 'breakfast', 'tissue', 'wonton'] },
  { app: 'merchant', screen: '_6', names: ['vegetables', 'watermelon', 'eggs', 'water-dropwort'] },
]
for (const job of jobs) {
  const html = await readFile(new URL(`../docs/stitch/batch-1/${job.screen}/code.html`, import.meta.url), 'utf8')
  const tags = [...html.matchAll(/<img\b[^>]*>/g)]
  if (tags.length !== job.names.length) throw new Error('Stitch image count changed')
  const dir = new URL(`../apps/${job.app}-miniapp/src/static/images/catalog/`, import.meta.url)
  await mkdir(dir, { recursive: true })
  for (const [index, tag] of tags.entries()) {
    const target = new URL(`${job.names[index]}.png`, dir)
    try { await access(target); console.log(`Exists: ${fileURLToPath(target)}`); continue } catch {}
    const url = tag[0].match(/src="([^"]+)"/)[1]
    if (new URL(url).hostname !== 'lh3.googleusercontent.com') throw new Error('Unexpected asset host')
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Invalid image response: ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.length < 1000) throw new Error('Image response too small')
    await writeFile(target, bytes, { flag: 'wx' })
    console.log(`Downloaded: ${fileURLToPath(target)} (${bytes.length} bytes)`)
  }
}
