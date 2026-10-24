import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

// Offline only: execute the real client against explicit synthetic ports.
// No Backend, WeChat, Redis, database or device is contacted by this script.
const root = fileURLToPath(new URL('../', import.meta.url))
const nativeRequire = createRequire(path.join(root, 'package.json'))
const ts = nativeRequire('typescript')
const source = (file) => readFileSync(path.join(root, file), 'utf8')
function loadModule(file, overrides = {}, sourceOverride) {
  const filename = path.resolve(root, file)
  const module = { exports: {} }
  const code = ts.transpileModule(sourceOverride ?? source(file), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const requireLocal = (id) => {
    if (Object.hasOwn(overrides, id)) return overrides[id]
    if (id.startsWith('.')) return loadModule(path.resolve(path.dirname(filename), id) + '.ts', overrides)
    return nativeRequire(id)
  }
  new Function('require', 'module', 'exports', 'uni', code)(requireLocal, module, module.exports, overrides.__uni)
  return module.exports
}
function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
async function until(predicate, message) {
  for (let turn = 0; turn < 100 && !predicate(); turn++) await Promise.resolve()
  assert.ok(predicate(), message)
}
const checks = []
const check = (name, fn) => checks.push({ name, fn })
const clientExports = loadModule('apps/merchant-miniapp/src/services/merchant-session.ts')
const { MerchantSessionClient, MerchantError, MERCHANT_SESSION_KEY, merchantErrorMessage } = clientExports
const urls = {
  login: '/store/passport/wechat/login',
  applicant: '/store/passport/applicant/identity',
  info: '/store/member/user/info',
  store: '/store/member/user',
  applicantRefresh: '/store/passport/applicant/refresh',
  applicantLogout: '/store/passport/applicant/logout',
  storeRefresh: '/store/passport/login/refresh',
  storeLogout: '/store/passport/login/logout',
}
const nowBaseline = 1792785600000
const apiBaseUrl = 'https://synthetic-merchant-api.invalid'
const memberId = '910000000000000001'
const storeId = '910000000000000002'
const clerkId = '910000000000000003'
const residentKey = 'daguanglu:resident:session:v1'
const residentValue = { marker: 'resident-session-must-survive' }
const success = (result) => ({ status: 200, data: { success: true, code: 200, message: 'SUCCESS', result, timestamp: nowBaseline } })
const failure = (message, status = 403) => ({ status, data: { success: false, code: status, message, result: null, timestamp: nowBaseline } })
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
function tokens(kind = 'APPLICANT', generation = 1, now = nowBaseline, sid = '1'.padStart(32, '0')) {
  const accessExpiresAt = now + 15 * 60 * 1000
  const absoluteExpiresAt = nowBaseline + (kind === 'STORE' ? 15 : 1) * 86400000
  const nonce = String.fromCharCode(65 + generation).repeat(43)
  const token = (use) => kind === 'APPLICANT'
    ? `s0o1.${sid}.${use}.${nonce}`
    : `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ iss: 'daguanglu-stage0-session', sv: 1, sid, domain: 'STORE', app: 'synthetic-merchant', use, gen: generation, sub: memberId, exp: Math.floor((use === 'ACCESS' ? accessExpiresAt : absoluteExpiresAt) / 1000) })}.${nonce}`
  return { sid, accessToken: token('ACCESS'), refreshToken: token('REFRESH'), accessExpiresAt, absoluteExpiresAt }
}
function fixture(options = {}) {
  let clock = nowBaseline
  let kind = options.kind ?? 'APPLICANT'
  let role = options.role ?? 'OWNER'
  let pair = options.tokens ?? tokens(kind)
  let generation = 1
  const calls = []
  const storageCalls = []
  const handlers = new Map()
  const map = new Map([[residentKey, structuredClone(residentValue)]])
  const storage = {
    get(key) { storageCalls.push({ action: 'get', key }); return map.get(key) },
    set(key, value) { storageCalls.push({ action: 'set', key }); map.set(key, structuredClone(value)) },
    remove(key) { storageCalls.push({ action: 'remove', key }); map.delete(key) },
  }
  const request = async (input) => {
    calls.push(structuredClone(input))
    if (handlers.has(input.path)) return handlers.get(input.path)(input)
    if (input.path === urls.login) return success({ memberId, identity: kind, role: kind === 'STORE' ? role : null, session: pair })
    if (input.path === urls.applicant) return success({ memberId, identity: 'APPLICANT', access: 'RESTRICTED', nextAction: 'SHOW_APPLICATION_ENTRY' })
    if (input.path === urls.info) return success({ memberId, identity: 'STORE', role, storeId, clerkId })
    if (input.path === urls.store) return success({ storeId, storeName: '合成门店', identity: 'STORE', role })
    if (input.path === urls.applicantRefresh || input.path === urls.storeRefresh) {
      pair = tokens(kind, ++generation, clock, pair.sid)
      return success(pair)
    }
    if (input.path === urls.applicantLogout || input.path === urls.storeLogout) return success(null)
    throw new Error('UNEXPECTED_OFFLINE_REQUEST')
  }
  const ports = { baseUrl: options.baseUrl ?? apiBaseUrl, now: () => clock, storage, request }
  const client = new MerchantSessionClient(ports)
  return {
    client, ports, calls, storageCalls, handlers, map,
    login: () => client.login(async () => 'synthetic-merchant-code'),
    advance: (ms) => { clock += ms },
    count: (url) => calls.filter((item) => item.path === url).length,
    setTokens: (value) => { pair = value },
    setKind: (value, nextRole = 'OWNER') => { kind = value; role = nextRole; pair = tokens(kind, ++generation, clock) },
    setRole: (value) => { role = value },
    pair: () => pair,
  }
}
const rejected = (promise, code) => assert.rejects(promise, (error) => error instanceof MerchantError && (!code || error.code === code))

check('anonymous restore never fabricates merchant identity or contacts an identity endpoint', async () => {
  const f = fixture()
  f.client.restore()
  assert.equal(f.client.authenticated, false)
  await rejected(f.client.identity())
  assert.equal(f.calls.length, 0)
  assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
  assert.deepEqual(f.map.get(residentKey), residentValue)
})

check('Merchant API configuration fails closed before obtaining a WeChat Code', async () => {
  for (const baseUrl of ['', 'http://localhost:18887', 'https://user:secret@synthetic.invalid', 'https://synthetic.invalid?token=value']) {
    const f = fixture({ baseUrl })
    let calls = 0
    await rejected(f.client.login(async () => { calls++; return 'synthetic-code' }), 'API_NOT_CONFIGURED')
    assert.equal(calls, 0)
    assert.equal(f.calls.length, 0)
    assert.equal(f.client.authenticated, false)
  }
})

check('Applicant Code login sends only loginCode and reads only its restricted identity', async () => {
  const f = fixture()
  const result = await f.login()
  assert.deepEqual(result, { memberId, identity: 'APPLICANT', access: 'RESTRICTED', nextAction: 'SHOW_APPLICATION_ENTRY' })
  assert.equal(f.client.authenticated, true)
  assert.deepEqual(f.calls.map((call) => [call.method, call.path]), [['POST', urls.login], ['GET', urls.applicant]])
  assert.deepEqual(f.calls[0].body, { loginCode: 'synthetic-merchant-code' })
  assert.equal(f.calls[0].accessToken, undefined)
  assert.equal(f.calls[1].accessToken, f.pair().accessToken)
  assert.equal(f.calls[1].accessToken.startsWith('Bearer '), false)
  assert.equal(Object.hasOwn(result, 'storeId'), false)
  assert.equal(Object.hasOwn(result, 'role'), false)
})

check('Owner and Staff display only a cross-checked current Backend Store identity', async () => {
  for (const role of ['OWNER', 'STAFF']) {
    const f = fixture({ kind: 'STORE', role })
    const current = await f.login()
    assert.deepEqual(current, { memberId, identity: 'STORE', role, storeId, storeName: '合成门店', clerkId })
    assert.equal(f.count(urls.info), 1)
    assert.equal(f.count(urls.store), 1)
    assert.equal(f.count(urls.applicant), 0)
    for (const call of f.calls.filter((call) => call.method === 'GET')) {
      assert.equal(call.body, undefined)
      assert.equal(call.path.includes('?'), false)
    }
  }
})

check('login rejects unsupported identities and local role injection without querying a Store', async () => {
  for (const identity of ['RESIDENT', 'MANAGER', 'OWNER', '', null]) {
    const f = fixture()
    f.handlers.set(urls.login, () => success({ memberId, identity, role: 'OWNER', session: tokens() }))
    await rejected(f.login())
    assert.equal(f.calls.length, 1)
    assert.equal(f.client.authenticated, false)
  }
})

check('Applicant opaque credentials bind the exact sid and purpose and never accept a Store JWT', async () => {
  const valid = tokens()
  const mutations = [
    { ...valid, accessToken: tokens('STORE').accessToken },
    { ...valid, accessToken: valid.refreshToken },
    { ...valid, refreshToken: valid.accessToken },
    { ...valid, accessToken: valid.accessToken.replace(valid.sid, '2'.padStart(32, '0')) },
    { ...valid, accessToken: 's0o1.invalid.ACCESS.short' },
  ]
  for (const pair of mutations) {
    const f = fixture({ tokens: pair })
    await rejected(f.login())
    assert.equal(f.count(urls.applicant), 0)
    assert.equal(f.client.authenticated, false)
  }
})

check('invalid session lifetimes or equal credentials never persist a login', async () => {
  const valid = tokens()
  for (const pair of [
    { ...valid, refreshToken: valid.accessToken },
    { ...valid, absoluteExpiresAt: nowBaseline },
    { ...valid, accessExpiresAt: valid.absoluteExpiresAt + 1 },
    { ...valid, sid: '../unsafe' },
  ]) {
    const f = fixture({ tokens: pair })
    await rejected(f.login())
    assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
    assert.equal(f.client.authenticated, false)
  }
})

check('mismatched Store/member/role/Clerk reads never produce a trusted Store context', async () => {
  for (const fault of ['member', 'store', 'role', 'identity', 'clerk', 'name', 'login-role']) {
    const f = fixture({ kind: 'STORE' })
    if (fault === 'member') f.handlers.set(urls.info, () => success({ memberId: '910000000000000009', identity: 'STORE', role: 'OWNER', storeId, clerkId }))
    if (fault === 'store') f.handlers.set(urls.store, () => success({ storeId: '910000000000000009', storeName: '他店', identity: 'STORE', role: 'OWNER' }))
    if (fault === 'role') f.handlers.set(urls.store, () => success({ storeId, storeName: '合成门店', identity: 'STORE', role: 'STAFF' }))
    if (fault === 'identity') f.handlers.set(urls.info, () => success({ memberId, identity: 'APPLICANT', role: 'OWNER', storeId, clerkId }))
    if (fault === 'clerk') f.handlers.set(urls.info, () => success({ memberId, identity: 'STORE', role: 'OWNER', storeId, clerkId: '' }))
    if (fault === 'name') f.handlers.set(urls.store, () => success({ storeId, storeName: '', identity: 'STORE', role: 'OWNER' }))
    if (fault === 'login-role') f.handlers.set(urls.login, () => success({ memberId, identity: 'STORE', role: 'STAFF', session: tokens('STORE') }))
    await rejected(f.login())
    assert.equal(f.client.authenticated, false)
  }
})

check('failed Applicant identity verification is never treated as normal no-store status', async () => {
  for (const code of ['DATA_UNAVAILABLE', 'RELATION_CONFLICT', 'DENIED', 'PROOF_SOURCE_PENDING']) {
    const f = fixture()
    f.handlers.set(urls.applicant, () => failure(code, code === 'RELATION_CONFLICT' ? 409 : code === 'DENIED' ? 403 : 503))
    await rejected(f.login(), code)
    assert.equal(f.client.authenticated, false)
    assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
    assert.equal(f.count(urls.info), 0)
  }
})

check('Backend failure codes have safe Chinese messages without echoing private response text', async () => {
  for (const code of ['CONFIG_REQUIRED', 'B04_PENDING', 'DATA_UNAVAILABLE', 'PROOF_SOURCE_PENDING', 'RELATION_CONFLICT', 'DENIED', 'SESSION_REJECTED', 'WECHAT_REJECTED', 'LOGIN_UNAVAILABLE', 'SESSION_UNAVAILABLE']) {
    const f = fixture()
    f.handlers.set(urls.login, () => failure(code, code === 'RELATION_CONFLICT' ? 409 : 503))
    let error
    try { await f.login() } catch (caught) { error = caught }
    assert.ok(error instanceof MerchantError)
    assert.equal(error.code, code)
    assert.match(merchantErrorMessage(error), /[\u4e00-\u9fff]/)
    assert.equal(merchantErrorMessage(error).includes('SELECT'), false)
    assert.equal(f.client.authenticated, false)
  }
  const f = fixture()
  f.handlers.set(urls.login, () => failure('SELECT private_identifier FROM private_table', 500))
  await assert.rejects(f.login(), (error) => !String(error.message).includes('private_identifier'))
})

check('cache restoration is scoped to the Merchant API and cannot consume a Resident session', async () => {
  for (const mutation of ['api', 'domain']) {
    const f = fixture()
    await f.login()
    const saved = structuredClone(f.map.get(MERCHANT_SESSION_KEY))
    if (mutation === 'api') saved.apiBaseUrl = 'https://another.invalid'
    else saved.identity = 'RESIDENT'
    f.map.set(MERCHANT_SESSION_KEY, saved)
    const restored = new MerchantSessionClient(f.ports)
    try { restored.restore() } catch (error) { assert.ok(error instanceof MerchantError) }
    assert.equal(restored.authenticated, false)
    assert.deepEqual(f.map.get(residentKey), residentValue)
  }
})

check('cached Owner or fake Store fields cannot override a current Staff Backend read', async () => {
  const f = fixture({ kind: 'STORE', role: 'STAFF' })
  await f.login()
  const saved = structuredClone(f.map.get(MERCHANT_SESSION_KEY))
  saved.role = 'OWNER'
  saved.storeId = '910000000000000009'
  saved.clerkId = '910000000000000009'
  saved.storeName = '不可信缓存门店'
  f.map.set(MERCHANT_SESSION_KEY, saved)
  const restored = new MerchantSessionClient(f.ports)
  const before = f.calls.length
  restored.restore()
  assert.equal(f.calls.length, before, 'restoration itself is not a Backend authorization proof')
  const current = await restored.identity()
  assert.equal(current.role, 'STAFF')
  assert.equal(current.storeId, storeId)
  assert.equal(current.clerkId, clerkId)
  assert.equal(current.storeName, '合成门店')
})

check('current role changes are adopted from two matching reads rather than a stale login role', async () => {
  const f = fixture({ kind: 'STORE', role: 'OWNER' })
  await f.login()
  f.setRole('STAFF')
  const current = await f.client.identity()
  assert.equal(current.role, 'STAFF')
})

check('Applicant and Store refresh use their own POST routes and body-only Refresh credentials', async () => {
  for (const kind of ['APPLICANT', 'STORE']) {
    const f = fixture({ kind })
    await f.login()
    const previous = f.pair()
    f.advance(15 * 60 * 1000)
    await f.client.identity()
    const route = kind === 'APPLICANT' ? urls.applicantRefresh : urls.storeRefresh
    const refresh = f.calls.filter((call) => call.path === route)
    assert.equal(refresh.length, 1)
    assert.equal(refresh[0].method, 'POST')
    assert.deepEqual(refresh[0].body, { refreshToken: previous.refreshToken })
    assert.equal(refresh[0].accessToken, undefined)
    assert.equal(f.count(kind === 'APPLICANT' ? urls.storeRefresh : urls.applicantRefresh), 0)
    assert.equal(f.map.get(MERCHANT_SESSION_KEY).identity, kind)
  }
})

check('concurrent identity reads coordinate one Refresh and never restore consumed credentials', async () => {
  const f = fixture()
  await f.login()
  const previous = f.pair()
  const gate = deferred()
  f.handlers.set(urls.applicantRefresh, () => gate.promise)
  f.advance(15 * 60 * 1000)
  const calls = [f.client.identity(), f.client.identity(), f.client.identity()]
  await until(() => f.count(urls.applicantRefresh) === 1, 'one Refresh must be in flight')
  const renewed = tokens('APPLICANT', 2, nowBaseline + 15 * 60 * 1000, previous.sid)
  gate.resolve(success(renewed))
  const outcomes = await Promise.allSettled(calls)
  assert.ok(outcomes.some((outcome) => outcome.status === 'fulfilled'))
  for (const outcome of outcomes) {
    if (outcome.status === 'rejected') assert.equal(outcome.reason.code, 'STALE_OPERATION')
  }
  assert.equal(f.count(urls.applicantRefresh), 1)
  const saved = f.map.get(MERCHANT_SESSION_KEY).session
  assert.equal(saved.accessToken, renewed.accessToken)
  assert.equal(saved.refreshToken, renewed.refreshToken)
})

check('lost Refresh response is not replayed and requires a new login', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.applicantRefresh, () => { throw new Error('synthetic-network-loss') })
  f.advance(15 * 60 * 1000)
  await rejected(f.client.identity())
  assert.equal(f.count(urls.applicantRefresh), 1)
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
})

