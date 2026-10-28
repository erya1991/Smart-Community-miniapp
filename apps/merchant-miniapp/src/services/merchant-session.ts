// Merchant-only Session authority. Stage1 callers use constrained paths and never receive raw credentials.
export const MERCHANT_SESSION_KEY = 'daguanglu:merchant:session:v1'
export type MerchantDomain = 'APPLICANT' | 'STORE'
export type MerchantRole = 'OWNER' | 'STAFF'
export type MerchantIdentityContext = {
  memberId: string; identity: 'APPLICANT'; access: 'RESTRICTED'; nextAction: 'SHOW_APPLICATION_ENTRY'
} | {
  memberId: string; identity: 'STORE'; role: MerchantRole; storeId: string; storeName: string; clerkId: string
}
export interface MerchantTokens {
  sid: string; accessToken: string; refreshToken: string; accessExpiresAt: number; absoluteExpiresAt: number
}
export interface MerchantResponse { status: number; data: unknown }
export interface MerchantPorts {
  baseUrl: string
  now?: () => number
  storage: { get(key: string): unknown; set(key: string, value: unknown): void; remove(key: string): void }
  request(input: { path: string; method: 'GET' | 'POST' | 'PUT'; body?: unknown; accessToken?: string }): Promise<MerchantResponse>
  upload?(input: { path: string; filePath: string; metadata: string; accessToken: string }): Promise<MerchantResponse>
  download?(input: { path: string; accessToken: string }): Promise<MerchantResponse>
}
const messages: Record<string, string> = {
  API_NOT_CONFIGURED: '商户登录服务尚未配置，请等待服务开通。',
  CONFIG_REQUIRED: '商户微信登录尚未开放，请稍后重试。',
  B04_PENDING: '商户身份资料服务尚未开放，请稍后重试。',
  DATA_UNAVAILABLE: '暂时无法核对商户身份，请稍后重试。',
  PROOF_SOURCE_PENDING: '原账号归属核验尚未开放，暂不能使用店铺身份。',
  RELATION_CONFLICT: '当前人员与店铺关系需要核对，请联系服务人员。',
  IDENTITY_CONFLICT: '返回的商户身份不一致，请重新登录或联系服务人员。',
  DENIED: '当前身份或店铺授权不可用，请重新核对身份。',
  SESSION_REQUIRED: '请先使用商户微信登录。',
  SESSION_REJECTED: '商户登录已失效，请重新使用微信登录。',
  SESSION_UNAVAILABLE: '暂时无法建立商户会话，请稍后重试。',
  WECHAT_REJECTED: '微信登录未完成或凭证已失效，请重新登录。',
  WECHAT_UNAVAILABLE: '请在商户微信小程序中使用微信登录。',
  WECHAT_CANCELLED: '尚未完成微信登录，请重试。',
  LOGIN_UNAVAILABLE: '商户登录暂不可用，请稍后重试。',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试。',
  INVALID_REQUEST: '登录请求不符合要求，请重试。',
  INVALID_RESPONSE: '商户身份服务返回异常，请稍后重试。',
  STORAGE_UNAVAILABLE: '无法安全保存本机登录状态，请检查存储后重试。',
  STALE_OPERATION: '登录状态已变化，请使用当前账号继续。',
  OPERATION_UNAVAILABLE: '商户服务暂不可用，请稍后重试。',
}
export class MerchantError extends Error {
  constructor(public readonly code: string, public readonly status = 0) {
    super(messages[code] || messages.OPERATION_UNAVAILABLE)
    this.name = 'MerchantError'
  }
}
export function merchantErrorMessage(error: unknown): string {
  return error instanceof MerchantError ? error.message : messages.OPERATION_UNAVAILABLE
}
const object = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MerchantError('INVALID_RESPONSE')
  return value as Record<string, any>
}
const id = (value: unknown): value is string => typeof value === 'string' && /^[0-9]{1,19}$/.test(value)
const role = (value: unknown): value is MerchantRole => value === 'OWNER' || value === 'STAFF'
const domain = (value: unknown): value is MerchantDomain => value === 'APPLICANT' || value === 'STORE'
function tokens(value: unknown, identity: MerchantDomain, now: number): MerchantTokens {
  const data = object(value)
  if (typeof data.sid !== 'string' || !/^[a-f0-9]{32}$/.test(data.sid)
    || !Number.isSafeInteger(data.accessExpiresAt) || !Number.isSafeInteger(data.absoluteExpiresAt)
    || data.accessExpiresAt <= 0 || data.absoluteExpiresAt <= now || data.accessExpiresAt > data.absoluteExpiresAt) {
    throw new MerchantError('SESSION_REJECTED')
  }
  const credential = (value: unknown, use: 'ACCESS' | 'REFRESH'): value is string => {
    if (typeof value !== 'string' || value.length > 8192) return false
    if (identity === 'APPLICANT') return new RegExp(`^s0o1\\.${data.sid}\\.${use}\\.[A-Za-z0-9_-]{43}$`).test(value)
    // Format only; this is never a client-side signature or role authorization check.
    return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  }
  if (!credential(data.accessToken, 'ACCESS') || !credential(data.refreshToken, 'REFRESH')
    || data.accessToken === data.refreshToken) throw new MerchantError('SESSION_REJECTED')
  return { sid: data.sid, accessToken: data.accessToken, refreshToken: data.refreshToken,
    accessExpiresAt: data.accessExpiresAt, absoluteExpiresAt: data.absoluteExpiresAt }
}
function result(response: MerchantResponse): unknown {
  const body = object(response.data)
  if (response.status === 200 && body.success === true && body.code === 200) return body.result
  const code = typeof body.message === 'string' && Object.prototype.hasOwnProperty.call(messages, body.message)
    ? body.message : 'OPERATION_UNAVAILABLE'
  throw new MerchantError(code, response.status)
}
const base = (identity: MerchantDomain) => identity === 'APPLICANT' ? '/store/passport/applicant' : '/store/passport/login'

