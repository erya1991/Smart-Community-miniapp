import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import ts from 'typescript'

const root = new URL('../', import.meta.url)
const read = (path) => readFileSync(new URL(path, root), 'utf8')
const mock = (name) => {
  const code = ts.transpileModule(read(`packages/business-common/mock/${name}.ts`), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  new Function('exports', code)(exports)
  return exports[`${name}MockAdapter`]
}
const resident = mock('resident')
const merchant = mock('merchant')
const mall = await resident.getMallHome()
const catalog = await merchant.getMerchantProducts()
for (const [app, items] of [['resident', mall.products], ['merchant', catalog.products]]) {
  for (const item of items) {
    assert.match(item.image, /^\/static\/images\/catalog\//)
    const path = `apps/${app}-miniapp/src${item.image}`
    assert.ok(existsSync(new URL(path, root)), path)
    assert.ok(readFileSync(new URL(path, root)).length > 1000, path)
  }
}
assert.equal(catalog.filters.find((item) => item.label === '全部').count, catalog.products.length)
const orders = await merchant.getMerchantOrders()
assert.equal(orders.filters.find((item) => item.label === '全部').count, orders.orders.length)
const profile = await merchant.getMerchantProfile()
assert.ok(profile.groups.some((group) => group.items.some((item) => item.label === '资质')))
for (const [app, component] of [['resident', 'ServiceCard'], ['merchant', 'MerchantInfoCard']]) {
  const json = JSON.parse(read(`apps/${app}-miniapp/dist/build/mp-weixin/components/${component}.json`))
  assert.ok(json.usingComponents['base-card'], `${component}: BaseCard must be registered`)
}
const navbar = read('packages/ui/components/AppNavbar.vue')
assert.ok(navbar.includes('getMenuButtonBoundingClientRect'))
assert.ok(!navbar.includes('•••') && !navbar.includes('navbar__capsule'))
assert.ok(navbar.includes('showBack && canGoBack'))
assert.ok(!read('apps/merchant-miniapp/src/pages/profile/index.vue').includes('qualification-board'))
console.log('PASS catalog assets, counts, qualification entry, compiled BaseCard registration, navigation and scope guards')