check('Refresh persistence failure reports storage failure and clears only Merchant credentials', async () => {
  const f = fixture()
  await f.login()
  f.ports.storage.set = () => { throw new Error('synthetic-storage-failure') }
  f.advance(15 * 60 * 1000)
  await rejected(f.client.identity(), 'STORAGE_UNAVAILABLE')
  assert.equal(f.count(urls.applicantRefresh), 1)
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
  assert.deepEqual(f.map.get(residentKey), residentValue)
})

check('GET authorization expiry performs at most one safe Refresh and reread', async () => {
  const f = fixture()
  await f.login()
  let reads = 0
  f.handlers.set(urls.applicant, () => ++reads === 1 ? failure('SESSION_REJECTED') : success({ memberId, identity: 'APPLICANT', access: 'RESTRICTED', nextAction: 'SHOW_APPLICATION_ENTRY' }))
  await f.client.identity()
  assert.equal(reads, 2)
  assert.equal(f.count(urls.applicantRefresh), 1)
})

check('failed GET retry cannot loop or return a previously authorized Store', async () => {
  const f = fixture({ kind: 'STORE' })
  await f.login()
  f.handlers.set(urls.info, () => failure('SESSION_REJECTED'))
  await rejected(f.client.identity())
  assert.equal(f.count(urls.storeRefresh), 1)
  assert.equal(f.client.authenticated, false)
})

