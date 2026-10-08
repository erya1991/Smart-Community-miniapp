import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const nativeRequire = createRequire(path.join(root, 'package.json'))
const ts = nativeRequire('typescript'), vue = nativeRequire('vue')
const { parse, compileScript } = nativeRequire('@vue/compiler-sfc')
const cache = new Map(), routes = []
let pageLoad, pageShow, mounted = [], modalCount = 0, acceptModal = true, scanResult = ''
const uni = {
  navigateTo: ({ url }) => routes.push(url), navigateBack() {}, showToast() {}, pageScrollTo() {},
  getWindowInfo: () => ({ statusBarHeight: 0 }),
  showModal: async () => { modalCount++; await Promise.resolve(); return { confirm: acceptModal } },
  scanCode: options => options.success({ result: scanResult }),
}
function load(file, override) {
  const filename = path.resolve(root, file)
  if (!override && cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  if (!override) cache.set(filename, module)
  const code = ts.transpileModule(override ?? readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const requireLocal = id => {
    if (id.endsWith('.vue')) return {}
    if (id === 'vue') return { ...vue, onMounted: fn => mounted.push(fn) }
    if (id === '@dcloudio/uni-app') return { onLoad: fn => { pageLoad = fn }, onShow: fn => { pageShow = fn } }
    if (id.startsWith('@/utils/')) return load('packages/common/utils/' + id.slice(8) + '.ts')
    if (id.startsWith('@/composables/')) return load('packages/common/composables/' + id.slice(14) + '.ts')
    if (id.startsWith('@/')) return load('apps/' + (filename.includes('resident-miniapp') ? 'resident-miniapp' : 'merchant-miniapp') + '/src/' + id.slice(2) + '.ts')
    if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id) + '.ts')
    return nativeRequire(id)
  }
  new Function('require', 'module', 'exports', 'uni', code)(requireLocal, module, module.exports, uni)
  return module.exports
}
const { createMallMockAdapter } = load('packages/business-common/mock/mall.ts')
const { createSharedMallMockAdapter } = load('packages/business-common/mock/shared-mall.ts')
const { merchantOrderAction, matchesMerchantOrderFilter } = load('packages/common/utils/merchantOrder.ts')
const factory = () => createMallMockAdapter({ fulfillmentDemoSeeds: true })
const clone = value => JSON.parse(JSON.stringify(value))
let serial = 0, passed = 0
async function check(label, fn) { await fn(); passed++; console.log(`PASS ${String(passed).padStart(2, '0')} ${label}`) }
async function create(adapter, request, methods) {
  const context = await adapter.getCheckoutContext(request)
  return adapter.createTrade({ ...request, idempotencyKey: 'fulfillment-' + ++serial, contact: context.contact, addressId: context.defaultAddress.id,
    merchantGroups: context.merchantGroups.map((group, index) => ({ storeId: group.storeId, fulfillmentMethod: methods[index], pickupPointId: group.pickupPoints[0].id, buyerRemark: '仅 ' + group.storeName + ' 可见的买家留言' })), expectedItems: context.items, expectedPayableAmount: context.payableAmount })
}
const veg = { productId: 'product-vegetables', skuId: 'veg-family', quantity: 1 }
const stock = adapter => adapter.getMockSnapshot().products.map(product => [product.id, product.skus.map(sku => [sku.id, sku.availableStock, sku.reservedStock])])
const todo = (data, label) => data.todos.find(entry => entry.label === label).value
const setOrder = (adapter, id, patch) => { const snapshot = adapter.getMockSnapshot(); Object.assign(snapshot.trade.orders.find(order => order.id === id), patch); adapter.restoreMockSnapshot(snapshot) }

// A single Trade with A delivery and B pickup, created using the batch-3 API.
const adapter = factory()
await adapter.addCart('product-breakfast', 'breakfast-one', 1)
const breakfast = (await adapter.getCart()).groups.flatMap(group => group.items).find(item => item.productId === 'product-breakfast')
const multi = await create(adapter, { cartIds: ['cart-vegetables', breakfast.id] }, ['商户配送', '社区自提'])
await adapter.payTrade(multi.tradeId, 'success')
const [a, b] = (await adapter.getTrade(multi.tradeId)).orders

