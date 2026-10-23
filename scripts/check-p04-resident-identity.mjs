import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Offline only: real production client code, deterministic injected platform ports.
// No Backend, Redis, database, WeChat, storage service or device is contacted.
const root = fileURLToPath(new URL('../', import.meta.url))
const nativeRequire = createRequire(path.join(root, 'package.json'))
const ts = nativeRequire('typescript')
const { parse, compileScript } = nativeRequire('@vue/compiler-sfc')
const source = (file) => readFileSync(path.join(root, file), 'utf8')

function loadModule(file, overrides = {}, sourceOverride) {
  const filename = path.resolve(root, file)
  const module = { exports: {} }
  const code = ts.transpileModule(sourceOverride ?? source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const requireLocal = (id) => {
    if (Object.hasOwn(overrides, id)) return overrides[id]
    if (id.endsWith('.vue')) return {}
    if (id.startsWith('.')) return loadModule(path.resolve(path.dirname(filename), id) + '.ts', overrides)
    return nativeRequire(id)
  }
  // Direct platform or network access is not provided to the pure client under test.
  new Function('require', 'module', 'exports', 'uni', 'getCurrentPages', code)(
    requireLocal, module, module.exports, overrides.__uni, () => [],
  )
  return module.exports
}

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

async function settleUntil(predicate, message) {
  for (let turn = 0; turn < 100 && !predicate(); turn++) await Promise.resolve()
  assert.ok(predicate(), message)
}

const checks = []
const check = (name, fn) => checks.push({ name, fn })

const urls = {
  login: '/buyer/passport/connect/miniProgram/login',
  profile: '/buyer/passport/member',
  edit: '/buyer/passport/member/editOwn',
  phone: '/buyer/passport/member/wechat-phone',
  refresh: '/buyer/passport/member/refresh',
  logout: '/buyer/passport/member/logout',
  avatar: '/buyer/common/upload/avatar',
  link: '/buyer/passport/connect/miniProgram/link-existing',
}
const profile = (suffix = 'a', version = 0, extra = {}) => ({
  memberId: `91000000000000000${suffix.charCodeAt(0) - 96}`, nickname: `合成住户${suffix}`, avatar: '',
  maskedMobile: '', phoneBound: false, version, updatedAt: 1792785600000 + version,
  ...extra,
})
const success = (result) => ({ status: 200, data: { success: true, code: 200, message: 'SUCCESS', result, timestamp: 1792785600000 } })
const failure = (message, status = 403, extra = {}) => ({
  status, data: { success: false, code: status, message, result: null, timestamp: 1792785600000, ...extra },
})

// Page script checks execute production setup functions with an isolated reactive store;
// template assertions verify the WeChat user-gesture buttons and existing layout hooks.
function setupPage(file, overrides) {
  const { descriptor } = parse(source(file))
  const lifecycle = { shows: [], loads: [] }
  const compiled = compileScript(descriptor, { id: 'p04-offline-check' })
  const component = loadModule(file, {
    '@dcloudio/uni-app': {
      onShow: (fn) => lifecycle.shows.push(fn), onLoad: (fn) => lifecycle.loads.push(fn),
      onUnload() {}, onBackPress() {},
    },
    ...overrides,
  }, compiled.content).default
  return { page: component.setup({}, { expose() {} }), lifecycle, template: descriptor.template.content }
}

check('identity pages retain the original four resident tabs and existing business routes', () => {
  const pages = JSON.parse(source('apps/resident-miniapp/src/pages.json')).pages.map((item) => item.path)
  for (const page of ['pages/home/index', 'pages/service/index', 'pages/mall/index', 'pages/profile/index', 'pages/profile/edit', 'pages/mall/order-list/index', 'pages/member/address/index']) {
    assert.ok(pages.includes(page), `missing route: ${page}`)
  }
  const navigation = source('apps/resident-miniapp/src/config/navigation.ts')
  assert.deepEqual([...navigation.matchAll(/label:\s*'([^']+)'/g)].map((item) => item[1]), ['首页', '服务', '商城', '我的'])
})

// Client and compiled page contract checks are registered below.
const clientExports = loadModule('apps/resident-miniapp/src/services/resident-session.ts')
const { ResidentSessionClient, ResidentError, RESIDENT_SESSION_KEY, residentErrorMessage } = clientExports
const nowBaseline = 1792785600000
const apiBaseUrl = 'https://synthetic-api.invalid'
const merchantKey = 'merchant-session-protected-by-test'
const merchantValue = { marker: 'merchant-state-must-survive', cart: ['existing-mock-item'] }

function tokens(tag = 1, now = nowBaseline, expiresIn = 15 * 60 * 1000) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const sid = '1'.padStart(32, '0')
  const token = (use) => `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'daguanglu-stage0-session', sv: 1, sid, domain: 'RESIDENT', app: 'synthetic-resident', use, gen: tag, sub: profile().memberId, exp: Math.floor((now + expiresIn) / 1000) })}.${'x'.repeat(43)}`
  return { sid, accessToken: token('ACCESS'), refreshToken: token('REFRESH'), accessExpiresAt: now + expiresIn, absoluteExpiresAt: nowBaseline + 7 * 86400000 }
}

function fixture(options = {}) {
  let clock = nowBaseline
  let currentProfile = options.profile ?? profile()
  let currentTokens = options.tokens ?? tokens()
  const map = new Map([[merchantKey, structuredClone(merchantValue)]])
  const calls = []
  const uploads = []
  const changes = []
  const handlers = new Map()
  const response = async (request) => {
    calls.push(structuredClone(request))
    const handler = handlers.get(request.path)
    if (handler) return handler(request)
    if (request.path === urls.login) return success({ memberId: currentProfile.memberId, identity: 'RESIDENT', session: currentTokens })
    if (request.path === urls.profile) return success(currentProfile)
    if (request.path === urls.refresh) { currentTokens = tokens(2, clock); return success(currentTokens) }
    if (request.path === urls.logout) return success(null)
    throw new Error('UNEXPECTED_OFFLINE_REQUEST')
  }
  const storage = {
    get: (key) => map.get(key),
    set: (key, value) => { changes.push({ op: 'set', key }); map.set(key, structuredClone(value)) },
    remove: (key) => { changes.push({ op: 'remove', key }); map.delete(key) },
  }
  const client = new ResidentSessionClient({
    baseUrl: apiBaseUrl, now: () => clock, storage, request: response,
    upload: async (request) => { uploads.push(structuredClone(request)); return (handlers.get(urls.avatar) ?? (() => failure('STORAGE_PENDING', 503)))(request) },
  })
  return {
    client, map, storage, calls, uploads, changes, handlers,
    advance: (ms) => { clock += ms },
    setProfile: (value) => { currentProfile = value },
    setTokens: (value) => { currentTokens = value },
    login: () => client.login(async () => 'synthetic-login-code'),
    count: (url) => calls.filter((item) => item.path === url).length,
  }
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof ResidentError && error.code === code)
}

