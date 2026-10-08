import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const nativeRequire = createRequire(path.join(root, 'package.json'))
const ts = nativeRequire('typescript')
const { parse, compileScript } = nativeRequire('@vue/compiler-sfc')
const cache = new Map()
const routes = []
const notices = []
let pageLoad
let pageShow
const uni = { navigateTo: ({ url }) => routes.push(url), showToast: ({ title }) => notices.push(title) }

function load(file, sourceOverride) {
  const filename = path.resolve(root, file)
  if (!sourceOverride && cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  if (!sourceOverride) cache.set(filename, module)
  const code = ts.transpileModule(sourceOverride ?? readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const requireLocal = (id) => {
    if (id.endsWith('.vue')) return {}
    if (id === '@dcloudio/uni-app') return { onLoad: (fn) => { pageLoad = fn }, onShow: (fn) => { pageShow = fn }, onBackPress() {} }
    if (id.startsWith('@/utils/')) return load(`packages/common/utils/${id.slice(8)}.ts`)
    if (id.startsWith('@/composables/')) return load(`packages/common/composables/${id.slice(14)}.ts`)
    if (id.startsWith('@/')) return load(`apps/resident-miniapp/src/${id.slice(2)}.ts`)
    if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id) + '.ts')
    return nativeRequire(id)
  }
  new Function('require', 'module', 'exports', 'uni', code)(requireLocal, module, module.exports, uni)
  return module.exports
}

const { createMallMockAdapter } = load('packages/business-common/mock/mall.ts')
const { residentMallService: service } = load('apps/resident-miniapp/src/services/mall.ts')
const { appAdapter } = load('apps/resident-miniapp/src/adapters/mock.ts')
const catalog = load('packages/common/utils/mallCatalog.ts')
const initialCatalog = await service.getHome()
const originalDetail = await service.getDetail('product-vegetables')
const useAdapter = (adapter) => Object.assign(appAdapter, adapter)
const expectIds = (items, ids) => assert.deepEqual(items.map((item) => item.id), ids)

assert.ok(initialCatalog.categories.every((category) => category.id && category.enabled))
assert.ok(!initialCatalog.categories.some((category) => category.id === 'category-featured'))
expectIds(await service.getProducts({ categoryId: 'category-grain', keyword: '便民店', sort: 'sales' }), ['product-rice'])
expectIds(await service.getProducts({ categoryId: 'category-featured' }), [])
expectIds(await service.getProducts({ sort: 'sales' }), ['product-breakfast', 'product-tissue', 'product-vegetables', 'product-wonton', 'product-rice'])
expectIds(await service.getProducts({ categoryId: 'category-food', sort: 'price-desc' }), ['product-wonton', 'product-breakfast'])
expectIds(await service.getProducts({ categoryId: 'category-food', sort: 'price-asc' }), ['product-breakfast', 'product-wonton'])
assert.ok(initialCatalog.products.every((product) => product.storeName && product.sellingPoint && Number.isInteger(product.salesCount)))
assert.equal(originalDetail.reviewCount, 58)
console.log('PASS enabled category IDs, combined keyword/category/sort queries, sales and price order, store and catalog information')

assert.match(catalog.getSkuSelectionIssue(originalDetail, {}, 1), /请选择份量、包装/)
assert.match(catalog.getSkuSelectionIssue(originalDetail, { 份量: originalDetail.skus[1].name }, 1), /请选择包装/)
const selected = { 份量: originalDetail.skus[1].name, 包装: '袋装' }
assert.equal(catalog.findSelectedSku(originalDetail, selected).id, 'veg-two')
assert.equal(catalog.getSkuSelectionIssue(originalDetail, selected, 2), '')
assert.match(catalog.getSkuSelectionIssue(originalDetail, selected, 13), /仅剩 12 件/)
for (const quantity of [0, -1, 1.5, NaN, Infinity]) await assert.rejects(service.prepareBuyNow(originalDetail.id, 'veg-two', quantity, 1250), /正整数/)
await service.addCart(originalDetail.id, 'veg-two', 1250, 2)
assert.equal((await service.getCart()).groups.flatMap((group) => group.items).find((item) => item.skuId === 'veg-two').quantity, 2)
await assert.rejects(service.addCart(originalDetail.id, 'veg-two', 1250, 11), /购物车已有 2 件/)
const checkoutRequest = await service.prepareBuyNow(originalDetail.id, 'veg-two', 2, 1250)
assert.deepEqual(checkoutRequest, { productId: originalDetail.id, skuId: 'veg-two', quantity: 2 })
const checkout = await service.getCheckout(checkoutRequest)
assert.equal(checkout.merchantGroups[0].items[0].quantity, 2)
assert.equal(checkout.goodsAmount, 2500)
await assert.rejects(service.prepareBuyNow(originalDetail.id, 'veg-two', 1, 1990), /价格已调整/)
console.log('PASS incomplete combinations blocked, quantity/stock/price validated, quantity reaches cart and checkout amount')

