// Resident-only protocol adapter. Authorization always remains with Backend.
export const RESIDENT_SESSION_KEY = 'daguanglu:resident:session:v1'
export interface ResidentProfile {
  memberId: string
  nickname: string | null
  avatar: string | null
  maskedMobile: string | null
  phoneBound: boolean
  version: number
  updatedAt: number | null
}
export interface ResidentTokens {
  sid: string
  accessToken: string
  refreshToken: string
  accessExpiresAt: number
  absoluteExpiresAt: number
}
export interface ResidentEdit { version: number; nickname?: string; avatarFileId?: string }
export interface ResidentImage { filePath: string; size: number; type: string }
export interface ResidentResponse { status: number; data: unknown }
export type ResidentMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
export interface ResidentPorts {
  baseUrl: string
  localTestLoginEnabled?: boolean
  storageKey?: string
  now?: () => number
  storage: { get(key: string): unknown; set(key: string, value: unknown): void; remove(key: string): void }
  request(input: { path: string; method: ResidentMethod; body?: unknown; accessToken?: string; headers?: Record<string,string> }): Promise<ResidentResponse>
  download?(input: { path: string; accessToken: string }): Promise<{ status: number; filePath: string }>
  upload?(input: { filePath: string; accessToken: string }): Promise<ResidentResponse>
  businessUpload?(input:{path:string;filePath:string;metadata:string;accessToken:string}):Promise<ResidentResponse>
}
const messages: Record<string, string> = {
  UAT_LOGIN_DENIED: '本机测试登录未通过，请核对账号、密码和验证码。',
  UAT_LOGIN_DISABLED: '当前环境未开启本机测试登录。',
  API_NOT_CONFIGURED: '登录服务尚未配置，请等待服务开通。',
  WECHAT_UNAVAILABLE: '请在微信小程序中使用微信登录和手机号授权。',
  WECHAT_REJECTED: '微信登录未完成，请重新登录。',
  WECHAT_CANCELLED: '尚未完成微信登录，请重试。',
  SESSION_REQUIRED: '请先使用微信登录。',
  SESSION_REJECTED: '登录已失效，请重新使用微信登录。',
  IDENTITY_UNAVAILABLE: '当前账号暂不可用，请联系服务人员。',
  IDENTITY_CONFLICT: '当前微信身份暂时无法登录，请联系服务人员。',
  PROFILE_CONFLICT: '资料已更新，已尝试读取最新资料；请确认后再修改。',
  REQUEST_CONFLICT: '本次请求状态已变化，请读取最新资料后重试。',
  LINK_REQUIRED: '该手机号需要先核验已有账号归属，当前账号保持不变。',
  HISTORY_CONFLICT: '账号已有独立使用记录，暂不能自动关联，请联系服务人员。',
  B04_PENDING: '身份资料服务尚未开放，请稍后重试。',
  PHONE_PENDING: '微信手机号能力尚未开放，您仍可使用基本登录。',
  STORAGE_PENDING: '头像上传暂不可用，原头像保持不变。',
  PROOF_SOURCE_PENDING: '已有账号归属核验尚未开放，当前账号保持不变。',
  PROOF_REJECTED: '未能确认旧账号归属，当前账号保持不变。',
  HISTORY_PENDING: '账号关联检查暂不可用，当前账号保持不变。',
  LINK_PENDING: '账号关联仍待安全确认，请重新微信登录；不要重复提交关联。',
  OPERATION_UNAVAILABLE: '服务暂不可用，请稍后重试。',
  CONTENT_POLICY_PENDING: '昵称审核服务暂不可用，原资料保持不变。',
  NICKNAME_REJECTED: '昵称不符合要求，请使用 1—32 个字的文字、数字或常用分隔符。',
  AVATAR_REJECTED: '请选择不超过 2 MiB 的 JPEG 或 PNG 图片。',
  PHONE_REJECTED: '手机号授权未完成或已失效，请重新点击授权。',
  PHONE_NOT_SUPPORTED: '请使用微信手机号授权按钮，不能手动提交号码。',
  INVALID_REQUEST: '提交内容不符合要求，请检查后重试。',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试。',
  WRITE_RESULT_UNKNOWN: '未能确认保存结果，请先重新读取本人资料，再决定是否重试。',
  INVALID_RESPONSE: '服务返回异常，请稍后重试。',
  STORAGE_UNAVAILABLE: '无法安全保存登录状态，请检查本机存储后重新登录。',
  STALE_OPERATION: '登录状态已变化，请使用当前账号继续。',
  IMAGE_CANCELLED: '已取消选择头像，原头像保持不变。',
}
export class ResidentError extends Error {
  constructor(public readonly code: string, public readonly status = 0) {
    super(messages[code] || messages.OPERATION_UNAVAILABLE)
    this.name = 'ResidentError'
  }
}
export function residentErrorMessage(error: unknown): string {
  return error instanceof ResidentError ? error.message : messages.OPERATION_UNAVAILABLE
}
const object = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ResidentError('INVALID_RESPONSE')
  return value as Record<string, any>
}
const id = (value: unknown): value is string => typeof value === 'string' && /^[0-9]{1,19}$/.test(value)
const codeValid = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,512}$/.test(value)
const versionValid = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0
const jwt = (value: unknown): value is string => typeof value === 'string' && value.length < 16384 && /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
function tokens(value: unknown, now: number): ResidentTokens {
  const data = object(value)
  if (typeof data.sid !== 'string' || !/^[a-f0-9]{32}$/.test(data.sid) || !jwt(data.accessToken) || !jwt(data.refreshToken)
    || data.accessToken === data.refreshToken || !Number.isSafeInteger(data.accessExpiresAt)
    || !Number.isSafeInteger(data.absoluteExpiresAt) || data.accessExpiresAt <= 0
    || data.absoluteExpiresAt <= now || data.accessExpiresAt > data.absoluteExpiresAt) throw new ResidentError('SESSION_REJECTED')
  return { sid: data.sid, accessToken: data.accessToken, refreshToken: data.refreshToken,
    accessExpiresAt: data.accessExpiresAt, absoluteExpiresAt: data.absoluteExpiresAt }
}
function profileValue(value: unknown, memberId: string | null): ResidentProfile {
  const data = object(value)
  if (!id(data.memberId) || (memberId !== null && data.memberId !== memberId)
    || typeof data.phoneBound !== 'boolean' || !versionValid(data.version)) throw new ResidentError('INVALID_RESPONSE')
  const optional = (name: string): string | null => {
    if (data[name] == null) return null
    if (typeof data[name] !== 'string') throw new ResidentError('INVALID_RESPONSE')
    return data[name]
  }
  const maskedMobile = optional('maskedMobile')
  if (data.phoneBound && (!maskedMobile || !/^(?:(?:\d{3}|\+\d{2})\*{4}\d{4}|\*{4})$/.test(maskedMobile))) throw new ResidentError('INVALID_RESPONSE')
  const avatar = optional('avatar')
  if (avatar && !/^https:\/\/[^\s@]+$/i.test(avatar)) throw new ResidentError('INVALID_RESPONSE')
  if (data.updatedAt != null && !Number.isSafeInteger(data.updatedAt)) throw new ResidentError('INVALID_RESPONSE')
  // Explicit projection never retains passwords, complete phone numbers or internal fields.
  return { memberId: data.memberId, nickname: optional('nickname'), avatar, maskedMobile: data.phoneBound ? maskedMobile : null,
    phoneBound: data.phoneBound, version: data.version, updatedAt: data.updatedAt ?? null }
}
function result(response: ResidentResponse): unknown {
  const data = object(response.data)
  if (response.status === 200 && data.success === true && data.code === 200) return data.result
  const code = typeof data.message === 'string' && Object.prototype.hasOwnProperty.call(messages, data.message) ? data.message : 'OPERATION_UNAVAILABLE'
  throw new ResidentError(code, response.status)
}