check('anonymous state never fabricates a member or accesses protected APIs', async () => {
  const f = fixture()
  f.client.restore()
  assert.equal(f.client.authenticated, false)
  assert.equal(f.client.memberId, null)
  await assert.rejects(f.client.profile(), ResidentError)
  await assert.rejects(f.client.edit({ version: 0, nickname: '不能写入' }), ResidentError)
  assert.equal(f.calls.length, 0)
  assert.deepEqual(f.map.get(merchantKey), merchantValue)
})

check('login uses only loginCode, stores Resident session separately and reads own profile', async () => {
  const f = fixture()
  const result = await f.login()
  assert.equal(result.memberId, profile().memberId)
  assert.equal(result.phoneBound, false)
  assert.equal(f.client.authenticated, true)
  assert.equal(f.client.memberId, profile().memberId)
  assert.equal(f.count(urls.login), 1)
  assert.deepEqual(f.calls[0].body, { loginCode: 'synthetic-login-code' })
  assert.equal(f.calls[0].method, 'POST')
  assert.equal(f.calls[1].path, urls.profile)
  assert.equal(f.calls[1].accessToken, tokens().accessToken)
  assert.equal(f.calls[1].body, undefined)
  assert.equal(f.map.get(RESIDENT_SESSION_KEY).identity, 'RESIDENT')
  assert.equal(f.map.get(RESIDENT_SESSION_KEY).apiBaseUrl, apiBaseUrl)
  assert.doesNotMatch(JSON.stringify(f.map.get(RESIDENT_SESSION_KEY)), /synthetic-login-code|session_key|AppSecret|nickname|maskedMobile/)
  assert.ok(f.changes.every((entry) => entry.key === RESIDENT_SESSION_KEY))
  assert.deepEqual(f.map.get(merchantKey), merchantValue)
})

check('invalid login response cannot authenticate or fall back to a mock member', async () => {
  for (const response of [failure('WECHAT_REJECTED'), success({ memberId: profile().memberId, identity: 'STORE', session: tokens() }), success({ memberId: profile().memberId, identity: 'RESIDENT', session: { ...tokens(), accessToken: 'not-a-jwt' } })]) {
    const f = fixture()
    f.handlers.set(urls.login, () => response)
    await assert.rejects(f.login(), ResidentError)
    assert.equal(f.client.authenticated, false)
    assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
    assert.equal(f.count(urls.profile), 0)
  }
})

check('restored credentials are bound to this API and resident namespace', async () => {
  const f = fixture()
  await f.login()
  const resident = f.map.get(RESIDENT_SESSION_KEY)
  for (const invalid of [
    { ...resident, identity: 'STORE' },
    { ...resident, apiBaseUrl: 'https://other-app.invalid' },
    { ...resident, session: { ...resident.session, absoluteExpiresAt: nowBaseline - 1 } },
    { memberId: 'member-wang', mobile: 'mock' },
  ]) {
    const g = fixture()
    g.map.set(RESIDENT_SESSION_KEY, invalid)
    g.client.restore()
    assert.equal(g.client.authenticated, false)
    assert.equal(g.map.has(RESIDENT_SESSION_KEY), false)
    assert.deepEqual(g.map.get(merchantKey), merchantValue)
  }
})

check('concurrent expired-access reads share one refresh and use only the replacement access', async () => {
  const f = fixture()
  await f.login()
  f.advance(16 * 60 * 1000)
  const refresh = deferred()
  f.handlers.set(urls.refresh, () => refresh.promise)
  const before = f.count(urls.profile)
  const one = f.client.profile()
  const two = f.client.profile()
  await settleUntil(() => f.count(urls.refresh) === 1, 'refresh was not requested')
  assert.equal(f.count(urls.profile), before)
  const renewed = tokens(2, nowBaseline + 16 * 60 * 1000)
  refresh.resolve(success(renewed))
  const results = await Promise.all([one, two])
  assert.ok(results.every((item) => item.memberId === profile().memberId))
  assert.equal(f.count(urls.refresh), 1)
  assert.deepEqual(f.calls.find((item) => item.path === urls.refresh).body, { refreshToken: tokens().refreshToken })
  assert.ok(f.calls.filter((item) => item.path === urls.profile).slice(-2).every((item) => item.accessToken === renewed.accessToken))
})

check('ordinary forbidden or pending identity response does not refresh or discard a valid session', async () => {
  for (const code of ['FORBIDDEN', 'B04_PENDING']) {
    const f = fixture()
    await f.login()
    f.handlers.set(urls.profile, () => failure(code))
    await assert.rejects(f.client.profile(), ResidentError)
    assert.equal(f.count(urls.refresh), 0)
    assert.equal(f.client.authenticated, true)
  }
})

check('explicit session rejection permits one refresh and one GET retry only', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.profile, () => failure('SESSION_REJECTED'))
  const before = f.count(urls.profile)
  await assert.rejects(f.client.profile(), ResidentError)
  assert.equal(f.count(urls.refresh), 1)
  assert.equal(f.count(urls.profile) - before, 2)
})

