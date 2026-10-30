import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
const root = path.resolve(import.meta.dirname, '..')
const require = createRequire(path.join(root, 'package.json'))
const ts = require('typescript')
const source = fs.readFileSync(path.join(root, 'apps/resident-miniapp/src/services/resident-session.ts'), 'utf8')
const module = { exports: {} }
new Function('module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(module, module.exports)
const { ResidentSessionClient } = module.exports
function fixture() {
  let now = 1000000
  let sequence = 0
  const calls = [], storage = new Map([['daguanglu:resident:session:v1', 'protected-stage1']])
  const profile = { memberId: '101', nickname: null, avatar: null, maskedMobile: null, phoneBound: false, version: 0, updatedAt: null }
  const tokens = () => ({ sid: 'a'.repeat(32), accessToken: `aaa.bbb.access${++sequence}`, refreshToken: `aaa.bbb.refresh${sequence}`, accessExpiresAt: now + 100000, absoluteExpiresAt: 999999999 })
  let current = tokens()
  let handler = async input => {
    if (input.path.endsWith('/login')) return { status: 200, data: { success: true, code: 200, result: { identity: 'RESIDENT', memberId: '101', session: current } } }
    if (input.path.endsWith('/refresh')) { current = tokens(); return { status: 200, data: { success: true, code: 200, result: current } } }
    if (input.path === '/buyer/passport/member') return { status: 200, data: { success: true, code: 200, result: profile } }
    return { status: 200, data: { success: true, code: 'SUCCESS', result: { owned: true } } }
  }
  let download = async () => ({ status: 200, filePath: 's2-owned-temp-image' })
  const client = new ResidentSessionClient({ baseUrl: 'https://s2.test.invalid/api', storageKey: 's2-owned', now: () => now, download: input => { calls.push({ ...input, asset: true }); return download(input) }, storage: { get: key => storage.get(key), set: (key, value) => storage.set(key, value), remove: key => storage.delete(key) }, request: async input => { calls.push(input); return handler(input) } })
  return { client, calls, storage, setDownload: next => { download = next }, advance: () => { now += 97000 }, set: next => { const previous = handler; handler = input => next(input, previous) } }
}
test('business reads use the existing verified session and preserve Stage1 storage', async () => {
  const f = fixture(); await f.client.login(async () => 'fresh_code')
  const r = await f.client.business('/buyer/p0/s2/cart', 'GET')
  assert.equal(r.data.code, 'SUCCESS'); assert.equal(f.storage.get('daguanglu:resident:session:v1'), 'protected-stage1')
  assert.ok(f.calls.at(-1).accessToken); assert.equal(f.calls.at(-1).path, '/buyer/p0/s2/cart')
})
test('concurrent business reads keep refresh single-flight', async () => {
  const f = fixture(); await f.client.login(async () => 'fresh_code'); f.advance()
  await Promise.all([f.client.business('/buyer/p0/s2/cart', 'GET'), f.client.business('/buyer/p0/s2/addresses', 'GET')])
  assert.equal(f.calls.filter(x => x.path.endsWith('/refresh')).length, 1)
})
test('an ambiguous business write is never automatically replayed', async () => {
  const f = fixture(); await f.client.login(async () => 'fresh_code')
  f.set((input, previous) => input.path === '/buyer/p0/s2/cart/items' ? Promise.reject(new Error('connection lost')) : previous(input))
  await assert.rejects(f.client.business('/buyer/p0/s2/cart/items', 'POST', { operationId: 'original_123', skuId: '1', quantity: 1 }), e => e.code === 'WRITE_RESULT_UNKNOWN')
  assert.equal(f.calls.filter(x => x.path === '/buyer/p0/s2/cart/items').length, 1)
})
test('logout invalidates an in-flight private response and clears only the S2 namespace', async () => {
  const f = fixture(); await f.client.login(async () => 'fresh_code'); let finish
  f.set((input, previous) => input.path === '/buyer/p0/s2/cart' ? new Promise(resolve => { finish = resolve }) : previous(input))
  const pending = f.client.business('/buyer/p0/s2/cart', 'GET'); await new Promise(resolve => setImmediate(resolve)); await f.client.logout()
  finish({ status: 200, data: { success: true, code: 'SUCCESS', result: { private: true } } })
  await assert.rejects(pending, e => e.code === 'STALE_OPERATION'); assert.equal(f.storage.get('daguanglu:resident:session:v1'), 'protected-stage1'); assert.equal(f.storage.has('s2-owned'), false)
})
test('business transport rejects arbitrary origins and path encodings before sending', async () => {
  const f = fixture(); await f.client.login(async () => 'fresh_code'); const count = f.calls.length
  for (const path of ['https://foreign.invalid', '/buyer/p0/s2/../member', '/buyer/p0/s2/%63art', '/buyer/p0/s2//cart']) await assert.rejects(f.client.business(path, 'GET'))
  assert.equal(f.calls.length, count)
})

test('product media uses the same Session and refuses arbitrary resource paths', async () => {
 const f = fixture(); await f.client.login(async () => 'fresh_code'); const result = await f.client.asset('/buyer/p0/s2/goods/101/images/201'); assert.equal(result, 's2-owned-temp-image'); assert.ok(f.calls.at(-1).accessToken);
 const count=f.calls.length;for(const path of ['https://foreign.invalid/image','/buyer/p0/s2/goods/101/images/%32','/buyer/p0/s2/addresses/201'])await assert.rejects(f.client.asset(path));assert.equal(f.calls.length,count);
});
test('a product download completing after logout cannot be adopted by a new owner', async () => {
 const f = fixture(); await f.client.login(async () => 'fresh_code'); let finish;f.setDownload(() => new Promise(resolve => { finish = resolve })); const pending=f.client.asset('/buyer/p0/s2/goods/101/images/201');await new Promise(resolve=>setImmediate(resolve));await f.client.logout();finish({status:200,filePath:'late-private-temp'});await assert.rejects(pending,e=>e.code==='STALE_OPERATION');
});