for (const state of [{ enabled: false }, { businessAllowed: false }, { tradeAllowed: false }]) {
  useAdapter(createMallMockAdapter({ storeOverrides: { 'operator-linli': state } }))
  assert.equal((await service.getDetail(originalDetail.id)).purchaseEligibility.allowed, false)
  assert.ok(!(await service.getCommunityHome()).products.some((product) => product.id === originalDetail.id))
  await assert.rejects(service.addCart(originalDetail.id, 'veg-two', 1250), /店铺/)
  await assert.rejects(service.prepareBuyNow(originalDetail.id, 'veg-two', 1, 1250), /店铺/)
}
const noStock = originalDetail.skus.map((sku) => ({ ...sku, availableStock: 0 }))
useAdapter(createMallMockAdapter({ productOverrides: { [originalDetail.id]: { skus: noStock } } }))
assert.ok((await service.getProducts()).find((product) => product.id === originalDetail.id).soldOut)
assert.ok(!(await service.getCommunityHome()).products.some((product) => product.id === originalDetail.id))
const alternateStock = originalDetail.skus.map((sku, index) => ({ ...sku, availableStock: index ? 3 : 0 }))
useAdapter(createMallMockAdapter({ productOverrides: { [originalDetail.id]: { skus: alternateStock } } }))
assert.equal((await service.getDetail(originalDetail.id)).currentSkuId, 'veg-two')
assert.ok((await service.getCommunityHome()).products.some((product) => product.id === originalDetail.id && !product.soldOut && product.price === 12.5))
useAdapter(createMallMockAdapter({ categoryOverrides: { 'category-fresh': { enabled: false } } }))
assert.ok(!(await service.getHome()).categories.some((category) => category.id === 'category-fresh'))
expectIds(await service.getProducts({ categoryId: 'category-fresh' }), [])
console.log('PASS store disabled/business/trade states rejected, sold-out home recommendations hidden, alternate SKU remains saleable, disabled categories hidden')

function setupPage(file) {
  const filename = `apps/resident-miniapp/src/pages/${file}`
  const { descriptor } = parse(readFileSync(path.join(root, filename), 'utf8'))
  const component = load(filename, compileScript(descriptor, { id: 'p0-check' }).content).default
  const page = component.setup({}, { expose() {} })
  return { page, onLoad: pageLoad, onShow: pageShow }
}
async function ready(page) {
  for (let attempts = 0; attempts < 100 && page.status.value === 'loading'; attempts++) await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(page.status.value, 'ready')
}

useAdapter(createMallMockAdapter())
const list = setupPage('mall/list/index.vue')
list.onLoad({ keyword: encodeURIComponent('社区'), categoryId: 'category-food', sort: 'sales' })
await ready(list.page)
assert.equal(list.page.sort.value, 'sales')
assert.equal(list.page.categoryId.value, 'category-food')
expectIds(list.page.products.value, ['product-breakfast', 'product-wonton'])
list.onShow()
assert.equal(list.page.status.value, 'ready', 'returning to a loaded list must keep its native scroll nodes mounted')
await list.page.refresh()
const detail = setupPage('mall/detail/index.vue')
detail.onLoad({ id: originalDetail.id })
await ready(detail.page)
detail.page.openSkuSheet('buy')
assert.equal(detail.page.showSkuSheet.value, true)
await detail.page.submitSku()
assert.equal(routes.length, 0)
detail.page.selectSpec('份量', originalDetail.skus[1].name)
await detail.page.submitSku()
assert.equal(routes.length, 0)
detail.page.selectSpec('包装', '袋装')
detail.page.selectSpec('包装', '袋装')
assert.match(detail.page.selectionIssue.value, /请选择包装/)
detail.page.selectSpec('包装', '袋装')
detail.page.changeQuantity(2)
await Promise.all([detail.page.submitSku(), detail.page.submitSku()])
assert.equal(routes.length, 1)
assert.match(routes[0], /skuId=veg-two&quantity=2/)
assert.doesNotMatch(routes[0], /fulfillment=/)
const confirm = setupPage('mall/confirm/index.vue')
confirm.onLoad(Object.fromEntries(new URLSearchParams(routes[0].split('?')[1])))
await ready(confirm.page)
assert.equal(confirm.page.data.value.merchantGroups[0].items[0].quantity, 2)
assert.equal(confirm.page.data.value.goodsAmount, 2500)
assert.equal(confirm.page.choices.value[0].fulfillmentMethod, '商户配送')

useAdapter(createMallMockAdapter({ storeOverrides: { 'operator-linli': { enabled: false } } }))
const blocked = setupPage('mall/detail/index.vue')
blocked.onLoad({ id: originalDetail.id })
await ready(blocked.page)
assert.equal(blocked.page.canPurchase.value, false)
assert.match(blocked.page.selectionIssue.value, /店铺/)
useAdapter(createMallMockAdapter({ productOverrides: { [originalDetail.id]: { skus: noStock } } }))
const soldOut = setupPage('mall/detail/index.vue')
soldOut.onLoad({ id: originalDetail.id })
await ready(soldOut.page)
assert.equal(soldOut.page.canPurchase.value, false)
const correlatedSkus = originalDetail.skus.map((sku, index) => ({ ...sku, specValues: { 份量: sku.name, 包装: index ? '盒装' : '袋装' } }))
useAdapter(createMallMockAdapter({ productOverrides: { [originalDetail.id]: { specifications: [{ name: '份量', values: correlatedSkus.map((sku) => sku.name) }, { name: '包装', values: ['袋装', '盒装'] }], skus: correlatedSkus } } }))
const combinations = setupPage('mall/detail/index.vue')
combinations.onLoad({ id: originalDetail.id })
await ready(combinations.page)
combinations.page.selectSpec('份量', correlatedSkus[0].name)
combinations.page.selectSpec('包装', '袋装')
assert.equal(combinations.page.selectedSku.value.id, 'veg-family')
combinations.page.selectSpec('包装', '袋装')
combinations.page.selectSpec('份量', correlatedSkus[1].name)
combinations.page.selectSpec('包装', '盒装')
assert.equal(combinations.page.selectedSku.value.id, 'veg-two')
console.log('PASS route parameters, detail sheet submission guards, duplicate click guard, fulfillment selected in confirmation, disabled detail purchase state')

console.log('PASS P0 batch 1 six-item completion checks (isolated Service/Mock and compiled page scripts; device/browser evidence separate)')