check('GET rejected after proactive refresh cannot trigger a second refresh for the same operation', async () => {
  const f = fixture()
  await f.login()
  f.advance(16 * 60 * 1000)
  f.handlers.set(urls.profile, () => failure('SESSION_REJECTED'))
  const before = f.count(urls.profile)
  await rejectsCode(f.client.profile(), 'SESSION_REJECTED')
  assert.equal(f.count(urls.refresh), 1)
  assert.equal(f.count(urls.profile) - before, 1)
  assert.equal(f.client.authenticated, false)
})

check('failed refresh clears only Resident credentials and cannot loop', async () => {
  const f = fixture()
  await f.login()
  f.advance(16 * 60 * 1000)
  f.handlers.set(urls.refresh, () => failure('SESSION_REJECTED'))
  await assert.rejects(f.client.profile(), ResidentError)
  assert.equal(f.count(urls.refresh), 1)
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
  assert.deepEqual(f.map.get(merchantKey), merchantValue)
})

check('a delayed rejection for old access reuses an already rotated session without refreshing twice', async () => {
  const f = fixture()
  await f.login()
  const first = deferred()
  const second = deferred()
  let count = 0
  f.handlers.set(urls.profile, () => {
    count++
    if (count === 1) return first.promise
    if (count === 2) return second.promise
    return success(profile())
  })
  const one = f.client.profile()
  const two = f.client.profile()
  await settleUntil(() => count === 2, 'both original reads must be in flight')
  first.resolve(failure('SESSION_REJECTED'))
  await one
  second.resolve(failure('SESSION_REJECTED'))
  await two
  assert.equal(f.count(urls.refresh), 1)
})

check('refresh cannot silently change sid, extend absolute life or reuse consumed credentials', async () => {
  for (const invalid of [
    { ...tokens(2), sid: 'f'.repeat(32) },
    { ...tokens(2), absoluteExpiresAt: tokens().absoluteExpiresAt + 1 },
    tokens(),
  ]) {
    const f = fixture()
    await f.login()
    f.handlers.set(urls.profile, () => failure('SESSION_REJECTED'))
    f.handlers.set(urls.refresh, () => success(invalid))
    await rejectsCode(f.client.profile(), 'SESSION_REJECTED')
    assert.equal(f.client.authenticated, false)
    assert.equal(f.count(urls.refresh), 1)
  }
})

check('a write rejected after send is never automatically replayed', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.edit, () => failure('SESSION_REJECTED'))
  await assert.rejects(f.client.edit({ version: 0, nickname: '一次写入' }), ResidentError)
  assert.equal(f.count(urls.edit), 1)
  const request = f.calls.find((item) => item.path === urls.edit)
  assert.equal(request.method, 'PUT')
  assert.deepEqual(request.body, { version: 0, nickname: '一次写入' })
})

check('ambiguous network failure after a write is not replayed', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.phone, () => Promise.reject(new Error('synthetic transport loss')))
  await assert.rejects(f.client.phone({ phoneCode: 'synthetic-phone-code', requestId: 'synthetic-request-id-01', version: 0 }), ResidentError)
  assert.equal(f.count(urls.phone), 1)
  assert.equal(f.count(urls.refresh), 0)
})

check('logout clears local credentials immediately and a late refresh cannot resurrect them', async () => {
  const f = fixture()
  await f.login()
  f.advance(16 * 60 * 1000)
  const refreshing = deferred()
  const loggingOut = deferred()
  f.handlers.set(urls.refresh, () => refreshing.promise)
  f.handlers.set(urls.logout, () => loggingOut.promise)
  const pendingProfile = f.client.profile()
  await settleUntil(() => f.count(urls.refresh) === 1, 'refresh was not started')
  const pendingLogout = f.client.logout()
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
  refreshing.resolve(success(tokens(3, nowBaseline + 16 * 60 * 1000)))
  await rejectsCode(pendingProfile, 'STALE_OPERATION')
  loggingOut.resolve(success(null))
  await pendingLogout
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
  assert.deepEqual(f.map.get(merchantKey), merchantValue)
})

check('logout network uncertainty is returned truthfully while local Resident state is removed', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.logout, () => Promise.reject(new Error('synthetic network loss')))
  const result = await f.client.logout()
  assert.equal(result.confirmed, false)
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
  assert.deepEqual(f.map.get(merchantKey), merchantValue)
})

check('late old profile cannot overwrite a newly logged-in identity', async () => {
  const f = fixture()
  await f.login()
  const late = deferred()
  f.handlers.set(urls.profile, () => late.promise)
  const oldProfile = f.client.profile()
  await settleUntil(() => f.count(urls.profile) === 2, 'old profile request was not sent')
  f.handlers.delete(urls.profile)
  f.setProfile(profile('b'))
  f.setTokens(tokens(4))
  await f.login()
  late.resolve(success(profile('a', 9)))
  await rejectsCode(oldProfile, 'STALE_OPERATION')
  assert.equal(f.client.memberId, profile('b').memberId)
  assert.equal(f.map.get(RESIDENT_SESSION_KEY).memberId, profile('b').memberId)
})

check('late platform login code cannot replace a more recent login', async () => {
  const f = fixture()
  const firstCode = deferred()
  const first = f.client.login(() => firstCode.promise)
  f.setProfile(profile('b'))
  f.setTokens(tokens(5))
  await f.login()
  firstCode.resolve('late-synthetic-login-code')
  await rejectsCode(first, 'STALE_OPERATION')
  assert.equal(f.count(urls.login), 1)
  assert.equal(f.client.memberId, profile('b').memberId)
})

check('late Refresh response cannot overwrite the session from a new login', async () => {
  const f = fixture()
  await f.login()
  const late = deferred()
  f.advance(16 * 60 * 1000)
  f.handlers.set(urls.refresh, () => late.promise)
  const oldRead = f.client.profile()
  await settleUntil(() => f.count(urls.refresh) === 1, 'old refresh must be in flight')
  f.setProfile(profile('b'))
  f.setTokens(tokens(6, nowBaseline + 16 * 60 * 1000))
  await f.login()
  const newSaved = structuredClone(f.map.get(RESIDENT_SESSION_KEY))
  late.resolve(success(tokens(7, nowBaseline + 16 * 60 * 1000)))
  await rejectsCode(oldRead, 'STALE_OPERATION')
  assert.deepEqual(f.map.get(RESIDENT_SESSION_KEY), newSaved)
  assert.equal(f.client.memberId, profile('b').memberId)
})

