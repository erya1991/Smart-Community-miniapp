import { computed, reactive, readonly, ref } from 'vue'
import type { ApplicationStatus, MerchantCooperationPermissions } from '@/types/merchant-cooperation'
import { MerchantError, merchantErrorMessage } from '../services/merchant-session'
import type { MerchantIdentityContext } from '../services/merchant-session'
import { createMerchantClient, isWechat, merchantLoginCode } from '../services/merchant-platform'

// Compatibility fields remain for preserved demos. They never grant business access.
export interface MerchantOperatorApplicationContext { id: string; status: ApplicationStatus }
export interface MerchantOperator { id: string; name: string }
export interface MerchantStore { id: string; name: string }
export interface MerchantStaff { id: string; name: string; role: string }

const client = createMerchantClient()
const state = reactive({
  authenticated: false,
  sessionAvailable: false,
  identity: null as MerchantIdentityContext | null,
  loading: false,
  busy: false,
  activity: '' as '' | 'login' | 'logout',
  error: '',
  errorCode: '',
  notice: '',
})
let initialized = false
let action = 0
let readSequence = 0
let readFlight: { operation: number; revision: number; promise: Promise<void> } | null = null

function clearVerifiedIdentity() {
  state.identity = null
  state.authenticated = false
}
function sync() {
  state.sessionAvailable = client.authenticated
  if (!state.sessionAvailable) clearVerifiedIdentity()
}
function accept(value: MerchantIdentityContext) {
  state.identity = value
  state.authenticated = true
  sync()
}
function failed(error: unknown) {
  clearVerifiedIdentity()
  sync()
  state.errorCode = error instanceof MerchantError ? error.code : 'OPERATION_UNAVAILABLE'
  state.error = merchantErrorMessage(error)
}

/** Restore only this application's credentials. Cache never restores a displayed role or Store. */
export function initializeMerchantContext(): void {
  if (initialized) return
  initialized = true
  try { client.restore(); sync() } catch (error) { failed(error) }
}

function loadIdentity(): Promise<void> {
  initializeMerchantContext()
  if (state.busy) return Promise.resolve()
  sync()
  if (!client.authenticated) return Promise.resolve()
  const operation = action
  const revision = client.revision
  if (readFlight?.operation === operation && readFlight.revision === revision) return readFlight.promise
  const sequence = ++readSequence
  clearVerifiedIdentity()
  state.loading = true
  state.error = ''
  state.errorCode = ''
  state.notice = ''
  // Start in a microtask so the flight exists even if an injected/platform reader throws synchronously.
  const promise: Promise<void> = Promise.resolve().then(async () => {
    try {
      const identity = await client.identity()
      if (operation === action && sequence === readSequence && revision === client.revision) accept(identity)
    } catch (error) {
      if (operation === action && sequence === readSequence
        && !(error instanceof MerchantError && error.code === 'STALE_OPERATION')) failed(error)
    } finally {
      if (operation === action && sequence === readSequence) { state.loading = false; sync() }
      if (readFlight?.promise === promise) readFlight = null
    }
  })
  readFlight = { operation, revision, promise }
  return promise
}

async function loginMerchant(): Promise<void> {
  if (state.busy) return
  const operation = ++action
  readSequence++
  readFlight = null
  clearVerifiedIdentity()
  state.loading = false
  state.busy = true
  state.activity = 'login'
  state.error = ''
  state.errorCode = ''
  state.notice = ''
  try {
    const identity = await client.login(merchantLoginCode)
    if (operation !== action) return
    accept(identity)
    state.notice = identity.identity === 'APPLICANT' ? '已核实您的个人身份，当前仅可查看本人信息。' : '已读取当前店铺身份。'
  } catch (error) {
    if (operation === action && !(error instanceof MerchantError && error.code === 'STALE_OPERATION')) failed(error)
  } finally {
    if (operation === action) { state.busy = false; state.activity = ''; sync() }
  }
}