await check('A/B Store list isolation', async () => {
  assert.equal(a.storeId, 'operator-linli'); assert.equal(b.storeId, 'operator-canteen')
  assert.ok((await adapter.getMerchantOrders()).orders.every(order => order.operatorId === 'operator-linli'))
  await adapter.setMerchantContextDemo(b.storeId)
  assert.deepEqual((await adapter.getMerchantOrders()).orders.map(order => order.id), [b.id])
  await adapter.setMerchantContextDemo(a.storeId)
})
await check('Foreign detail and all merchant writes reject guessed orderId', async () => {
  const before = adapter.getMockSnapshot().trade.orders.find(order => order.id === b.id)
  for (const action of [() => adapter.getMerchantTradeOrder(b.id), () => adapter.merchantFulfill(b.id, 'finish-preparing'), () => adapter.saveMerchantRemark(b.id, 'foreign'), () => adapter.confirmVerification(b.id), () => adapter.shipLogistics(b.id, { logisticsCode: 'SF', logisticsName: '顺丰', logisticsNo: 'SF12345' })]) await assert.rejects(action(), /非本店|无权/)
  assert.deepEqual(adapter.getMockSnapshot().trade.orders.find(order => order.id === b.id), before)
})
await check('Unpaid / pending / failed hide actions and reject fulfillment', async () => {
  for (const id of ['demo-unpaid', 'demo-pending', 'demo-failed']) {
    const order = await adapter.getMerchantTradeOrder(id)
    assert.equal(merchantOrderAction(order), '')
    assert.equal(matchesMerchantOrderFilter(order, 'preparing'), false)
    await assert.rejects(adapter.merchantFulfill(id, 'finish-preparing'), /未支付|确认中/)
    assert.equal((await adapter.lookupVerification(order.verificationCode)).reason, 'unpaid')
  }
})
await check('Delivery cannot skip preparation / confirm receipt early', async () => {
  await assert.rejects(adapter.merchantFulfill(a.id, 'start-delivery'), /状态/)
  await assert.rejects(adapter.merchantFulfill(a.id, 'mark-delivered'), /状态/)
  await assert.rejects(adapter.confirmResidentReceipt(a.id), /尚不可/)
})
await check('Delivery prepare → dispatch → delivered, remains awaiting resident', async () => {
  for (const [action, state] of [['finish-preparing', '待配送'], ['start-delivery', '配送中'], ['mark-delivered', '已送达']]) assert.equal((await adapter.merchantFulfill(a.id, action)).fulfillmentStatus, state)
  const order = await adapter.getMerchantTradeOrder(a.id)
  assert.notEqual(order.tradeStatus, '已完成'); assert.equal(merchantOrderAction(order), '')
  assert.ok(order.timeline.filter(event => ['完成备货', '开始配送', '确认送达'].includes(event.title)).every(event => event.operatorName && /^\d{4}-/.test(event.time)))
})
await check('Duplicate delivery request rejected without duplicate timeline', async () => {
  const length = (await adapter.getMerchantTradeOrder(a.id)).timeline.length
  await assert.rejects(adapter.merchantFulfill(a.id, 'mark-delivered'), /状态/)
  assert.equal((await adapter.getMerchantTradeOrder(a.id)).timeline.length, length)
})
await check('Multi-store sibling state and buyer remarks stay independent', async () => {
  const trade = await adapter.getTrade(multi.tradeId)
  assert.equal(trade.orders[0].fulfillmentStatus, '已送达'); assert.equal(trade.orders[1].fulfillmentStatus, '待备货')
  assert.notEqual(trade.orders[0].buyerRemark, trade.orders[1].buyerRemark)
})
await check('Resident reads merchant state then completes delivered child', async () => {
  assert.equal((await adapter.getResidentOrders()).find(order => order.id === a.id).displayStatus, '已送达')
  assert.equal((await adapter.confirmResidentReceipt(a.id)).tradeStatus, '已完成')
  assert.equal((await adapter.getTrade(multi.tradeId)).orders[1].tradeStatus, '已支付')
})
await check('Pickup rejects verification before preparing', async () => {
  await adapter.setMerchantContextDemo(b.storeId)
  assert.equal((await adapter.lookupVerification(b.verificationCode)).reason, 'not-prepared')
  await assert.rejects(adapter.confirmVerification(b.id), /备货/)
})
await check('Pickup prep updates same-source workbench counters', async () => {
  const before = await adapter.getMerchantWorkbench()
  await adapter.merchantFulfill(b.id, 'finish-preparing')
  const after = await adapter.getMerchantWorkbench()
  assert.equal(todo(after, '待备货'), todo(before, '待备货') - 1)
  assert.equal(todo(after, '待核销'), todo(before, '待核销') + 1)
  assert.equal((await adapter.getTradeOrder(b.id)).fulfillmentStatus, '待自提')
})
await check('Query only; pickup confirm completes child with operator / time', async () => {
  const before = await adapter.getMerchantTradeOrder(b.id)
  assert.equal((await adapter.lookupVerification(b.verificationCode)).kind, 'ready')
  assert.deepEqual(await adapter.getMerchantTradeOrder(b.id), before)
  const result = await adapter.confirmVerification(b.id)
  assert.equal(result.tradeStatus, '已完成'); assert.equal(result.verificationStatus, '已核销')
  assert.ok(result.verificationAt && result.verificationOperatorName)
  assert.equal(todo(await adapter.getMerchantWorkbench(), '待核销'), 0)
})
await check('Repeated verification rejects without duplicate log', async () => {
  const before = await adapter.getMerchantTradeOrder(b.id)
  assert.equal((await adapter.lookupVerification(b.verificationCode)).kind, 'already')
  await assert.rejects(adapter.confirmVerification(b.id), /重复核销/)
  assert.deepEqual(await adapter.getMerchantTradeOrder(b.id), before)
})
await check('Wrong and foreign code disclose specific reason, no foreign order', async () => {
  assert.equal((await adapter.lookupVerification('DOES-NOT-EXIST')).reason, 'not-found')
  await adapter.setMerchantContextDemo(a.storeId)
  const result = await adapter.lookupVerification(b.verificationCode)
  assert.equal(result.reason, 'foreign-store'); assert.equal(result.order, undefined)
})
await check('Paid store verification bypasses delivery flow', async () => {
  const store = await create(adapter, { productId: 'product-tissue', skuId: 'tissue-box', quantity: 1 }, ['到店核销'])
  await adapter.payTrade(store.tradeId, 'success')
  const child = (await adapter.getTrade(store.tradeId)).orders[0]
  await adapter.setMerchantContextDemo(child.storeId)
  assert.equal(child.fulfillmentStatus, '待核销')
  await assert.rejects(adapter.merchantFulfill(child.id, 'start-delivery'), /状态/)
  assert.equal((await adapter.lookupVerification(child.verificationCode)).kind, 'ready')
  assert.equal((await adapter.confirmVerification(child.id)).fulfillmentStatus, '已完成')
  await adapter.setMerchantContextDemo(a.storeId)
})
await check('Closed rejects prep / dispatch / shipment / verification', async () => {
  for (const action of ['finish-preparing', 'start-delivery', 'mark-delivered']) await assert.rejects(adapter.merchantFulfill('demo-closed', action), /已关闭/)
  await assert.rejects(adapter.shipLogistics('demo-closed', { logisticsCode: 'SF', logisticsName: '顺丰', logisticsNo: 'SF12345' }), /已关闭/)
  assert.equal((await adapter.lookupVerification('DEMO-CLOSED')).reason, 'closed')
  await assert.rejects(adapter.confirmVerification('demo-closed'), /已关闭/)
})
await check('Logistics prepares into 待发货 and cannot dispatch as local delivery', async () => {
  await adapter.merchantFulfill('demo-logistics', 'finish-preparing')
  assert.equal((await adapter.getMerchantTradeOrder('demo-logistics')).fulfillmentStatus, '待发货')
  await assert.rejects(adapter.merchantFulfill('demo-logistics', 'start-delivery'), /状态/)
})
await check('Carrier / tracking required; invalid input does not advance', async () => {
  for (const input of [{ logisticsCode: '', logisticsName: '', logisticsNo: 'SF123456' }, { logisticsCode: 'SF', logisticsName: '顺丰', logisticsNo: '' }, { logisticsCode: 'SF', logisticsName: '顺丰', logisticsNo: '中文单号' }]) await assert.rejects(adapter.shipLogistics('demo-logistics', input), /公司|单号/)
  assert.equal((await adapter.getMerchantTradeOrder('demo-logistics')).fulfillmentStatus, '待发货')
})
await check('Shipment records all four logistics fields and resident receipt', async () => {
  await adapter.shipLogistics('demo-logistics', { logisticsCode: 'SF', logisticsName: '顺丰速运', logisticsNo: 'SF123456789012', shipmentRemark: '请核对包装' })
  const result = await adapter.getTradeOrder('demo-logistics')
  assert.equal(result.fulfillmentStatus, '已发货'); assert.equal(result.logisticsCode, 'SF'); assert.equal(result.logisticsName, '顺丰速运'); assert.equal(result.logisticsNo, 'SF123456789012'); assert.ok(result.shippedAt)
  const length = result.timeline.length
  await assert.rejects(adapter.shipLogistics(result.id, { logisticsCode: 'SF', logisticsName: '顺丰', logisticsNo: 'SF1234567' }), /状态/)
  assert.equal((await adapter.getTradeOrder(result.id)).timeline.length, length)
  assert.equal((await adapter.confirmResidentReceipt(result.id)).tradeStatus, '已完成')
})
await check('Expired / unsupported / after-sale / wrong-state verification guards', async () => {
  const sandbox = factory()
  setOrder(sandbox, 'trade-pickup', { verificationStatus: '已失效' })
  assert.equal((await sandbox.lookupVerification('HX-88260904')).reason, 'expired')
  await assert.rejects(sandbox.confirmVerification('trade-pickup'), /失效/)
  setOrder(sandbox, 'trade-pickup', { verificationStatus: '待核销', afterSaleStatus: '售后处理中' })
  assert.equal((await sandbox.lookupVerification('HX-88260904')).reason, 'after-sale')
  await assert.rejects(sandbox.merchantFulfill('trade-pickup', 'finish-preparing'), /售后/)
  setOrder(sandbox, 'trade-pickup', { afterSaleStatus: '无售后', fulfillmentStatus: '配送中' })
  assert.equal((await sandbox.lookupVerification('HX-88260904')).reason, 'not-verifiable')
  assert.equal((await sandbox.lookupVerification('DGL202609180001')).reason, 'not-verifiable')
})
await check('Address snapshot survives resident addressbook update', async () => {
  const before = (await adapter.getMerchantTradeOrder(a.id)).addressSnapshot
  const address = await adapter.getAddress('address-default')
  await adapter.saveAddress({ ...address, detail: '居民后改的地址不能改变订单快照 999号' })
  assert.deepEqual((await adapter.getMerchantTradeOrder(a.id)).addressSnapshot, before)
})
await check('Private merchant remarks never reach resident DTOs or timeline', async () => {
  await adapter.saveMerchantRemark(a.id, '商户内部标记')
  await assert.rejects(adapter.saveMerchantRemark(a.id, '长'.repeat(201)), /200/)
  assert.equal((await adapter.getMerchantTradeOrder(a.id)).merchantRemark, '商户内部标记')
  const resident = [await adapter.getTradeOrder(a.id), (await adapter.getTrade(multi.tradeId)).orders[0], (await adapter.getResidentOrders()).find(order => order.id === a.id), await adapter.queryTradePay(a.id)]
  for (const order of resident) { assert.equal(order.merchantRemark, undefined); assert.ok(order.timeline.every(event => event.visibility !== 'merchant')) }
})
await check('Every fulfillment method keeps post-create inventory unchanged', async () => {
  const sandbox = factory()
  const beforeCreate = stock(sandbox)
  const trade = await create(sandbox, veg, ['商户配送'])
  assert.notDeepEqual(stock(sandbox), beforeCreate)
  const afterCreate = stock(sandbox)
  await sandbox.payTrade(trade.tradeId, 'success')
  for (const action of ['finish-preparing', 'start-delivery', 'mark-delivered']) await sandbox.merchantFulfill(trade.orders[0].id, action)
  await sandbox.confirmResidentReceipt(trade.orders[0].id)
  await sandbox.confirmVerification('trade-pickup'); await sandbox.confirmVerification('trade-store')
  await sandbox.merchantFulfill('demo-logistics', 'finish-preparing')
  await sandbox.shipLogistics('demo-logistics', { logisticsCode: 'SF', logisticsName: '顺丰', logisticsNo: 'SF1234567' })
  assert.deepEqual(stock(sandbox), afterCreate)
})
await check('Independent resident / A / B adapters share snapshot and child references', async () => {
  let snapshot
  const storage = { read: () => clone(snapshot), write: value => { snapshot = clone(value) } }
  storage.read = () => snapshot ? clone(snapshot) : undefined
  const resident = createSharedMallMockAdapter(storage), merchantA = createSharedMallMockAdapter(storage), merchantB = createSharedMallMockAdapter(storage)
  await resident.addCart('product-breakfast', 'breakfast-one', 1)
  const cart = await resident.getCart()
  const breakfast = cart.groups.flatMap(group => group.items).find(item => item.productId === 'product-breakfast')
  const trade = await create(resident, { cartIds: ['cart-vegetables', breakfast.id] }, ['商户配送', '社区自提'])
  await resident.payTrade(trade.tradeId, 'success')
  const [a, b] = (await resident.getTrade(trade.tradeId)).orders
  await merchantB.setMerchantContextDemo(b.storeId)
  await merchantA.merchantFulfill(a.id, 'finish-preparing')
  assert.equal((await resident.getTrade(trade.tradeId)).orders[0].fulfillmentStatus, '待配送')
  assert.equal((await merchantB.getMerchantTradeOrder(b.id)).fulfillmentStatus, '待备货')
  await merchantB.merchantFulfill(b.id, 'finish-preparing'); await merchantB.confirmVerification(b.id)
  assert.equal((await resident.getTradeOrder(b.id)).tradeStatus, '已完成')
  assert.equal((await merchantA.getMerchantTradeOrder(a.id)).fulfillmentStatus, '待配送')
  await assert.rejects(merchantA.getMerchantTradeOrder(b.id), /非本店/)
  const reloaded = createSharedMallMockAdapter(storage)
  assert.equal((await reloaded.getTradeOrder(b.id)).tradeStatus, '已完成')
})
await check('Same operator with distinct Store IDs still cannot access sibling', async () => {
  const sandbox = createMallMockAdapter({ productOverrides: { 'product-vegetables': { storeId: 'store-a' }, 'product-rice': { storeId: 'store-b', operatorId: 'operator-linli' } } })
  const trade = await create(sandbox, { cartIds: ['cart-vegetables', 'cart-rice'] }, ['商户配送', '商户配送'])
  await sandbox.payTrade(trade.tradeId, 'success')
  await sandbox.setMerchantContextDemo('store-a')
  assert.equal((await sandbox.getMerchantOrders()).orders.some(order => order.storeId === 'store-b'), false)
  await assert.rejects(sandbox.getMerchantTradeOrder(trade.orders[1].id), /非本店/)
})
await check('All four newly created paid flows reserve stock only once', async () => {
  for (const [request, method] of [[veg, '商户配送'], [veg, '社区自提'], [{ productId: 'product-tissue', skuId: 'tissue-box', quantity: 1 }, '到店核销'], [{ productId: 'product-rice', skuId: 'rice-5kg', quantity: 1 }, '普通物流']]) {
    const sandbox = factory(), trade = await create(sandbox, request, [method]), id = trade.orders[0].id
    const reserved = stock(sandbox)
    await sandbox.payTrade(trade.tradeId, 'success'); await sandbox.setMerchantContextDemo(trade.orders[0].storeId)
    if (method !== '到店核销') await sandbox.merchantFulfill(id, 'finish-preparing')
    if (method === '商户配送') { await sandbox.merchantFulfill(id, 'start-delivery'); await sandbox.merchantFulfill(id, 'mark-delivered'); await sandbox.confirmResidentReceipt(id) }
    else if (method === '普通物流') { await sandbox.shipLogistics(id, { logisticsCode: 'SF', logisticsName: '顺丰速运', logisticsNo: 'SF123456789' }); await sandbox.confirmResidentReceipt(id) }
    else await sandbox.confirmVerification(id)
    assert.equal((await sandbox.getTrade(trade.tradeId)).orders[0].tradeStatus, '已完成')
    assert.deepEqual(stock(sandbox), reserved)
  }
})