check('late write response cannot return old profile as the newly logged-in identity', async () => {
  const f = fixture()
  await f.login()
  const late = deferred()
  f.handlers.set(urls.edit, () => late.promise)
  const oldWrite = f.client.edit({ version: 0, nickname: '旧身份请求' })
  await settleUntil(() => f.count(urls.edit) === 1, 'old write must be in flight')
  f.setProfile(profile('b'))
  f.setTokens(tokens(10))
  await f.login()
  late.resolve(success(profile('a', 1, { nickname: '旧身份请求' })))
  await rejectsCode(oldWrite, 'STALE_OPERATION')
  assert.equal(f.client.memberId, profile('b').memberId)
})

check('profile conflict and same-phone link requirement never replace Member A or leak response details', async () => {
  const f = fixture()
  await f.login()
  const saved = structuredClone(f.map.get(RESIDENT_SESSION_KEY))
  f.handlers.set(urls.edit, () => failure('PROFILE_CONFLICT', 409))
  await rejectsCode(f.client.edit({ version: 0, nickname: '旧版本请求' }), 'PROFILE_CONFLICT')
  f.handlers.set(urls.phone, () => failure('LINK_REQUIRED', 409, { result: { memberId: 'not-to-be-disclosed', mobile: 'not-to-be-disclosed', storeId: 'not-to-be-disclosed' } }))
  let error
  try { await f.client.phone({ phoneCode: 'synthetic-phone-code', requestId: 'synthetic-request-id-02', version: 0 }) } catch (caught) { error = caught }
  assert.equal(error.code, 'LINK_REQUIRED')
  assert.doesNotMatch(residentErrorMessage(error), /not-to-be-disclosed|storeId|memberId/)
  assert.deepEqual(f.map.get(RESIDENT_SESSION_KEY), saved)
  assert.equal(f.client.memberId, profile().memberId)
  assert.equal(f.count(urls.link), 0)
})

check('valid edit and phone update return authoritative profile without persisting phone codes', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.edit, () => success(profile('a', 1, { nickname: '修改后昵称' })))
  assert.equal((await f.client.edit({ version: 0, nickname: '修改后昵称' })).version, 1)
  f.handlers.set(urls.phone, () => success(profile('a', 2, { phoneBound: true, maskedMobile: '199****0001' })))
  const result = await f.client.phone({ phoneCode: 'synthetic-phone-code', requestId: 'synthetic-request-id-03', version: 1 })
  assert.equal(result.phoneBound, true)
  assert.equal(result.version, 2)
  const body = f.calls.find((item) => item.path === urls.phone).body
  assert.deepEqual(Object.keys(body).sort(), ['phoneCode', 'requestId', 'version'])
  assert.doesNotMatch(JSON.stringify(f.map.get(RESIDENT_SESSION_KEY)), /synthetic-phone-code|synthetic-request-id-03|maskedMobile/)
})

check('profile projection excludes private extra fields and new writes cannot select Member or phone directly', async () => {
  const f = fixture({ profile: profile('a', 0, { password: 'must-not-surface', mobile: 'must-not-surface', storeId: 'must-not-surface' }) })
  const result = await f.login()
  assert.deepEqual(Object.keys(result).sort(), ['avatar', 'maskedMobile', 'memberId', 'nickname', 'phoneBound', 'updatedAt', 'version'])
  assert.doesNotMatch(JSON.stringify(result), /must-not-surface|password|storeId/)
  f.handlers.set(urls.edit, () => success(profile('a', 1)))
  await f.client.edit({ version: 0, nickname: '合法昵称', memberId: profile('b').memberId, username: 'forbidden', role: 'MANAGER', mobile: 'forbidden' })
  assert.deepEqual(Object.keys(f.calls.find((item) => item.path === urls.edit).body).sort(), ['nickname', 'version'])
  f.handlers.set(urls.phone, () => success(profile('a', 2)))
  await f.client.phone({ phoneCode: 'synthetic-phone-code', requestId: 'synthetic-request-id-04', version: 1, memberId: profile('b').memberId, mobile: 'forbidden' })
  assert.deepEqual(Object.keys(f.calls.find((item) => item.path === urls.phone).body).sort(), ['phoneCode', 'requestId', 'version'])
})

check('Backend international or short-history phone masks are accepted while complete numbers are rejected', async () => {
  for (const maskedMobile of ['+44****1234', '****']) {
    const f = fixture({ profile: profile('a', 0, { phoneBound: true, maskedMobile }) })
    const result = await f.login()
    assert.equal(result.phoneBound, true)
    assert.equal(result.maskedMobile, maskedMobile)
  }
  // Fictional international test number, never sent to any external service.
  const f = fixture({ profile: profile('a', 0, { phoneBound: true, maskedMobile: '+447700900123' }) })
  await rejectsCode(f.login(), 'INVALID_RESPONSE')
})

check('storage pending never fabricates an uploaded file or sends profile edit', async () => {
  const f = fixture()
  await f.login()
  await rejectsCode(f.client.uploadAvatar({ filePath: 'synthetic-local-path.png', size: 1024, type: 'png' }), 'STORAGE_PENDING')
  assert.equal(f.uploads.length, 1)
  assert.equal(f.uploads[0].accessToken, tokens().accessToken)
  assert.equal(f.count(urls.edit), 0)
  assert.equal(f.client.authenticated, true)
})

check('invalid avatar format or oversize image is blocked before the platform upload port', async () => {
  const f = fixture()
  await f.login()
  for (const image of [
    { filePath: 'synthetic.gif', type: 'gif', size: 10 },
    { filePath: 'synthetic.png', type: 'png', size: 2 * 1024 * 1024 + 1 },
  ]) await assert.rejects(f.client.uploadAvatar(image), ResidentError)
  assert.equal(f.uploads.length, 0)
})