check('logout clears Merchant locally first and preserves the Resident session', async () => {
  for (const kind of ['APPLICANT', 'STORE']) {
    const f = fixture({ kind })
    await f.login()
    const gate = deferred()
    const route = kind === 'APPLICANT' ? urls.applicantLogout : urls.storeLogout
    f.handlers.set(route, () => gate.promise)
    const pending = f.client.logout()
    assert.equal(f.client.authenticated, false)
    assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
    assert.deepEqual(f.map.get(residentKey), residentValue)
    await until(() => f.count(route) === 1, 'current-domain logout should be sent once')
    gate.resolve(success(null))
    assert.deepEqual(await pending, { confirmed: true })
    assert.equal(f.count(kind === 'APPLICANT' ? urls.storeLogout : urls.applicantLogout), 0)
  }
})

check('uncertain logout reports the uncertainty without automatically replaying its POST', async () => {
  const f = fixture()
  await f.login()
  f.handlers.set(urls.applicantLogout, () => { throw new Error('synthetic-timeout') })
  assert.deepEqual(await f.client.logout(), { confirmed: false })
  assert.equal(f.count(urls.applicantLogout), 1)
  assert.equal(f.count(urls.applicantRefresh), 0)
  assert.equal(f.client.authenticated, false)
})

check('a late WeChat Code cannot revive a logged-out client', async () => {
  const f = fixture()
  const code = deferred()
  const pending = f.client.login(() => code.promise)
  await f.client.logout()
  code.resolve('synthetic-late-code')
  await rejected(pending, 'STALE_OPERATION')
  assert.equal(f.calls.length, 0)
  assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
})