export class ResidentSessionClient {
  private session: ResidentTokens | null = null
  private subject: string | null = null
  private epoch = 0
  private refreshFlight: Promise<void> | null = null
  private readonly now: () => number
  private readonly storageKey: string
  constructor(private readonly ports: ResidentPorts) { this.now = ports.now || Date.now; this.storageKey = ports.storageKey || RESIDENT_SESSION_KEY }
  get authenticated(): boolean { return this.session !== null }
  get memberId(): string | null { return this.subject }
  get revision(): number { return this.epoch }
  private configured(): void {
    // No fallback host, proxy, mock login or client-selected AppID.
    if (!/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~-]+)*$/.test(this.ports.baseUrl)) throw new ResidentError('API_NOT_CONFIGURED')
  }
  private current(epoch: number): void { if (epoch !== this.epoch) throw new ResidentError('STALE_OPERATION') }
  private clear(): void {
    this.epoch++
    this.session = null
    this.subject = null
    this.refreshFlight = null
    try { this.ports.storage.remove(this.storageKey) } catch { throw new ResidentError('STORAGE_UNAVAILABLE') }
  }
  private persist(): void {
    try {
      this.ports.storage.set(this.storageKey, { apiBaseUrl: this.ports.baseUrl, identity: 'RESIDENT', memberId: this.subject, session: this.session })
    } catch {
      this.clear()
      throw new ResidentError('STORAGE_UNAVAILABLE')
    }
  }
  restore(): void {
    if (this.session) return
    try {
      this.configured()
      const saved = this.ports.storage.get(this.storageKey)
      if (!saved) return
      const data = object(saved)
      if (data.apiBaseUrl !== this.ports.baseUrl || data.identity !== 'RESIDENT' || !id(data.memberId)) throw new ResidentError('SESSION_REJECTED')
      this.session = tokens(data.session, this.now())
      this.subject = data.memberId
    } catch { this.clear() }
  }
  private async request(path: string, method: ResidentMethod, body?: unknown, accessToken?: string): Promise<ResidentResponse> {
    this.configured()
    try { return await this.ports.request({ path, method, body, accessToken }) }
    catch { throw new ResidentError(method === 'GET' ? 'NETWORK_ERROR' : 'WRITE_RESULT_UNKNOWN') }
  }
  async login(getCode: () => Promise<string>): Promise<ResidentProfile> {
    this.configured()
    this.clear()
    const epoch = this.epoch
    const loginCode = await getCode()
    this.current(epoch)
    if (!codeValid(loginCode)) throw new ResidentError('WECHAT_REJECTED')
    const response = await this.request('/buyer/passport/connect/miniProgram/login', 'POST', { loginCode })
    this.current(epoch)
    return await this.acceptLogin(response, epoch)
  }
  private async acceptLogin(response:ResidentResponse, epoch:number): Promise<ResidentProfile> {
    this.current(epoch)
    const data = object(result(response))
    if (data.identity !== 'RESIDENT' || !id(data.memberId)) throw new ResidentError('IDENTITY_UNAVAILABLE')
    this.session = tokens(data.session, this.now())
    this.subject = data.memberId
    this.persist()
    return this.profile()
  }
  async localLogin(input: {username:string;password:string;uuid:string}): Promise<ResidentProfile> {
    this.clear()
    const epoch = this.epoch
    try {
      if (this.ports.localTestLoginEnabled !== true || this.ports.baseUrl !== 'https://127.0.0.1:19794/api') throw new ResidentError('UAT_LOGIN_DISABLED')
      if (!/^[A-Za-z0-9_-]{3,64}$/.test(input.username) || input.password.length < 8 || input.password.length > 128 || !/^[A-Za-z0-9-]{16,64}$/.test(input.uuid)) throw new ResidentError('INVALID_REQUEST')
      const response = await this.ports.request({path:'/buyer/passport/uat/login',method:'POST',body:{username:input.username,password:input.password},headers:{'Content-Type':'application/x-www-form-urlencoded',uuid:input.uuid}})
      this.current(epoch)
      if (object(result(response)).source !== 'UAT_SYNTHETIC') throw new ResidentError('INVALID_RESPONSE')
      return await this.acceptLogin(response, epoch)
    } catch (error) {
      this.current(epoch)
      this.clear()
      throw error instanceof ResidentError ? error : new ResidentError('UAT_LOGIN_DENIED')
    }
  }
  private async refresh(epoch: number): Promise<void> {
    this.current(epoch)
    if (this.refreshFlight) return this.refreshFlight
    const session = this.session
    if (!session || session.absoluteExpiresAt <= this.now()) { this.clear(); throw new ResidentError('SESSION_REJECTED') }
    const operation = (async () => {
      try {
        const response = await this.request('/buyer/passport/member/refresh', 'POST', { refreshToken: session.refreshToken })
        this.current(epoch)
        const renewed = tokens(result(response), this.now())
        if (renewed.sid !== session.sid || renewed.absoluteExpiresAt !== session.absoluteExpiresAt
          || renewed.accessToken === session.accessToken || renewed.refreshToken === session.refreshToken
          || renewed.accessExpiresAt <= this.now()) throw new ResidentError('SESSION_REJECTED')
        this.session = renewed
        this.persist()
      } catch (error) {
        if (this.epoch !== epoch) throw new ResidentError('STALE_OPERATION')
        this.clear()
        // Lost Refresh response cannot safely be replayed; recover with a fresh WeChat login.
        throw error instanceof ResidentError && error.code === 'API_NOT_CONFIGURED' ? error : new ResidentError('SESSION_REJECTED')
      }
    })()
    this.refreshFlight = operation
    try { await operation } finally { if (this.refreshFlight === operation) this.refreshFlight = null }
  }
  private async access(epoch: number): Promise<string> {
    this.current(epoch)
    if (!this.session) throw new ResidentError('SESSION_REQUIRED')
    if (this.refreshFlight || this.session.accessExpiresAt <= this.now() + 5000) await this.refresh(epoch)
    this.current(epoch)
    if (!this.session || this.session.absoluteExpiresAt <= this.now()) { this.clear(); throw new ResidentError('SESSION_REJECTED') }
    return this.session.accessToken
  }
  private async authorizedResponse(path: string, method: ResidentMethod, body?: unknown): Promise<ResidentResponse> {
    const epoch = this.epoch
    const originalAccess = this.session?.accessToken
    const accessToken = await this.access(epoch)
    let response = await this.request(path, method, body, accessToken)
    this.current(epoch)
    const errorBody = response.data as Record<string, unknown> | null
    if (method === 'GET' && originalAccess === accessToken && response.status === 403 && errorBody?.message === 'SESSION_REJECTED') {
      if (this.session?.accessToken === accessToken) await this.refresh(epoch)
      const freshAccess = await this.access(epoch)
      response = await this.request(path, method, body, freshAccess)
      this.current(epoch)
    }
    try { result(response) } catch (error) {
      if (error instanceof ResidentError && response.status === 403 && ['SESSION_REJECTED', 'SESSION_REQUIRED', 'IDENTITY_UNAVAILABLE'].includes(error.code)) this.clear()
    }
    return response
  }
  private async authorized(path: string, method: ResidentMethod, body?: unknown): Promise<unknown> {
    return result(await this.authorizedResponse(path, method, body))
  }
  /** Fixed-origin business transport. Credentials remain private to the existing Session client. */
  async asset(path: string): Promise<string> {
    if (!/^(?:\/buyer\/p0\/s2\/goods\/[1-9]\d{0,18}\/images\/[1-9]\d{0,18}|\/buyer\/p0\/s45\/(?:attachments\/[1-9]\d{0,18}|orders\/[1-9]\d{0,18}\/items\/[1-9]\d{0,18}\/image))$/.test(path) || !this.ports.download) throw new ResidentError('ASSET_UNAVAILABLE')
    const epoch = this.epoch, member = this.subject, accessToken = await this.access(epoch)
    const result = await this.ports.download({ path, accessToken })
    this.current(epoch)
    if (member !== this.subject || result.status !== 200 || !result.filePath) throw new ResidentError('ASSET_UNAVAILABLE')
    return result.filePath
  }
  async business(path: string, method: ResidentMethod, body?: unknown): Promise<ResidentResponse> {
    if (!/^\/buyer\/p0\/(?:s2|s3|s45)\/[A-Za-z0-9_/-]+$/.test(path) || path.includes('..') || path.includes('//')) throw new ResidentError('INVALID_REQUEST')
    const epoch = this.epoch
    const member = this.subject
    const response = await this.authorizedResponse(path, method, body)
    this.current(epoch)
    if (member !== this.subject || !this.subject) throw new ResidentError('STALE_OPERATION')
    return response
  }
  async uploadBusiness(path:string,metadata:string,filePath:string):Promise<ResidentResponse>{
    if(path!=='/buyer/p0/s45/attachments'||!this.ports.businessUpload)throw new ResidentError('INVALID_REQUEST')
    const epoch=this.epoch,member=this.subject,accessToken=await this.access(epoch)
    const result=await this.ports.businessUpload({path,metadata,filePath,accessToken});this.current(epoch)
    if(member!==this.subject||!this.subject)throw new ResidentError('STALE_OPERATION')
    return result
  }
  async profile(): Promise<ResidentProfile> {
    const epoch = this.epoch
    const subject = this.subject
    const value = await this.authorized('/buyer/passport/member', 'GET')
    this.current(epoch)
    return profileValue(value, subject)
  }
  async edit(input: ResidentEdit): Promise<ResidentProfile> {
    if (!versionValid(input.version) || (input.nickname === undefined && input.avatarFileId === undefined)) throw new ResidentError('INVALID_REQUEST')
    const body: ResidentEdit = { version: input.version }
    if (input.nickname !== undefined) {
      const nickname = input.nickname.normalize('NFKC').trim()
      if (Array.from(nickname).length < 1 || Array.from(nickname).length > 32 || !/^[\p{L}\p{N} _·.\-]+$/u.test(nickname)) throw new ResidentError('NICKNAME_REJECTED')
      body.nickname = nickname
    }
    if (input.avatarFileId !== undefined) {
      if (!id(input.avatarFileId)) throw new ResidentError('AVATAR_REJECTED')
      body.avatarFileId = input.avatarFileId
    }
    const epoch = this.epoch
    const subject = this.subject
    const value = await this.authorized('/buyer/passport/member/editOwn', 'PUT', body)
    this.current(epoch)
    return profileValue(value, subject)
  }
  async phone(input: { phoneCode: string; requestId: string; version: number }): Promise<ResidentProfile> {
    if (!codeValid(input.phoneCode) || !/^[A-Za-z0-9_-]{16,64}$/.test(input.requestId) || !versionValid(input.version)) throw new ResidentError('PHONE_REJECTED')
    const epoch = this.epoch
    const subject = this.subject
    const value = await this.authorized('/buyer/passport/member/wechat-phone', 'POST',
      { phoneCode: input.phoneCode, requestId: input.requestId, version: input.version })
    this.current(epoch)
    return profileValue(value, subject)
  }
  async uploadAvatar(image: ResidentImage): Promise<{ fileId: string; url: string }> {
    if (!image.filePath || !Number.isFinite(image.size) || image.size <= 0 || image.size > 2 * 1024 * 1024 || !['jpeg', 'png'].includes(image.type)) throw new ResidentError('AVATAR_REJECTED')
    if (!this.ports.upload) throw new ResidentError('STORAGE_PENDING')
    const epoch = this.epoch
    const accessToken = await this.access(epoch)
    let response: ResidentResponse
    try { response = await this.ports.upload({ filePath: image.filePath, accessToken }) }
    catch { throw new ResidentError('WRITE_RESULT_UNKNOWN') }
    this.current(epoch)
    let data: Record<string, any>
    try { data = object(result(response)) } catch (error) {
      if (error instanceof ResidentError && response.status === 403
        && ['SESSION_REJECTED', 'SESSION_REQUIRED', 'IDENTITY_UNAVAILABLE'].includes(error.code)) this.clear()
      throw error
    }
    if (!id(data.fileId) || typeof data.url !== 'string' || !/^https:\/\/[^\s@]+$/i.test(data.url)) throw new ResidentError('INVALID_RESPONSE')
    return { fileId: data.fileId, url: data.url }
  }
  async logout(): Promise<{ confirmed: boolean }> {
    const session = this.session
    this.clear()
    if (!session) return { confirmed: true }
    try { result(await this.request('/buyer/passport/member/logout', 'POST', undefined, session.accessToken)); return { confirmed: true } }
    catch { return { confirmed: false } }
  }
  // Only consume a trusted future link endpoint response; no UI accepts proof or Member IDs.
  // P04 does not call link-existing while its production proof source is unavailable.
  async acceptLinkResponse(value: unknown, expectedRevision: number): Promise<ResidentProfile | null> {
    this.current(expectedRevision)
    if (!this.session) throw new ResidentError('SESSION_REQUIRED')
    const data = object(value)
    if (data.nextAction === 'WECHAT_RELOGIN') { this.clear(); return null }
    if (data.nextAction !== 'REPLACE_SESSION' || data.state !== 'DONE') throw new ResidentError('LINK_PENDING')
    const replacement = tokens(data.session, this.now())
    this.clear()
    const epoch = this.epoch
    this.session = replacement
    // Member identity is obtained from the authenticated endpoint, never from a client field.
    try {
      const profile = await this.profile()
      this.current(epoch)
      this.subject = profile.memberId
      this.persist()
      return profile
    } catch (error) { if (this.epoch === epoch) this.clear(); throw error }
  }
}