check('safe user messages cover all pending resources without exposing raw server messages', () => {
  for (const code of ['SESSION_REJECTED', 'IDENTITY_UNAVAILABLE', 'PROFILE_CONFLICT', 'LINK_REQUIRED', 'HISTORY_CONFLICT', 'B04_PENDING', 'PHONE_PENDING', 'STORAGE_PENDING', 'PROOF_SOURCE_PENDING', 'LINK_PENDING', 'OPERATION_UNAVAILABLE']) {
    const message = residentErrorMessage(new ResidentError(code, 503))
    assert.equal(typeof message, 'string')
    assert.ok(message.length > 0)
    assert.doesNotMatch(message, /Exception|SELECT|INSERT|password|secret|token/i)
  }
  assert.doesNotMatch(residentErrorMessage(new Error('raw token password internal traceback')), /raw token|password|traceback/)
})

check('explicit disabled identity fails closed without trying refresh', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.profile, () => failure('IDENTITY_UNAVAILABLE'))
  await rejectsCode(f.client.profile(), 'IDENTITY_UNAVAILABLE')
  assert.equal(f.count(urls.refresh), 0)
  assert.equal(f.client.authenticated, false)
})

check('future replacement response obtains Member B only from its authenticated profile', async () => {
  const f = fixture()
  await f.login()
  const replacement = tokens(8)
  f.setProfile(profile('b', 4))
  const result = await f.client.acceptLinkResponse({ state: 'DONE', nextAction: 'REPLACE_SESSION', session: replacement, memberId: 'untrusted-client-selector' }, f.client.revision)
  assert.equal(result.memberId, profile('b').memberId)
  assert.equal(f.client.memberId, profile('b').memberId)
  assert.equal(f.map.get(RESIDENT_SESSION_KEY).memberId, profile('b').memberId)
  assert.equal(f.calls.at(-1).accessToken, replacement.accessToken)
  assert.equal(f.count(urls.link), 0, 'offline response handling is not a production proof source')
})

check('relogin response clears old credentials and cannot reuse a consumed WeChat code', async () => {
  const f = fixture()
  await f.login()
  const loginRequests = f.count(urls.login)
  assert.equal(await f.client.acceptLinkResponse({ state: 'DONE', nextAction: 'WECHAT_RELOGIN' }, f.client.revision), null)
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
  assert.equal(f.count(urls.login), loginRequests)
  assert.deepEqual(f.map.get(merchantKey), merchantValue)
})

check('failed replacement profile clears the restricted handoff instead of retaining Member A', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.profile, () => failure('LINK_PENDING', 409))
  await rejectsCode(f.client.acceptLinkResponse({ state: 'DONE', nextAction: 'REPLACE_SESSION', session: tokens(9) }, f.client.revision), 'LINK_PENDING')
  assert.equal(f.client.authenticated, false)
  assert.equal(f.client.memberId, null)
  assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
})

check('a late future linking response cannot revive a session after logout', async () => {
  const f = fixture()
  await f.login()
  const beforeLogout = f.client.revision
  await f.client.logout()
  await rejectsCode(f.client.acceptLinkResponse({ state: 'DONE', nextAction: 'REPLACE_SESSION', session: tokens(11) }, beforeLogout), 'STALE_OPERATION')
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(RESIDENT_SESSION_KEY), false)
  assert.equal(f.count(urls.profile), 1)
})

function storeFixture(options = {}) {
  const f = fixture(options)
  const platformCalls = { login: 0, choose: 0, requestId: 0 }
  const store = loadModule('apps/resident-miniapp/src/stores/member.ts', {
    '../services/resident-session': clientExports,
    '../services/resident-platform': {
      createResidentClient: () => f.client, isWechat: options.isWechat ?? true,
      residentLoginCode: async () => { platformCalls.login++; return 'synthetic-login-code' },
      residentRequestId: () => { platformCalls.requestId++; return `synthetic-request-id-${platformCalls.requestId}` },
      selectResidentAvatar: async () => { platformCalls.choose++; return { filePath: 'synthetic-local-path.png', size: 1024, type: 'png' } },
    },
  })
  return { ...f, context: store.useResidentContext(), platformCalls }
}

check('real store preserves basic login when phone authorization is cancelled before or after login', async () => {
  const f = storeFixture()
  assert.equal(f.context.state.authenticated, false)
  assert.equal(f.context.state.profile, null)
  await f.context.authorizePhone(undefined)
  assert.equal(f.context.state.authenticated, true)
  assert.equal(f.context.state.profile.memberId, profile().memberId)
  assert.equal(f.count(urls.phone), 0)
  assert.equal(f.count(urls.login), 1)
  assert.match(f.context.state.notice, /已取消手机号授权.*基本登录仍可使用/)
  await f.context.authorizePhone(undefined)
  assert.equal(f.count(urls.login), 1)
  assert.equal(f.count(urls.phone), 0)
})

check('phone platform failure preserves basic login but is not reported as user cancellation', async () => {
  const f = storeFixture()
  await f.context.authorizePhone(undefined, 'failed')
  assert.equal(f.context.state.authenticated, true)
  assert.equal(f.context.state.profile.memberId, profile().memberId)
  assert.equal(f.count(urls.login), 1)
  assert.equal(f.count(urls.phone), 0)
  assert.equal(f.context.state.error, residentErrorMessage(new ResidentError('PHONE_REJECTED')))
  assert.doesNotMatch(f.context.state.notice, /取消/)
  await f.context.authorizePhone(undefined, 'failed')
  assert.equal(f.count(urls.login), 1)
  assert.equal(f.context.state.authenticated, true)
})

check('real store obtains basic login before phone submission and rereads authoritative bound profile', async () => {
  const f = storeFixture()
  f.handlers.set(urls.phone, () => {
    const updated = profile('a', 1, { phoneBound: true, maskedMobile: '199****0001' })
    f.setProfile(updated)
    return success(updated)
  })
  await f.context.authorizePhone('synthetic-phone-code')
  assert.deepEqual(f.calls.map((item) => item.path), [urls.login, urls.profile, urls.phone, urls.profile])
  assert.equal(f.calls[2].body.phoneCode, 'synthetic-phone-code')
  assert.equal(f.calls[0].body.loginCode, 'synthetic-login-code')
  assert.equal(f.context.state.profile.phoneBound, true)
  assert.equal(f.context.state.profile.maskedMobile, '199****0001')
  assert.equal(f.context.state.profile.version, 1)
})

