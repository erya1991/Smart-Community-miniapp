import { residentProductAsset } from '../stores/member'
import { stage2Owner } from '../adapters/stage2-http'
let owner = ''
const downloads = new Map<string, Promise<string>>()
export function productImageReference(goods: string, file: string) { return `stage2-asset:${goods}:${file}` }
export async function stage2Asset(reference: string): Promise<string> {
  const current = stage2Owner()
  if (current !== owner) { owner = current; downloads.clear() }
  const match = /^stage2-asset:([1-9]\d{0,18}):([1-9]\d{0,18})$/.exec(reference)
  if (!match) return reference.startsWith('stage2-asset:') ? '' : reference
  if (!downloads.has(reference)) downloads.set(reference, residentProductAsset(`/buyer/p0/s2/goods/${match[1]}/images/${match[2]}`).catch((error) => { downloads.delete(reference); throw error }))
  const value = await downloads.get(reference)!
  return current === stage2Owner() ? value : ''
}