async function logout(): Promise<void> {
  // Logout can invalidate an in-flight login/read. Its older response cannot restore a role.
  const operation = ++action
  readSequence++
  readFlight = null
  clearVerifiedIdentity()
  state.loading = false
  state.busy = true
  state.activity = 'logout'
  state.error = ''
  state.errorCode = ''
  state.notice = ''
  try {
    const outcome = await client.logout()
    if (operation === action) state.notice = outcome.confirmed
      ? '已退出本设备商户登录。'
      : '本设备商户登录信息已清除，服务端退出结果尚未确认。'
  } catch (error) { if (operation === action) failed(error) }
  finally {
    if (operation === action) { state.busy = false; state.activity = ''; sync() }
  }
}

// P05 has identity reads only. Owner identity does not authorize Stage 1–5 demo operations.
const permissions = readonly(ref<MerchantCooperationPermissions>({
  canView: false, canCreate: false, canEdit: false, canDisable: false, canTransferOwner: false,
}))
const currentOperatorApplication = computed<MerchantOperatorApplicationContext | null>(() => null)
const currentOperator = computed<MerchantOperator | null>(() => null)
const currentStore = readonly(computed<MerchantStore | null>(() => state.identity?.identity === 'STORE'
  ? { id: state.identity.storeId, name: state.identity.storeName } : null))
const currentMerchantStaff = readonly(computed<MerchantStaff | null>(() => state.identity?.identity === 'STORE'
  ? { id: state.identity.clerkId, name: state.identity.role === 'OWNER' ? '负责人' : '工作人员', role: state.identity.role } : null))

export const refreshMerchantContext = loadIdentity
// Business adapters reuse this client. No token or mutable role/Store is exported.
export const merchantSessionRevision = () => client.revision
// Non-secret journal partition; authorization remains entirely server side.
export const merchantOperationOwner = () => { initializeMerchantContext(); return client.memberId ? client.domain+':'+client.memberId : null }
export async function merchantBusinessRequest(path: string, method: 'GET'|'POST'|'PUT', body?: unknown) {
  initializeMerchantContext()
  try { return await client.business(path, method, body) }
  catch (error) { if (error instanceof MerchantError && ['SESSION_REJECTED','SESSION_REQUIRED','STORAGE_UNAVAILABLE'].includes(error.code)) failed(error); throw error }
}
export async function merchantStage3Request(path: string, method: 'GET'|'POST', body?: unknown) {
  initializeMerchantContext()
  try { return await client.stage3Business(path, method, body) }
  catch (error) { if (error instanceof MerchantError && ['SESSION_REJECTED','SESSION_REQUIRED','STORAGE_UNAVAILABLE'].includes(error.code)) failed(error); throw error }
}
export async function merchantStage45Upload(path:string,metadata:string,filePath:string){initializeMerchantContext();return client.stage45Upload(path,metadata,filePath)}
export async function merchantStage45Asset(path:string){initializeMerchantContext();const r=await client.stage45Asset(path);if(r.status!==200)throw new MerchantError('OPERATION_UNAVAILABLE');return (r.data as {localPath:string}).localPath}
export async function merchantBusinessUpload(filePath: string, metadata: string) {
  initializeMerchantContext()
  try { return await client.uploadBusiness(filePath, metadata) }
  catch (error) { if (error instanceof MerchantError && ['SESSION_REJECTED','SESSION_REQUIRED','STORAGE_UNAVAILABLE'].includes(error.code)) failed(error); throw error }
}
export async function merchantBusinessPreview(fileId: string, goodsId?: string) {
  initializeMerchantContext()
  try { return await client.previewBusiness(fileId, goodsId) }
  catch (error) { if (error instanceof MerchantError && ['SESSION_REJECTED','SESSION_REQUIRED','STORAGE_UNAVAILABLE'].includes(error.code)) failed(error); throw error }
}
export function useMerchantContext() {
  initializeMerchantContext()
  return {
    state: readonly(state), isWechat, loginMerchant, loadIdentity, logout,
    currentOperatorApplication, currentOperator, currentStore, currentMerchantStaff, permissions,
  }
}