check('PHONE_PENDING keeps the basic session and exposes a safe actionable message', async () => {
  const f = storeFixture()
  f.handlers.set(urls.phone, () => failure('PHONE_PENDING', 503))
  await f.context.authorizePhone('synthetic-phone-code')
  assert.equal(f.context.state.authenticated, true)
  assert.equal(f.context.state.profile.phoneBound, false)
  assert.match(f.context.state.error, /尚未开放.*基本登录/)
  assert.equal(f.context.state.busy, false)
  assert.equal(f.count(urls.phone), 1)
})

check('LINK_REQUIRED presents neutral confirmation and production proof pending does not call linking API', async () => {
  const f = storeFixture()
  f.handlers.set(urls.phone, () => failure('LINK_REQUIRED', 409, { result: { memberId: 'secret-B', storeId: 'secret-store', mobile: 'secret-phone' } }))
  await f.context.authorizePhone('synthetic-phone-code')
  assert.equal(f.context.state.linkRequired, true)
  assert.equal(f.context.state.profile.memberId, profile().memberId)
  assert.doesNotMatch(JSON.stringify(f.context.state), /secret-B|secret-store|secret-phone/)
  const before = f.calls.length
  await f.context.confirmExistingLink()
  assert.equal(f.calls.length, before)
  assert.equal(f.count(urls.link), 0)
  assert.match(f.context.state.error, /归属核验尚未开放/)
  assert.equal(f.context.state.authenticated, true)
})

check('real store conflict fetches the new version once and never resubmits the edit', async () => {
  const f = storeFixture()
  await f.context.loginBasic()
  f.setProfile(profile('a', 2, { nickname: '已提交的新昵称' }))
  f.handlers.set(urls.edit, () => failure('PROFILE_CONFLICT', 409))
  const before = f.count(urls.profile)
  await f.context.saveProfile({ version: 0, nickname: '迟到请求' })
  assert.equal(f.count(urls.edit), 1)
  assert.equal(f.count(urls.profile) - before, 1)
  assert.equal(f.context.state.profile.version, 2)
  assert.equal(f.context.state.profile.nickname, '已提交的新昵称')
  assert.match(f.context.state.error, /资料已更新/)
})

check('real store storage pending retains the legitimate avatar and never writes a synthetic reference', async () => {
  const original = profile('a', 0, { avatar: 'https://synthetic-assets.invalid/original.png' })
  const f = storeFixture({ profile: original })
  await f.context.loginBasic()
  await f.context.changeAvatar()
  assert.equal(f.platformCalls.choose, 1)
  assert.equal(f.uploads.length, 1)
  assert.equal(f.count(urls.edit), 0)
  assert.equal(f.context.state.profile.avatar, original.avatar)
  assert.match(f.context.state.error, /头像上传暂不可用/)
})

check('real store ignores a delayed read after logout and does not show a stale error', async () => {
  const f = storeFixture()
  await f.context.loginBasic()
  const late = deferred()
  f.handlers.set(urls.profile, () => late.promise)
  const loading = f.context.loadProfile()
  await settleUntil(() => f.count(urls.profile) === 2, 'store read must be in flight')
  await f.context.logout()
  late.resolve(success(profile()))
  await loading
  assert.equal(f.context.state.authenticated, false)
  assert.equal(f.context.state.profile, null)
  assert.equal(f.context.state.error, '')
  assert.equal(f.context.state.loading, false)
  assert.match(f.context.state.notice, /已退出本设备/)
  assert.deepEqual(f.map.get(merchantKey), merchantValue)
})

check('H5 store does not simulate WeChat login success or call authentication APIs', async () => {
  const f = storeFixture({ isWechat: false })
  await f.context.loginBasic()
  assert.equal(f.context.state.authenticated, false)
  assert.equal(f.calls.length, 0)
  assert.equal(f.platformCalls.login, 0)
  assert.match(f.context.state.error, /请在微信小程序/)
})