function setup(file, props = {}, context = {}) {
  pageLoad = undefined; pageShow = undefined; mounted = []
  const filename = file.startsWith('apps/') ? file : 'apps/merchant-miniapp/src/' + file
  const { descriptor } = parse(readFileSync(path.join(root, filename), 'utf8'))
  const component = load(filename, compileScript(descriptor, { id: 'p0-fulfillment-check' }).content).default
  return { page: component.setup(props, { expose() {}, emit() {}, ...context }), onLoad: pageLoad, onShow: pageShow, onMounted: mounted }
}
async function ready(page) {
  for (let count = 0; count < 100 && page.status.value === 'loading'; count++) await new Promise(resolve => setTimeout(resolve, 5))
  assert.equal(page.status.value, 'ready')
}
const { appAdapter } = load('apps/merchant-miniapp/src/adapters/mock.ts')
const uiAdapter = factory()
Object.assign(appAdapter, uiAdapter)
await check('Workbench todo routes apply order filter, not placeholder', async () => {
  const component = setup('pages/workbench/index.vue'); component.onLoad(); await ready(component.page)
  for (const [label, filter] of [['待备货', 'preparing'], ['待配送/发货', 'delivery'], ['待自提/核销', 'verification']]) { component.page.openTodo(label); assert.equal(routes.pop(), '/pages/order/index?filter=' + filter) }
})
await check('Order list query applies filter; primary only navigates before confirmation', async () => {
  const component = setup('pages/order/index.vue'); component.onLoad({ filter: 'preparing' }); await ready(component.page)
  assert.equal(component.page.activeFilter.value, 'preparing')
  assert.ok(component.page.orders.value.every(order => order.fulfillmentStatus === '待备货' && ['支付成功', 'Mock成功'].includes(order.paymentStatus)))
  const order = component.page.orders.value[0]
  component.page.handlePrimary(order)
  assert.match(routes.pop(), /pages\/order\/detail\/index\?id=/)
  assert.equal((await uiAdapter.getMerchantTradeOrder(order.id)).fulfillmentStatus, '待备货')
})
await check('Detail confirmation cancel / double-click guard and workbench return refresh', async () => {
  const detail = setup('pages/order/detail/index.vue'); detail.onLoad({ id: 'trade-delivery' }); await ready(detail.page)
  acceptModal = false; await detail.page.fulfill(); assert.equal(detail.page.data.value.fulfillmentStatus, '待备货')
  acceptModal = true; const before = modalCount
  await Promise.all([detail.page.fulfill(), detail.page.fulfill()])
  assert.equal(modalCount, before + 1); assert.equal(detail.page.data.value.fulfillmentStatus, '待配送')
  const dashboard = setup('pages/workbench/index.vue'); dashboard.onLoad(); await ready(dashboard.page)
  const count = todo(dashboard.page.data.value, '待配送/发货')
  await detail.page.fulfill(); await dashboard.onShow()
  assert.equal(todo(dashboard.page.data.value, '待配送/发货'), count - 1)
})
await check('Direct foreign detail returns page error with no order content', async () => {
  const detail = setup('pages/order/detail/index.vue'); detail.onLoad({ id: b.id })
  await new Promise(resolve => setTimeout(resolve, 20))
  assert.equal(detail.page.status.value, 'error'); assert.equal(detail.page.data.value, null)
  assert.match(detail.page.errorMessage.value, /非本店|不存在/)
})
await check('Verification route / scan / query never auto-complete; explicit modal only', async () => {
  const component = setup('pages/verification/index.vue'), page = component.page
  await component.onLoad({ code: 'HX-88260904' }); await vue.nextTick()
  assert.equal(page.candidate.value, null)
  scanResult = 'HX-88260904'; page.scan(); await new Promise(resolve => setTimeout(resolve, 10))
  assert.equal(page.candidate.value.kind, 'ready'); assert.equal((await uiAdapter.getTradeOrder('trade-pickup')).verificationStatus, '待核销')
  acceptModal = false; await page.confirm(); assert.equal(page.successOrder.value, undefined)
  acceptModal = true; const before = modalCount
  await Promise.all([page.confirm(), page.confirm()])
  assert.equal(modalCount, before + 1); assert.equal(page.successOrder.value.tradeStatus, '已完成')
  await page.lookup(); assert.equal(page.candidate.value.kind, 'already')
  assert.equal(page.successOrder.value, undefined)
  page.code.value = 'WRONG'; await vue.nextTick(); assert.equal(page.candidate.value, null)
})
await check('Logistics panel validates required fields before confirmation / commit', async () => {
  await uiAdapter.merchantFulfill('demo-logistics', 'finish-preparing')
  const component = setup('features/fulfillment/LogisticsShipmentPanel.vue', { orderId: 'demo-logistics' }), page = component.page
  for (const mount of component.onMounted) await mount()
  const before = modalCount
  await page.submit(); assert.equal(modalCount, before)
  assert.ok(page.companies.value.length)
  page.choose({ detail: { value: 0 } }); page.form.logisticsNo = 'SF9988776655'
  await page.submit()
  assert.equal((await uiAdapter.getTradeOrder('demo-logistics')).fulfillmentStatus, '已发货')
})
await check('Resident compiled detail / list show logistics and offer receipt after shipment', async () => {
  const residentAdapter = load('apps/resident-miniapp/src/adapters/mock.ts').appAdapter
  Object.assign(residentAdapter, uiAdapter)
  const detail = setup('apps/resident-miniapp/src/pages/mall/order-detail/index.vue')
  detail.onLoad({ id: 'demo-logistics' }); await ready(detail.page)
  assert.equal(detail.page.displayStatus.value, '已发货'); assert.equal(detail.page.canConfirmReceipt.value, true)
  assert.deepEqual(detail.page.steps.value, ['已支付', '商户备货', '待发货', '已发货', '已完成'])
  const list = setup('apps/resident-miniapp/src/pages/mall/order-list/index.vue')
  list.onLoad(); await ready(list.page); list.page.active.value = '待收货/待核销'
  assert.ok(list.page.orders.value.some(order => order.id === 'demo-logistics'))
  assert.match(readFileSync(path.join(root, 'apps/resident-miniapp/src/pages/mall/order-detail/index.vue'), 'utf8'), /data\.logisticsName.*data\.logisticsNo.*data\.shippedAt/)
})

console.log(`PASS P0 batch 4: ${passed} fulfillment / isolation / cross-instance / compiled-page scenarios`)
