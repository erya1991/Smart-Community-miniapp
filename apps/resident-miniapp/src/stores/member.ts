import { reactive, readonly } from 'vue'
import { ResidentError, residentErrorMessage } from '../services/resident-session'
import type { ResidentEdit, ResidentProfile, ResidentMethod, ResidentResponse } from '../services/resident-session'
import { createResidentClient, isWechat, residentLoginCode, residentRequestId, selectResidentAvatar } from '../services/resident-platform'

const client = createResidentClient()
const state = reactive({
  authenticated: false,
  businessRevision: 0,
  profile: null as ResidentProfile | null,
  loading: false,
  busy: false,
  error: '',
  notice: '',
  linkRequired: false,
})
let initialized = false
let action = 0
let readSequence = 0
function active(operation: number) {
  if (operation !== action) throw new ResidentError('STALE_OPERATION')
}
function sync() {
  state.authenticated = client.authenticated
  if (!state.authenticated) { state.profile = null; state.linkRequired = false }
}
function accept(profile: ResidentProfile) {
  if (state.profile?.memberId === profile.memberId && state.profile.version > profile.version) return
  state.profile = profile
  sync()
}
export function initializeResidentContext() {
  if (initialized) return
  initialized = true
  try { client.restore(); sync() } catch (error) { sync(); state.error = residentErrorMessage(error) }
}
export function residentBusinessOwner(): string {
  initializeResidentContext()
  void state.businessRevision
  return `${client.memberId || 'anonymous'}:${client.revision}`
}
export async function residentProductAsset(path: string): Promise<string> { initializeResidentContext(); try { return await client.asset(path) } finally { sync() } }
export async function residentBusinessRequest(path: string, method: ResidentMethod, body?: unknown): Promise<ResidentResponse> {
  initializeResidentContext()
  try { return await client.business(path, method, body) } finally { sync() }
}
async function failure(error: unknown, operation: number) {
  if (operation !== action || (error instanceof ResidentError && error.code === 'STALE_OPERATION')) return
  sync()
  if (error instanceof ResidentError) {
    if (error.code === 'LINK_REQUIRED') state.linkRequired = true
    if (error.code === 'PROFILE_CONFLICT' && client.authenticated) {
      const revision = client.revision
      try {
        const latest = await client.profile()
        if (operation === action && revision === client.revision) accept(latest)
      } catch { /* Keep the original conflict visible; never silently retry the write. */ }
    }
  }
  if (operation === action) { sync(); state.error = residentErrorMessage(error) }
}
async function loadProfile(): Promise<void> {
  initializeResidentContext()
  if (!client.authenticated || state.busy) return
  const operation = action
  const sequence = ++readSequence
  const revision = client.revision
  state.loading = true
  state.error = ''
  try {
    const profile = await client.profile()
    if (operation === action && sequence === readSequence && revision === client.revision) accept(profile)
  } catch (error) {
    if (sequence === readSequence) await failure(error, operation)
  } finally { if (sequence === readSequence) { state.loading = false; sync() } }
}
async function change(work: (operation: number) => Promise<void>): Promise<void> {
  if (state.busy) return
  const operation = ++action
  readSequence++
  state.loading = false
  state.busy = true
  state.error = ''
  state.notice = ''
  try { await work(operation) } catch (error) { await failure(error, operation) }
  finally { if (operation === action) { state.busy = false; sync() } }
}
async function basic(operation: number) {
  if (!isWechat) throw new ResidentError('WECHAT_UNAVAILABLE')
  state.profile = null
  state.authenticated = false
  state.linkRequired = false
  const profile = await client.login(residentLoginCode)
  if (operation !== action) throw new ResidentError('STALE_OPERATION')
  accept(profile)
}
async function readAfterWrite(profile: ResidentProfile, operation: number) {
  active(operation)
  accept(profile)
  const latest = await client.profile()
  active(operation)
  accept(latest)
}
async function loginBasic(): Promise<void> {
  await change(async (operation) => { await basic(operation); active(operation); state.notice = '已使用微信基本登录，手机号可稍后主动授权。' })
}
async function authorizePhone(code?: string, outcome: 'cancelled' | 'failed' = 'cancelled'): Promise<void> {
  await change(async (operation) => {
    if (!isWechat) throw new ResidentError('WECHAT_UNAVAILABLE')
    if (!client.authenticated) await basic(operation)
    active(operation)
    if (!code) {
      if (outcome === 'failed') throw new ResidentError('PHONE_REJECTED')
      state.notice = '已取消手机号授权，基本登录仍可使用。'
      return
    }
    if (!state.profile) {
      const current = await client.profile()
      if (operation !== action) throw new ResidentError('STALE_OPERATION')
      accept(current)
    }
    const profile = await client.phone({ phoneCode: code, requestId: residentRequestId(), version: state.profile!.version })
    await readAfterWrite(profile, operation)
    active(operation)
    state.linkRequired = false
    state.notice = '手机号已更新。'
  })
}
async function saveProfile(input: ResidentEdit): Promise<void> {
  await change(async (operation) => {
    await readAfterWrite(await client.edit(input), operation)
    active(operation)
    state.notice = '资料已保存并重新读取。'
  })
}
async function changeAvatar(): Promise<void> {
  await change(async (operation) => {
    if (!state.profile || !client.authenticated) throw new ResidentError('SESSION_REQUIRED')
    const version = state.profile.version
    const revision = client.revision
    const image = await selectResidentAvatar()
    if (operation !== action || revision !== client.revision) throw new ResidentError('STALE_OPERATION')
    const uploaded = await client.uploadAvatar(image)
    if (operation !== action || revision !== client.revision) throw new ResidentError('STALE_OPERATION')
    await readAfterWrite(await client.edit({ version, avatarFileId: uploaded.fileId }), operation)
    active(operation)
    state.notice = '头像已保存并重新读取。'
  })
}
async function confirmExistingLink(): Promise<void> {
  // No approved production proof source: do not invent proofReference or send link-existing.
  if (!client.authenticated) { state.error = residentErrorMessage(new ResidentError('SESSION_REQUIRED')); return }
  state.notice = ''
  state.error = residentErrorMessage(new ResidentError('PROOF_SOURCE_PENDING'))
}
async function logout(): Promise<void> {
  const operation = ++action
  readSequence++
  state.loading = false
  state.busy = true
  state.profile = null
  state.authenticated = false
  state.linkRequired = false
  state.error = ''
  state.notice = ''
  try {
    const pending = client.logout()
    sync()
    const outcome = await pending
    if (operation === action) state.notice = outcome.confirmed ? '已退出本设备登录。' : '本设备登录信息已清除；网络异常，服务端退出结果尚未确认。'
  } catch (error) { if (operation === action) state.error = residentErrorMessage(error) }
  finally { if (operation === action) { state.busy = false; sync() } }
}
export function useResidentContext() {
  initializeResidentContext()
  return { state: readonly(state), isWechat, loadProfile, loginBasic, authorizePhone, saveProfile, changeAvatar, confirmExistingLink, logout }
}