check('production identity modules have no Mock imports, credential logging or global storage clearing', () => {
  for (const file of ['services/resident-session.ts', 'services/resident-platform.ts', 'stores/member.ts']) {
    const content = source(`apps/resident-miniapp/src/${file}`)
    assert.doesNotMatch(content, /from\s+['"][^'"]*mock|console\.(log|info|debug|warn|error)\s*\(|clearStorage|member-wang|王阿姨/)
  }
  const adapter = source('apps/resident-miniapp/src/services/resident-platform.ts')
  assert.match(adapter, /uni\.login\(/)
  assert.match(adapter, /uni\.uploadFile\(/)
  assert.match(adapter, /uni\.request\(/)
  assert.doesNotMatch(adapter, /appId\s*:|AppSecret\s*:/)
})

function platformModule(environment, uni) {
  const file = 'apps/resident-miniapp/src/services/resident-platform.ts'
  // Test-only substitution for Vite's compile-time public environment; no files or runtime env are changed.
  const code = source(file)
    .replaceAll('import.meta.env', `(${JSON.stringify(environment)})`)
    .replaceAll('process.env.UNI_PLATFORM', JSON.stringify(environment.UNI_PLATFORM))
  return loadModule(file, { './resident-session': clientExports, __uni: uni }, code)
}

check('real platform adapter calls uni.login and sends the exact login/profile headers through uni.request', async () => {
  const calls = { login: [], requests: [], upload: [] }
  const storage = new Map()
  const fresh = { ...tokens(20, Date.now()), absoluteExpiresAt: Date.now() + 86400000 }
  const platform = platformModule({ UNI_PLATFORM: 'mp-weixin', VITE_RESIDENT_API_BASE_URL: `${apiBaseUrl}/` }, {
    getStorageSync: (key) => storage.get(key), setStorageSync: (key, value) => storage.set(key, value), removeStorageSync: (key) => storage.delete(key),
    login: (options) => { calls.login.push(options); options.success({ code: 'synthetic-platform-login-code' }) },
    request: (options) => {
      calls.requests.push(options)
      const result = options.url.endsWith(urls.login) ? { memberId: profile().memberId, identity: 'RESIDENT', session: fresh } : profile()
      options.success({ statusCode: 200, data: success(result).data })
    },
    uploadFile: (options) => {
      calls.upload.push(options)
      options.success({ statusCode: 200, data: JSON.stringify(success({ fileId: '910000000000000099', url: 'https://synthetic-assets.invalid/avatar.png' }).data) })
    },
  })
  const client = platform.createResidentClient()
  await client.login(platform.residentLoginCode)
  assert.equal(calls.login[0].provider, 'weixin')
  assert.equal(calls.requests[0].url, `${apiBaseUrl}${urls.login}`)
  assert.deepEqual(calls.requests[0].data, { loginCode: 'synthetic-platform-login-code' })
  assert.deepEqual(calls.requests[0].header, { 'Content-Type': 'application/json' })
  assert.equal(calls.requests[1].header.accessToken, fresh.accessToken)
  assert.equal(calls.requests[1].header.Authorization, undefined)
  assert.equal(calls.requests[1].method, 'GET')
  const uploaded = await client.uploadAvatar({ filePath: 'synthetic-selected.png', size: 2048, type: 'png' })
  assert.equal(uploaded.fileId, '910000000000000099')
  assert.equal(calls.upload[0].name, 'file')
  assert.equal(calls.upload[0].url, `${apiBaseUrl}${urls.avatar}`)
  assert.deepEqual(calls.upload[0].header, { accessToken: fresh.accessToken })
  assert.equal(calls.upload[0].formData, undefined)
  assert.equal(calls.upload[0].filePath, 'synthetic-selected.png')
  const originalRandom = Math.random
  try {
    Math.random = () => 0
    const firstId = platform.residentRequestId()
    const secondId = platform.residentRequestId()
    assert.match(firstId, /^[A-Za-z0-9_-]{16,64}$/)
    assert.match(secondId, /^[A-Za-z0-9_-]{16,64}$/)
    assert.notEqual(firstId, secondId)
  } finally { Math.random = originalRandom }
})

check('real platform avatar selection validates selected size and decoded image type before upload', async () => {
  let imageType = 'png'
  let selectedSize = 100
  let infoCalls = 0
  const platform = platformModule({ UNI_PLATFORM: 'mp-weixin' }, {
    chooseImage: (options) => {
      assert.equal(options.count, 1)
      assert.deepEqual(options.sizeType, ['original'])
      options.success({ tempFilePaths: ['synthetic-selected.png'], tempFiles: [{ size: selectedSize }] })
    },
    getImageInfo: (options) => { infoCalls++; options.success({ type: imageType }) },
  })
  assert.deepEqual(await platform.selectResidentAvatar(), { filePath: 'synthetic-selected.png', size: 100, type: 'png' })
  imageType = 'gif'
  await rejectsCode(platform.selectResidentAvatar(), 'AVATAR_REJECTED')
  selectedSize = 2 * 1024 * 1024 + 1
  await rejectsCode(platform.selectResidentAvatar(), 'AVATAR_REJECTED')
  assert.equal(infoCalls, 2)
})

check('unconfigured API and H5 platform cannot invoke real login or silently choose a fallback API', async () => {
  let invoked = 0
  const platform = platformModule({ UNI_PLATFORM: 'h5', VITE_RESIDENT_API_BASE_URL: '' }, {
    login: () => { invoked++ }, request: () => { invoked++ }, removeStorageSync() {},
  })
  await rejectsCode(platform.residentLoginCode(), 'WECHAT_UNAVAILABLE')
  await rejectsCode(platform.createResidentClient().login(async () => { invoked++; return 'unused-code' }), 'API_NOT_CONFIGURED')
  assert.equal(invoked, 0)
})

const { reactive, nextTick } = nativeRequire('vue')

function pageFixture(initial = {}) {
  const state = reactive({ authenticated: false, profile: null, busy: false, loading: false, error: '', notice: '', linkRequired: false, ...initial })
  const calls = { load: 0, phone: [], save: [], avatar: 0, logout: 0, link: 0, navigation: [], modal: [] }
  const context = {
    state, isWechat: true, loadProfile: async () => { calls.load++ }, loginBasic: async () => {},
    authorizePhone: async (code, outcome) => { calls.phone.push({ code, outcome }) },
    logout: async () => { calls.logout++ }, confirmExistingLink: async () => { calls.link++ },
    saveProfile: async (input) => { calls.save.push(input); state.profile = profile('a', input.version + 1, { nickname: input.nickname }) },
    changeAvatar: async () => { calls.avatar++ },
  }
  const overrides = {
    '@/stores/member': { useResidentContext: () => context },
    '@/utils/navigation': { openPage: (url) => calls.navigation.push(url), openSubPage: (url) => calls.navigation.push(url) },
    '@/config/navigation': { residentTabItems: [] },
    '@/adapters/mock': { appAdapter: { getResidentProfile: async () => ({
      member: { name: '禁止展示的演示身份', mobile: '禁止展示的演示号码', projectName: '禁止展示的演示房屋' },
      groups: [{ title: '我的订单', type: 'orders', items: [{ label: '订单演示入口', icon: 'order', path: '/pages/mall/order-list/index', available: true, value: '私人资料', badge: 9, description: '演示订单数量' }] }],
    }) } },
    __uni: { showModal: (options) => calls.modal.push(options), navigateBack() {}, redirectTo() {} },
  }
  return { state, calls, context, overrides }
}

check('profile page uses real identity state while retaining only mock navigation fields', async () => {
  const f = pageFixture()
  const { page, lifecycle, template } = setupPage('apps/resident-miniapp/src/pages/profile/index.vue', f.overrides)
  await page.loadNavigation()
  assert.deepEqual(Object.keys(page.groups.value[0].items[0]).sort(), ['actionText', 'available', 'icon', 'label', 'path', 'tone'])
  assert.doesNotMatch(template, /data!?\.member|member-wang|王阿姨|138\*|group\.items\[[^\]]+\]\.description|item\.(badge|value)/)
  assert.match(template, /state\.authenticated/)
  assert.match(template, /state\.profile\.maskedMobile/)
  assert.match(template, /手机号未绑定/)
  assert.match(template, /演示功能/)
  page.editProfile()
  assert.equal(f.calls.navigation.length, 0)
  f.state.authenticated = true
  f.state.profile = profile()
  page.editProfile()
  assert.deepEqual(f.calls.navigation, ['/pages/profile/edit'])
  lifecycle.shows[0]()
  assert.equal(f.calls.load, 1, 'returning to My must reread the real profile')
})

check('phone authorization is a user gesture and cancellation does not invent a phone code', () => {
  const f = pageFixture()
  const { page, template } = setupPage('apps/resident-miniapp/src/pages/profile/index.vue', f.overrides)
  assert.match(template, /open-type="getPhoneNumber"/)
  assert.match(template, /@getphonenumber="phoneAuthorized"/)
  assert.match(template, /#ifndef MP-WEIXIN/)
  assert.match(template, /当前环境不支持微信登录和手机号授权/)
  assert.match(template, /暂不绑定手机号，使用微信基本登录/)
  page.phoneAuthorized({ detail: {} })
  page.phoneAuthorized({ detail: { code: 'synthetic-phone-code' } })
  page.phoneAuthorized({ detail: { errMsg: 'getPhoneNumber:fail user deny' } })
  page.phoneAuthorized({ detail: { errMsg: 'getPhoneNumber:fail user cancel' } })
  page.phoneAuthorized({ detail: { errMsg: 'getPhoneNumber:fail platform unavailable' } })
  assert.deepEqual(f.calls.phone, [
    { code: undefined, outcome: 'cancelled' },
    { code: 'synthetic-phone-code', outcome: 'cancelled' },
    { code: undefined, outcome: 'cancelled' },
    { code: undefined, outcome: 'cancelled' },
    { code: undefined, outcome: 'failed' },
  ])
})

check('link conditions and logout require user confirmation without inventing proof', () => {
  const f = pageFixture({ authenticated: true, profile: profile() })
  const { page, template } = setupPage('apps/resident-miniapp/src/pages/profile/index.vue', f.overrides)
  page.reviewExistingLink()
  f.calls.modal[0].success({ confirm: false })
  assert.equal(f.calls.link, 0)
  f.calls.modal[0].success({ confirm: true })
  assert.equal(f.calls.link, 1)
  assert.doesNotMatch(template, /proofReference|sourceMemberId|targetMemberId/)
  page.confirmLogout()
  f.calls.modal[1].success({ confirm: false })
  assert.equal(f.calls.logout, 0)
  f.calls.modal[1].success({ confirm: true })
  assert.equal(f.calls.logout, 1)
})

check('edit page sends only nickname and authoritative version then adopts the new profile', async () => {
  const f = pageFixture({ authenticated: true, profile: profile() })
  const { page } = setupPage('apps/resident-miniapp/src/pages/profile/edit.vue', f.overrides)
  await page.readProfile()
  page.nickname.value = '新昵称'
  await page.saveNickname()
  assert.deepEqual(f.calls.save, [{ version: 0, nickname: '新昵称' }])
  assert.equal(page.version.value, 1)
  assert.equal(page.originalNickname.value, '新昵称')
  page.nickname.value = '<script>'
  await page.saveNickname()
  assert.equal(f.calls.save.length, 1)
  assert.ok(page.nicknameError.value)
})

check('edit page preserves unsaved text on reread and blocks stale version writes until confirmation', async () => {
  const f = pageFixture({ authenticated: true, profile: profile() })
  const { page } = setupPage('apps/resident-miniapp/src/pages/profile/edit.vue', f.overrides)
  await page.readProfile()
  page.nickname.value = '尚未保存'
  f.state.profile = profile('a', 2, { nickname: '另一设备的新昵称' })
  await page.readProfile()
  assert.equal(page.nickname.value, '尚未保存')
  assert.equal(page.version.value, 0)
  await page.saveNickname()
  assert.equal(f.calls.save.length, 0)
  assert.match(page.localNotice.value, /读取最新资料/)
  page.confirmReload()
  f.calls.modal[0].success({ confirm: false })
  assert.equal(page.nickname.value, '尚未保存')
  f.calls.modal[0].success({ confirm: true })
  await settleUntil(() => page.version.value === 2, 'confirmed reload must adopt the current version')
  assert.equal(page.nickname.value, '另一设备的新昵称')
})

check('edit page blocks avatar changes with unsaved edits and clears private draft on logout', async () => {
  const f = pageFixture({ authenticated: true, profile: profile() })
  const { page, template } = setupPage('apps/resident-miniapp/src/pages/profile/edit.vue', f.overrides)
  await page.readProfile()
  page.nickname.value = '未保存昵称'
  await page.selectAvatar()
  assert.equal(f.calls.avatar, 0)
  assert.match(page.localNotice.value, /先保存昵称/)
  assert.match(template, /JPEG \/ PNG/)
  assert.match(template, /2 MiB/)
  f.state.authenticated = false
  await nextTick()
  assert.equal(page.nickname.value, '')
  assert.equal(page.originalNickname.value, '')
  assert.equal(page.version.value, null)
})

let failed = 0
for (const { name, fn } of checks) {
  try {
    await fn()
    console.log(`PASS ${name}`)
  } catch (error) {
    failed++
    // Do not dump assertion operands, response bodies, tokens, codes or phone values.
    const location = String(error?.stack || '').split('\n').find((line) => line.includes('check-p04-resident-identity.mjs:'))?.trim() || ''
    console.error(`FAIL ${name} (${error?.name || 'Error'}) ${location}`)
  }
}
console.log(`P04 offline identity checks: ${checks.length - failed}/${checks.length} PASS; ${failed} failed. Synthetic ports and compiled page scripts only; no real channel or device evidence.`)
if (failed) process.exitCode = 1