export class MerchantSessionClient {
  private session: MerchantTokens | null = null
  private subject: string | null = null
  private identityDomain: MerchantDomain | null = null
  private confirmedRole: MerchantRole | null = null
  private epoch = 0
  private readSequence = 0
  private refreshFlight: Promise<void> | null = null
  private readonly invalidations = new WeakSet<MerchantError>()
  private readonly now: () => number
  constructor(private readonly ports: MerchantPorts) { this.now = ports.now || Date.now }
  get authenticated(): boolean { return this.session !== null }
  get revision(): number { return this.epoch }
  get memberId(): string | null { return this.subject }
  get domain(): MerchantDomain | null { return this.identityDomain }
  private configured(): void {
    if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~-]+)*$/.test(this.ports.baseUrl)) {
      throw new MerchantError('API_NOT_CONFIGURED')
    }
  }
  private current(epoch: number): void { if (epoch !== this.epoch) throw new MerchantError('STALE_OPERATION') }
  private clear(): void {
    this.epoch++; this.readSequence++
    this.session = null; this.subject = null; this.identityDomain = null; this.confirmedRole = null; this.refreshFlight = null
    try { this.ports.storage.remove(MERCHANT_SESSION_KEY) } catch { throw new MerchantError('STORAGE_UNAVAILABLE') }
  }
  private failClosed(error: MerchantError): never {
    try { this.clear() } catch { error = new MerchantError('STORAGE_UNAVAILABLE') }
    this.invalidations.add(error)
    throw error
  }
  private persist(): void {
    try {
      this.ports.storage.set(MERCHANT_SESSION_KEY, { apiBaseUrl: this.ports.baseUrl, identity: this.identityDomain,
        memberId: this.subject, role: this.confirmedRole, session: this.session })
    } catch { this.failClosed(new MerchantError('STORAGE_UNAVAILABLE')) }
  }
  restore(): void {
    if (this.session) return
    try {
      this.configured()
      const saved = this.ports.storage.get(MERCHANT_SESSION_KEY)
      if (!saved) return
      const data = object(saved)
      if (data.apiBaseUrl !== this.ports.baseUrl || !domain(data.identity) || !id(data.memberId)) throw new MerchantError('SESSION_REJECTED')
      this.session = tokens(data.session, data.identity, this.now())
      this.subject = data.memberId; this.identityDomain = data.identity
      // Saved role/Store/Clerk data is untrusted. No context is returned or displayed before HTTP reads.
      this.confirmedRole = null
    } catch (error) { this.failClosed(error instanceof MerchantError ? error : new MerchantError('STORAGE_UNAVAILABLE')) }
  }
  private async request(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown, accessToken?: string): Promise<MerchantResponse> {
    this.configured()
    try { return await this.ports.request({ path, method, body, accessToken }) }
    catch { throw new MerchantError('NETWORK_ERROR') }
  }
  async login(getCode: () => Promise<string>): Promise<MerchantIdentityContext> {
    this.clear() // A failed new login must never restore the previous Store, even when configuration is missing.
    const epoch = this.epoch
    try {
      this.configured()
      const loginCode = await getCode()
      this.current(epoch)
      if (typeof loginCode !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(loginCode)) throw new MerchantError('WECHAT_REJECTED')
      const response = await this.request('/store/passport/wechat/login', 'POST', { loginCode })
      this.current(epoch)
      const data = object(result(response))
      if (!id(data.memberId) || !domain(data.identity) || (data.identity === 'STORE' ? !role(data.role) : data.role != null)) {
        throw new MerchantError('INVALID_RESPONSE')
      }
      const initialRole = data.identity === 'STORE' ? data.role as MerchantRole : undefined
      this.session = tokens(data.session, data.identity, this.now()); this.subject = data.memberId; this.identityDomain = data.identity
      this.confirmedRole = null; this.persist()
      const context = await this.identity()
      this.current(epoch)
      if (context.identity === 'STORE' && initialRole !== context.role) throw new MerchantError('IDENTITY_CONFLICT')
      return context
    } catch (error) {
      if (error instanceof MerchantError && this.invalidations.has(error)) throw error
      this.current(epoch)
      this.failClosed(error instanceof MerchantError ? error : new MerchantError('LOGIN_UNAVAILABLE'))
    }
  }
  private async refresh(epoch: number): Promise<void> {
    this.current(epoch)
    if (this.refreshFlight) return this.refreshFlight
    const before = this.session; const identity = this.identityDomain
    if (!before || !identity || before.absoluteExpiresAt <= this.now()) this.failClosed(new MerchantError('SESSION_REJECTED'))
    const flight = (async () => {
      try {
        const response = await this.request(base(identity) + '/refresh', 'POST', { refreshToken: before.refreshToken })
        this.current(epoch)
        const renewed = tokens(result(response), identity, this.now())
        if (renewed.sid !== before.sid || renewed.absoluteExpiresAt !== before.absoluteExpiresAt
          || renewed.accessExpiresAt <= this.now() || renewed.accessToken === before.accessToken || renewed.refreshToken === before.refreshToken) {
          throw new MerchantError('SESSION_REJECTED')
        }
        this.session = renewed; this.persist()
      } catch (error) {
        if (error instanceof MerchantError && this.invalidations.has(error)) throw error
        this.current(epoch)
        // Lost Refresh responses require a fresh Code login; never replay the consumed Refresh.
        this.failClosed(new MerchantError('SESSION_REJECTED'))
      }
    })()
    this.refreshFlight = flight
    try { await flight } finally { if (this.refreshFlight === flight) this.refreshFlight = null }
  }
  private async access(epoch: number): Promise<string> {
    this.current(epoch)
    if (!this.session) throw new MerchantError('SESSION_REQUIRED')
    if (this.refreshFlight || this.session.accessExpiresAt <= this.now() + 5000) await this.refresh(epoch)
    this.current(epoch)
    if (!this.session || this.session.absoluteExpiresAt <= this.now()) this.failClosed(new MerchantError('SESSION_REJECTED'))
    return this.session.accessToken
  }
  private async read(path: string, accessToken: string, epoch: number): Promise<unknown> {
    const response = await this.request(path, 'GET', undefined, accessToken)
    this.current(epoch)
    if (this.session?.accessToken !== accessToken) throw new MerchantError('ACCESS_CHANGED')
    return result(response)
  }
  async identity(): Promise<MerchantIdentityContext> {
    const epoch = this.epoch; const sequence = ++this.readSequence
    const originalAccess = this.session?.accessToken
    for (let attempt = 0; attempt < 2; attempt++) {
      let usedAccess: string | null = null
      try {
        const accessToken = await this.access(epoch)
        usedAccess = accessToken
        const identity = this.identityDomain; const memberId = this.subject
        let context: MerchantIdentityContext
        if (identity === 'APPLICANT') {
          const personal = object(await this.read('/store/passport/applicant/identity', accessToken, epoch))
          if (personal.identity !== 'APPLICANT' || personal.memberId !== memberId || !id(personal.memberId)
            || personal.access !== 'RESTRICTED' || personal.nextAction !== 'SHOW_APPLICATION_ENTRY') throw new MerchantError('IDENTITY_CONFLICT')
          context = { memberId: personal.memberId, identity: 'APPLICANT', access: 'RESTRICTED', nextAction: 'SHOW_APPLICATION_ENTRY' }
        } else if (identity === 'STORE') {
          const person = object(await this.read('/store/member/user/info', accessToken, epoch))
          const store = object(await this.read('/store/member/user', accessToken, epoch))
          if (person.identity !== 'STORE' || store.identity !== 'STORE' || person.memberId !== memberId || !id(person.memberId)
            || !role(person.role) || person.role !== store.role || !id(person.clerkId) || !id(person.storeId)
            || person.storeId !== store.storeId || typeof store.storeName !== 'string' || !store.storeName.trim()
            || store.storeName.length > 200 || /[\u0000-\u001f\u007f]/.test(store.storeName)) throw new MerchantError('IDENTITY_CONFLICT')
          context = { memberId: person.memberId, identity: 'STORE', role: person.role, storeId: person.storeId,
            storeName: store.storeName, clerkId: person.clerkId }
        } else { throw new MerchantError('SESSION_REQUIRED') }
        this.current(epoch)
        if (sequence !== this.readSequence) throw new MerchantError('STALE_OPERATION')
        this.confirmedRole = context.identity === 'STORE' ? context.role : null
        this.persist()
        return context
      } catch (error) {
        if (error instanceof MerchantError && this.invalidations.has(error)) throw error
        this.current(epoch)
        if (sequence !== this.readSequence) throw new MerchantError('STALE_OPERATION')
        if (attempt === 0 && error instanceof MerchantError && this.session
          && (error.code === 'ACCESS_CHANGED' || (error.code === 'SESSION_REJECTED' && usedAccess === originalAccess))) {
          if (error.code === 'SESSION_REJECTED' && this.session.accessToken === usedAccess) await this.refresh(epoch)
          continue // Retry only these read-only identity GETs; no write request is replayed.
        }
        if (error instanceof MerchantError && ['SESSION_REJECTED', 'SESSION_REQUIRED', 'DENIED', 'IDENTITY_CONFLICT', 'INVALID_RESPONSE', 'ACCESS_CHANGED'].includes(error.code)) this.failClosed(error)
        throw error instanceof MerchantError ? error : new MerchantError('OPERATION_UNAVAILABLE')
      }
    }
    throw new MerchantError('STALE_OPERATION')
  }
  private stage1Path(path: string): string {
    if (!/^\/[A-Za-z0-9/_-]+$/.test(path) || path.includes('//') || path.includes('..')) throw new MerchantError('INVALID_REQUEST')
    if (!this.identityDomain) throw new MerchantError('SESSION_REQUIRED')
    return (this.identityDomain === 'APPLICANT' ? '/store/passport/applicant/p0/s1' : '/store/p0/s1') + path
  }
  /** GET may reread once after a changed Access; writes and uploads are never automatically replayed. */
  private async stage1Call(path: string, readOnly: boolean, send: (path: string, token: string) => Promise<MerchantResponse>): Promise<MerchantResponse> {
    const epoch = this.epoch
    const fullPath = this.stage1Path(path)
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.access(epoch)
      const response = await send(fullPath, token)
      this.current(epoch)
      const body = response.data && typeof response.data === 'object' ? response.data as Record<string, unknown> : null
      const denied = [401, 403].includes(response.status) && ['SESSION_REJECTED', 'SESSION_REQUIRED'].includes(String(body?.message))
      if (readOnly && attempt === 0 && (this.session?.accessToken !== token || denied)) {
        if (denied && this.session?.accessToken === token) await this.refresh(epoch)
        continue
      }
      if (denied && this.session?.accessToken === token) this.failClosed(new MerchantError('SESSION_REJECTED', response.status))
      return response
    }
    throw new MerchantError('STALE_OPERATION')
  }
  business(path: string, method: 'GET' | 'POST' | 'PUT', body?: unknown): Promise<MerchantResponse> {
    return this.stage1Call(path, method === 'GET', (full, token) => this.request(full, method, body, token))
  }
  uploadBusiness(filePath: string, metadata: string): Promise<MerchantResponse> {
    return this.stage1Call('/files', false, async (path, accessToken) => {
      if (!this.ports.upload) throw new MerchantError('OPERATION_UNAVAILABLE')
      return this.ports.upload({path, accessToken, filePath, metadata})
    })
  }
  previewBusiness(fileId: string, goodsId?: string): Promise<MerchantResponse> {
    if (!/^[1-9][0-9]{0,18}$/.test(fileId) || goodsId !== undefined && !/^[1-9][0-9]{0,18}$/.test(goodsId)) return Promise.reject(new MerchantError('INVALID_REQUEST'))
    return this.stage1Call(goodsId ? '/goods/' + goodsId + '/images/' + fileId : '/files/' + fileId + '/preview', true, async (path, accessToken) => {
      if (!this.ports.download) throw new MerchantError('OPERATION_UNAVAILABLE')
      return this.ports.download({path, accessToken})
    })
  }
  async logout(): Promise<{ confirmed: boolean }> {
    const session = this.session; const identity = this.identityDomain
    let storageFailure = false
    try { this.clear() } catch { storageFailure = true }
    let confirmed = !session
    if (session && identity) {
      try { result(await this.request(base(identity) + '/logout', 'POST', undefined, session.accessToken)); confirmed = true }
      catch { confirmed = false }
    }
    if (storageFailure) throw new MerchantError('STORAGE_UNAVAILABLE')
    return { confirmed }
  }
}