check('a late login response cannot revive a logged-out client', async () => {
  const f = fixture()
  const response = deferred()
  f.handlers.set(urls.login, () => response.promise)
  const pending = f.login()
  await until(() => f.count(urls.login) === 1, 'login request must be pending')
  await f.client.logout()
  response.resolve(success({ memberId, identity: 'APPLICANT', role: null, session: tokens() }))
  await rejected(pending, 'STALE_OPERATION')
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
})

check('a late Refresh cannot revive a session after local logout', async () => {
  const f = fixture()
  await f.login()
  f.advance(15 * 60 * 1000)
  const response = deferred()
  f.handlers.set(urls.applicantRefresh, () => response.promise)
  const pending = f.client.identity()
  await until(() => f.count(urls.applicantRefresh) === 1, 'Refresh must be pending')
  await f.client.logout()
  response.resolve(success(tokens('APPLICANT', 2, nowBaseline + 15 * 60 * 1000)))
  await rejected(pending, 'STALE_OPERATION')
  assert.equal(f.client.authenticated, false)
  assert.equal(f.map.has(MERCHANT_SESSION_KEY), false)
})

check('new login never reuses an old Store and late failure cannot clear the new identity', async () => {
  const f = fixture({ kind: 'STORE' })
  await f.login()
  const stale = deferred()
  f.handlers.set(urls.info, () => stale.promise)
  const oldRead = f.client.identity()
  await until(() => f.count(urls.info) === 2, 'old Store read is pending')
  f.setKind('APPLICANT')
  const current = await f.login()
  assert.equal(current.identity, 'APPLICANT')
  stale.resolve(failure('SESSION_REJECTED'))
  await rejected(oldRead, 'STALE_OPERATION')
  assert.equal(f.client.authenticated, true)
  assert.equal(f.map.get(MERCHANT_SESSION_KEY).identity, 'APPLICANT')
})

check('storage operations are Merchant-only and never retain Code or AppSecret fields', async () => {
  const f = fixture()
  await f.login()
  const saved = f.map.get(MERCHANT_SESSION_KEY)
  const text = JSON.stringify(saved)
  for (const secret of ['synthetic-merchant-code', 'appSecret', 'session_key', 'openId']) assert.equal(text.includes(secret), false)
  await f.client.logout()
  assert.ok(f.storageCalls.every((call) => call.key === MERCHANT_SESSION_KEY))
  assert.deepEqual(f.map.get(residentKey), residentValue)
})

check('existing four Merchant tabs and registered business assets are preserved', () => {
  const navigation = source('apps/merchant-miniapp/src/config/navigation.ts')
  assert.deepEqual([...navigation.matchAll(/label:\s*'([^']+)'/g)].map((entry) => entry[1]), ['工作台', '经营', '订单', '我的'])
  const pages = JSON.parse(source('apps/merchant-miniapp/src/pages.json')).pages.map((entry) => entry.path)
  for (const page of ['pages/workbench/index', 'pages/operation/index', 'pages/order/index', 'pages/profile/index', 'pages/onboarding/application/index', 'pages/product/editor/index']) assert.ok(pages.includes(page))
  const protectedFiles = JSON.parse(source('.npm-cache/p06/evidence/protected20-start.json'))
  assert.equal(protectedFiles.length, 20)
})

check('the client sends only Stage 0 identity and Session routes and no business writes', async () => {
  const f = fixture({ kind: 'STORE' })
  await f.login()
  f.advance(15 * 60 * 1000)
  await f.client.identity()
  await f.client.logout()
  const allowed = new Set(Object.values(urls))
  assert.ok(f.calls.every((call) => allowed.has(call.path)))
  assert.ok(f.calls.filter((call) => call.method === 'POST').every((call) => [urls.login, urls.storeRefresh, urls.storeLogout].includes(call.path)))
  assert.equal(f.calls.some((call) => call.path.startsWith('/buyer/')), false)
})

function platformModule(environment, uni) {
  const file = 'apps/merchant-miniapp/src/services/merchant-platform.ts'
  // Test-only substitution of Vite's public compile-time environment; no source/runtime config is changed.
  const code = source(file)
    .replaceAll('import.meta.env', `(${JSON.stringify(environment)})`)
    .replaceAll('process.env.UNI_PLATFORM', JSON.stringify(environment.UNI_PLATFORM))
  return loadModule(file, { './merchant-session': clientExports, __uni: uni }, code)
}

check('the real Merchant platform adapter calls uni.login and sends only Merchant HTTP contracts', async () => {
  const calls = { login: [], request: [] }
  const storage = new Map([[residentKey, structuredClone(residentValue)]])
  const now = Date.now()
  const fresh = { ...tokens('APPLICANT', 7, now), absoluteExpiresAt: now + 86400000 }
  const platform = platformModule({ UNI_PLATFORM: 'mp-weixin', VITE_MERCHANT_API_BASE_URL: `${apiBaseUrl}/` }, {
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, structuredClone(value)),
    removeStorageSync: (key) => storage.delete(key),
    login: (options) => { calls.login.push(options); options.success({ code: 'synthetic-platform-merchant-code' }) },
    request: (options) => {
      calls.request.push(options)
      let result
      if (options.url === apiBaseUrl + urls.login) result = { memberId, identity: 'APPLICANT', role: null, session: fresh }
      else if (options.url === apiBaseUrl + urls.applicant) result = { memberId, identity: 'APPLICANT', access: 'RESTRICTED', nextAction: 'SHOW_APPLICATION_ENTRY' }
      else if (options.url === apiBaseUrl + urls.applicantLogout) result = null
      else throw new Error('UNEXPECTED_OFFLINE_PLATFORM_REQUEST')
      options.success({ statusCode: 200, data: success(result).data })
    },
  })
  const client = platform.createMerchantClient()
  await client.login(platform.merchantLoginCode)
  assert.equal(platform.isWechat, true)
  assert.equal(calls.login.length, 1)
  assert.equal(calls.login[0].provider, 'weixin')
  assert.equal(calls.request[0].url, apiBaseUrl + urls.login)
  assert.equal(calls.request[0].method, 'POST')
  assert.deepEqual(calls.request[0].data, { loginCode: 'synthetic-platform-merchant-code' })
  assert.deepEqual(calls.request[0].header, { 'Content-Type': 'application/json' })
  assert.equal(calls.request[1].method, 'GET')
  assert.equal(calls.request[1].header.accessToken, fresh.accessToken)
  assert.equal(calls.request[1].header.accessToken.startsWith('Bearer '), false)
  assert.equal(calls.request[1].header.Authorization, undefined)
  assert.deepEqual(await client.logout(), { confirmed: true })
  assert.equal(calls.request[2].url, apiBaseUrl + urls.applicantLogout)
  assert.equal(calls.request[2].method, 'POST')
  assert.equal(calls.request[2].header.accessToken, fresh.accessToken)
  assert.ok(calls.request.every((request) => request.url.startsWith(apiBaseUrl + '/store/')))
  assert.equal(storage.has(MERCHANT_SESSION_KEY), false)
  assert.deepEqual(storage.get(residentKey), residentValue)
})

check('the real H5 or unconfigured platform cannot simulate WeChat login or choose a fallback API', async () => {
  let loginCalls = 0
  let requestCalls = 0
  const fakeUni = {
    getStorageSync() {}, setStorageSync() {}, removeStorageSync() {},
    login() { loginCalls++ }, request() { requestCalls++ },
  }
  const h5 = platformModule({ UNI_PLATFORM: 'h5', VITE_MERCHANT_API_BASE_URL: apiBaseUrl }, fakeUni)
  assert.equal(h5.isWechat, false)
  await rejected(h5.merchantLoginCode(), 'WECHAT_UNAVAILABLE')
  await rejected(h5.createMerchantClient().login(h5.merchantLoginCode), 'WECHAT_UNAVAILABLE')
  const unconfigured = platformModule({ UNI_PLATFORM: 'mp-weixin', VITE_MERCHANT_API_BASE_URL: '' }, fakeUni)
  await rejected(unconfigured.createMerchantClient().login(unconfigured.merchantLoginCode), 'API_NOT_CONFIGURED')
  assert.equal(loginCalls, 0)
  assert.equal(requestCalls, 0)
})

// Execute the real reactive context with a test-only client. No production Mock provider is installed.
const applicantContext = () => ({ memberId, identity: 'APPLICANT', access: 'RESTRICTED', nextAction: 'SHOW_APPLICATION_ENTRY' })
const storeContext = (role = 'OWNER') => ({ memberId, identity: 'STORE', role, storeId, storeName: '合成门店', clerkId })
const noBusinessPermissions = { canView: false, canCreate: false, canEdit: false, canDisable: false, canTransferOwner: false }
function contextFixture(options = {}) {
  let revision = 0
  let authenticated = options.restored ?? false
  let current = options.current ?? applicantContext()
  let restoreCalls = 0
  const pending = { identity: null, login: null }
  const client = {
    get authenticated() { return authenticated },
    get revision() { return revision },
    restore() { restoreCalls++ },
    async identity() { return pending.identity ? pending.identity() : structuredClone(current) },
    async login(getCode) {
      revision++
      authenticated = false
      await getCode()
      const value = pending.login ? await pending.login() : structuredClone(current)
      authenticated = true
      return value
    },
    async logout() { revision++; authenticated = false; return { confirmed: true } },
  }
  const exports = loadModule('apps/merchant-miniapp/src/stores/merchant-context.ts', {
    '../services/merchant-session': { MerchantError, merchantErrorMessage },
    '../services/merchant-platform': {
      createMerchantClient: () => client,
      isWechat: true,
      merchantLoginCode: async () => 'synthetic-context-code',
    },
  })
  const context = exports.useMerchantContext()
  return { context, exports, client, pending, restoreCalls: () => restoreCalls, setCurrent: (value) => { current = value } }
}

check('production merchant context initialization creates no Mock operator, staff or Store', () => {
  const f = contextFixture()
  f.exports.initializeMerchantContext()
  assert.equal(f.restoreCalls(), 1)
  assert.equal(f.context.state.authenticated, false)
  assert.equal(f.context.state.identity, null)
  assert.equal(f.context.currentOperator.value, null)
  assert.equal(f.context.currentOperatorApplication.value, null)
  assert.equal(f.context.currentStore.value, null)
  assert.equal(f.context.currentMerchantStaff.value, null)
  assert.deepEqual(f.context.permissions.value, noBusinessPermissions)
})

check('Applicant context never exposes a Mock Store or Stage 1 operating permissions', async () => {
  const f = contextFixture()
  await f.context.loginMerchant()
  assert.equal(f.context.state.identity.identity, 'APPLICANT')
  assert.equal(f.context.currentStore.value, null)
  assert.equal(f.context.currentMerchantStaff.value, null)
  assert.equal(f.context.currentOperatorApplication.value, null)
  assert.deepEqual(f.context.permissions.value, noBusinessPermissions)
})

check('verified Owner and Staff context displays Backend identity without enabling business writes', async () => {
  for (const role of ['OWNER', 'STAFF']) {
    const f = contextFixture({ current: storeContext(role) })
    await f.context.loginMerchant()
    assert.equal(f.context.state.identity.role, role)
    assert.deepEqual(f.context.currentStore.value, { id: storeId, name: '合成门店' })
    assert.equal(f.context.currentMerchantStaff.value.id, clerkId)
    assert.equal(f.context.currentMerchantStaff.value.role, role)
    assert.deepEqual(f.context.permissions.value, noBusinessPermissions)
  }
})

check('a failed identity reread clears a displayed Store instead of presenting normal Applicant', async () => {
  const f = contextFixture({ current: storeContext() })
  await f.context.loginMerchant()
  f.pending.identity = () => { throw new MerchantError('DATA_UNAVAILABLE', 503) }
  await f.context.loadIdentity()
  assert.equal(f.context.state.identity, null)
  assert.equal(f.context.currentStore.value, null)
  assert.equal(f.context.currentMerchantStaff.value, null)
  assert.equal(f.context.state.authenticated, false)
  assert.equal(f.context.state.errorCode, 'DATA_UNAVAILABLE')
  assert.match(f.context.state.error, /[\u4e00-\u9fff]/)
})

check('late context reads cannot restore Store after logout or overwrite a newer Staff read', async () => {
  const f = contextFixture({ restored: true, current: storeContext() })
  const old = deferred()
  f.pending.identity = () => old.promise
  const oldRead = f.context.loadIdentity()
  await f.context.logout()
  old.resolve(storeContext())
  await oldRead
  assert.equal(f.context.state.identity, null)
  assert.equal(f.context.currentStore.value, null)
  const newer = contextFixture({ restored: true })
  const first = deferred()
  newer.pending.identity = () => first.promise
  const firstRead = newer.context.loadIdentity()
  newer.setCurrent(storeContext('STAFF'))
  await newer.context.loginMerchant()
  first.resolve(storeContext('OWNER'))
  await firstRead
  assert.equal(newer.context.state.identity.role, 'STAFF')
})

check('concurrent context reads share one identity flight without duplicate requests', async () => {
  const f = contextFixture({ restored: true })
  const pending = deferred()
  let reads = 0
  f.pending.identity = () => { reads++; return pending.promise }
  const one = f.context.loadIdentity()
  const two = f.context.loadIdentity()
  const three = f.context.loadIdentity()
  await until(() => reads === 1, 'the shared identity read starts in its scheduled microtask')
  assert.equal(reads, 1)
  assert.equal(one, two)
  assert.equal(two, three)
  pending.resolve(storeContext('STAFF'))
  await Promise.all([one, two, three])
  assert.equal(f.context.state.identity.role, 'STAFF')
})

check('profile and workbench no longer load operational Mock data as an authenticated identity', () => {
  for (const page of ['profile', 'workbench']) {
    const contents = source(`apps/merchant-miniapp/src/pages/${page}/index.vue`)
    assert.equal(/import[\s\S]*?from\s+['"]@\/services\/supply['"]/.test(contents), false)
    assert.equal(contents.includes('MerchantOrderDemoPanel'), false)
  }
  const context = source('apps/merchant-miniapp/src/stores/merchant-context.ts')
  for (const value of ['application-001', 'operator-linli', 'store-daguanglu', 'staff-owner']) assert.equal(context.includes(value), false)
})

check('only the two identity pages remain safe through direct links with query or fragment values', () => {
  const guards = loadModule('apps/merchant-miniapp/src/services/merchant-route-guard.ts')
  for (const page of ['pages/profile/index', '/pages/profile/index', 'pages/workbench/index', '/pages/workbench/index']) {
    for (const suffix of ['', '?source=link', '#return', '?source=link#return']) {
      assert.equal(guards.merchantIdentityPage(page + suffix), true)
      assert.equal(guards.merchantPagePath(page + suffix), page.startsWith('/') ? page : `/${page}`)
    }
  }
  assert.equal(guards.merchantIdentityPage('/pages/profile/basic/index'), false)
})

check('every existing business deep link and unsafe or unknown path stays restricted', () => {
  const guards = loadModule('apps/merchant-miniapp/src/services/merchant-route-guard.ts')
  const pages = JSON.parse(source('apps/merchant-miniapp/src/pages.json')).pages.map((entry) => `/${entry.path}`)
  const restricted = pages.filter((page) => !['/pages/profile/index', '/pages/workbench/index'].includes(page))
  assert.equal(restricted.length, 18)
  for (const page of restricted) {
    assert.equal(guards.merchantIdentityPage(page), false)
    assert.equal(guards.merchantIdentityPage(`${page}?storeId=910000000000000009`), false)
  }
  for (const invalid of [undefined, null, {}, '', '/pages/not-registered/index', '/pages/profile/index/extra', '../pages/profile/index', 'https://synthetic.invalid/pages/profile/index', '/pages/../profile/index', '\\pages\\profile\\index', '/pages/profile/%69ndex']) {
    assert.equal(guards.merchantIdentityPage(invalid), false)
  }
})

check('restricted pages retain the original four-tab destinations without granting operating access', () => {
  const guards = loadModule('apps/merchant-miniapp/src/services/merchant-route-guard.ts')
  for (const tab of ['/pages/workbench/index', '/pages/operation/index', '/pages/order/index', '/pages/profile/index']) {
    assert.equal(guards.merchantTabPath(`${tab}?source=test`), tab)
  }
  assert.equal(guards.merchantTabPath('/pages/onboarding/application/index'), '/pages/profile/index')
  assert.equal(guards.merchantRestrictedTitle('/pages/onboarding/application/index'), '申请开店')
  assert.equal(guards.merchantRestrictedTitle('/pages/order/index'), '订单')
})

check('the actual local AppPage entry delegates every slot to the guarded Merchant wrapper', () => {
  const bridge = source('apps/merchant-miniapp/src/components/AppPage.vue')
  assert.match(bridge, /import MerchantAppPage from ['"]\.\/MerchantAppPage\.vue['"]/)
  const template = bridge.match(/<template>([\s\S]*)<\/template>/)?.[1]?.trim()
  assert.ok(template)
  assert.match(template, /^<MerchantAppPage\b/)
  assert.match(template, /<\/MerchantAppPage>$/)
  assert.equal((template.match(/<MerchantAppPage\b/g) || []).length, 1)
  assert.equal((template.match(/<\/MerchantAppPage>/g) || []).length, 1)
  assert.equal(bridge.includes('class="app-page"'), false, 'the unguarded local implementation must not remain')
  const wrapper = source('apps/merchant-miniapp/src/components/MerchantAppPage.vue')
  assert.match(wrapper, /merchantOwnPagePath\(component\)/)
  assert.doesNotMatch(wrapper, /getCurrentPages\s*\(/)
  const guarded = wrapper.match(/<SharedAppPage v-if="identityPage"[\s\S]*?<\/SharedAppPage>/)?.[0]
  const restricted = wrapper.match(/<SharedAppPage v-else[\s\S]*?<\/SharedAppPage>/)?.[0]
  assert.ok(guarded?.includes('<slot />'))
  assert.ok(restricted?.includes('经营功能尚未开放'))
  assert.equal(restricted?.includes('<slot'), false, 'restricted branch must not render page business slots')
})

check('own Mini Program and H5 page metadata is authoritative rather than the foreground page stack', () => {
  const guards = loadModule('apps/merchant-miniapp/src/services/merchant-route-guard.ts')
  const previous = globalThis.getCurrentPages
  let globalReads = 0
  globalThis.getCurrentPages = () => { globalReads++; return [{ route: 'pages/profile/index' }] }
  try {
    const protectedOwner = { proxy: { $mpType: 'page', $scope: { route: 'pages/order/index' } } }
    const component = { proxy: { $mpType: 'component' }, parent: protectedOwner }
    assert.equal(guards.merchantOwnPagePath(component), '/pages/order/index')
    assert.equal(guards.merchantIdentityPage(guards.merchantOwnPagePath(component)), false)
    const h5Page = { proxy: { $mpType: 'page', route: 'pages/profile/index', $page: { fullPath: '/pages/profile/index?source=h5' } } }
    assert.equal(guards.merchantOwnPagePath({ parent: h5Page }), '/pages/profile/index')
    assert.equal(guards.merchantOwnPagePath({ $pageInstance: h5Page }), '/pages/profile/index')
    assert.equal(guards.merchantOwnPagePath({ root: h5Page }), '/pages/profile/index')
    const scopePage = { ctx: { $mpType: 'page', $scope: { $page: { fullPath: '/pages/workbench/index?source=scope' } } } }
    assert.equal(guards.merchantOwnPagePath({ parent: scopePage }), '/pages/workbench/index')
    assert.equal(globalReads, 0)
  } finally {
    if (previous === undefined) delete globalThis.getCurrentPages
    else globalThis.getCurrentPages = previous
  }
})

check('missing, uninitialized or cyclic owner metadata never borrows a safe route', () => {
  const guards = loadModule('apps/merchant-miniapp/src/services/merchant-route-guard.ts')
  const cycle = { proxy: { $mpType: 'component' } }
  cycle.parent = cycle
  for (const unknown of [null, undefined, {}, 'pages/profile/index', cycle,
    { proxy: { $mpType: 'component', route: 'pages/profile/index' } },
    { proxy: { $mpType: 'page' }, root: { proxy: { $mpType: 'page', route: 'pages/profile/index' } } },
    { parent: { proxy: { $mpType: 'page', $scope: { route: 'https://synthetic.invalid/pages/profile/index' } } } },
  ]) {
    assert.equal(guards.merchantOwnPagePath(unknown), '')
    assert.equal(guards.merchantIdentityPage(guards.merchantOwnPagePath(unknown)), false)
  }
})

let failed = 0
for (const { name, fn } of checks) {
  let timeout
  try {
    await Promise.race([
      Promise.resolve().then(fn),
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error('OFFLINE_CHECK_TIMEOUT')), 5000)
      }),
    ])
    console.log(`PASS ${name}`)
  } catch (error) {
    failed++
    // Never dump assertion operands, responses, synthetic Code or token values.
    const location = String(error?.stack || '').split('\n').find((line) => line.includes('p06-merchant-session.test.mjs:'))?.trim() || ''
    console.error(`FAIL ${name} (${error?.name || 'Error'}) ${location}`)
  } finally { clearTimeout(timeout) }
}
console.log(`P06 offline merchant checks: ${checks.length - failed}/${checks.length} PASS; ${failed} failed. Synthetic ports only; no real channel, API or device evidence.`)
if (failed) process.exitCode = 1
