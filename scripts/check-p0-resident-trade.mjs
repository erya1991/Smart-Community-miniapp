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
let pageLoad, pageShow
const uni = { navigateTo: ({ url }) => routes.push(url), redirectTo: ({ url }) => routes.push(url), navigateBack() {}, showToast() {}, switchTab: ({ url }) => routes.push(url), showModal: ({ success }) => success({ confirm: true }) }
function load(file, sourceOverride) {
  const filename = path.resolve(root, file)
  if (!sourceOverride && cache.has(filename)) return cache.get(filename).exports
  const module = { exports: {} }
  if (!sourceOverride) cache.set(filename, module)
  const code = ts.transpileModule(sourceOverride ?? readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const requireLocal = (id) => {
    if (id.endsWith('.vue')) return {}
    if (id === '@dcloudio/uni-app') return { onLoad: (fn) => { pageLoad = fn }, onShow: (fn) => { pageShow = fn } }
    if (id.startsWith('@/utils/')) return load('packages/common/utils/' + id.slice(8) + '.ts')
    if (id.startsWith('@/composables/')) return load('packages/common/composables/' + id.slice(14) + '.ts')
    if (id.startsWith('@/')) return load('apps/resident-miniapp/src/' + id.slice(2) + '.ts')
    if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id) + '.ts')
    return nativeRequire(id)
  }
  new Function('require', 'module', 'exports', 'uni', code)(requireLocal, module, module.exports, uni)
  return module.exports
}
const { createMallMockAdapter } = load('packages/business-common/mock/mall.ts')
const { createMallTradeMockAdapter } = load('packages/business-common/mock/trade.ts')
const { residentMallService: service } = load('apps/resident-miniapp/src/services/mall.ts')
const { appAdapter } = load('apps/resident-miniapp/src/adapters/mock.ts')
const { checkoutAddressSelection: selection } = load('apps/resident-miniapp/src/features/checkoutAddress.ts')
const useAdapter = (adapter) => Object.assign(appAdapter, adapter)
let count = 0
const test = async (name, action) => { await action(); console.log('PASS ' + (++count).toString().padStart(2, '0') + ' ' + name) }
const buyNow = { productId: 'product-vegetables', skuId: 'veg-two', quantity: 2 }
const multi = { cartIds: ['cart-vegetables', 'cart-rice'] }
const inputFor = async (adapter, request = buyNow, methods) => {
  const context = await adapter.getCheckoutContext(request)
  return {
    ...request, merchantGroups: context.merchantGroups.map((group, index) => ({ storeId: group.storeId, fulfillmentMethod: methods?.[index] || group.defaultFulfillment, pickupPointId: group.pickupPoints[0]?.id, buyerRemark: '商户备注 ' + index })),
    addressId: 'address-default', contact: context.contact, expectedItems: context.merchantGroups.flatMap((group) => group.items), expectedPayableAmount: context.payableAmount, idempotencyKey: 'case-' + count,
  }
}
const originals = await Promise.all(['product-vegetables', 'product-rice'].map((id) => createMallMockAdapter().getProductDetail(id)))
function harness({ reserveFailure = false, removeFailure = false } = {}) {
  const products = JSON.parse(JSON.stringify(originals))
  const cart = [{ id: 'cart-vegetables', productId: products[0].id, skuId: 'veg-family', quantity: 2, selected: true }, { id: 'cart-rice', productId: products[1].id, skuId: 'rice-5kg', quantity: 1, selected: true }]
  const qualification = { businessAllowed: true, formalTradeAllowed: true, mockPayAllowed: true, message: '模拟交易资格不可用' }
  const store = { allowed: true, reason: '店铺已暂停交易' }
  let reserveCalls = 0
  const adapter = createMallTradeMockAdapter({
    projectId: 'legacy-test', operatorId: products[0].operatorId,
    findProduct: (id) => products.find((product) => product.id === id),
    findSku: (id, skuId) => products.find((product) => product.id === id)?.skus.find((sku) => sku.id === skuId),
    getCartItems: (ids) => cart.filter((item) => !ids || ids.includes(item.id)),
    removeCartItems: (ids) => { if (removeFailure) throw new Error('cart atomic failure'); for (let index = cart.length - 1; index >= 0; index--) if (ids.includes(cart[index].id)) cart.splice(index, 1) },
    updateStock: (id, skuId, quantity, action) => {
      if (action === 'reserve' && reserveFailure && ++reserveCalls === 2) throw new Error('second reserve failure')
      const sku = products.find((product) => product.id === id).skus.find((item) => item.id === skuId)
      if (action === 'reserve') { assert.ok(sku.availableStock >= quantity); sku.availableStock -= quantity; sku.reservedStock += quantity }
      else { sku.availableStock += quantity; sku.reservedStock -= quantity }
    },
    getQualification: () => qualification, getStoreEligibility: () => store,
  })
  return { adapter, products, cart, qualification, store }
}
function setupPage(relative) {
  const filename = 'apps/resident-miniapp/src/pages/' + relative
  const { descriptor } = parse(readFileSync(path.join(root, filename), 'utf8'))
  const component = load(filename, compileScript(descriptor, { id: 'p0-trade-check' }).content).default
  const page = component.setup({}, { expose() {} })
  return { page, onLoad: pageLoad, onShow: pageShow }
}
async function ready(page) {
  for (let attempt = 0; attempt < 100 && page.status.value === 'loading'; attempt++) await new Promise((resolve) => setTimeout(resolve, 5))
  assert.equal(page.status.value, 'ready', page.errorMessage?.value)
}
await test('立即购买传递所选 SKU', async () => { useAdapter(createMallMockAdapter()); assert.deepEqual(await service.prepareBuyNow(buyNow.productId, buyNow.skuId, 2, 1250), buyNow) })
await test('数量 > 1 的金额以分计算', async () => { const context = await service.getCheckout(buyNow); assert.equal(context.merchantGroups[0].items[0].quantity, 2); assert.equal(context.payableAmount, 2500) })
await test('单商户购物车结算', async () => { const adapter = createMallMockAdapter(); const trade = await adapter.createTrade(await inputFor(adapter, { cartIds: ['cart-vegetables'] })); assert.equal(trade.orders.length, 1); assert.equal(trade.payableAmount, 3980) })
await test('多商户一次提交一个 Trade、只移除已结算条目', async () => { const adapter = createMallMockAdapter(); const trade = await adapter.createTrade(await inputFor(adapter, multi)); assert.equal(trade.orders.length, 2); assert.equal(trade.payableAmount, 8970); assert.ok(trade.orders.every((order) => order.tradeId === trade.tradeId)); assert.equal((await adapter.getCart()).invalidItems.length, 2) })
await test('各商户独立履约及备注快照', async () => { const adapter = createMallMockAdapter(); const input = await inputFor(adapter, multi, ['社区自提', '商户配送']); const trade = await adapter.createTrade(input); assert.equal(trade.orders[0].fulfillmentMethod, '社区自提'); assert.equal(trade.orders[1].fulfillmentMethod, '商户配送'); assert.notEqual(trade.orders[0].buyerRemark, trade.orders[1].buyerRemark); assert.equal(trade.orders[0].addressSnapshot, undefined); assert.ok(trade.orders[1].addressSnapshot) })
await test('商户配送必须有地址', async () => { const adapter = createMallMockAdapter(); const input = await inputFor(adapter); delete input.addressId; await assert.rejects(adapter.createTrade(input), /完整收货地址/) })
await test('普通物流必须有地址并保留 LOGISTICS 场景', async () => { const h = harness(); h.products[0].fulfillmentMethods = ['普通物流']; const input = await inputFor(h.adapter); delete input.addressId; await assert.rejects(h.adapter.createTrade(input), /普通物流.*地址/); input.addressId = 'address-work'; const trade = await h.adapter.createTrade(input); assert.equal(trade.orders[0].addressSnapshot.detail, '大光路 88 号社区服务中心 2 楼') })
await test('社区自提无需收货地址、支付前无核销码', async () => { const adapter = createMallMockAdapter(); const input = await inputFor(adapter, buyNow, ['社区自提']); delete input.addressId; const trade = await adapter.createTrade(input); assert.equal(trade.orders[0].addressSnapshot, undefined); assert.equal(trade.orders[0].verificationCode, undefined); assert.ok(trade.orders[0].fulfillmentLocation.mobile) })
await test('到店核销无需地址、支付后生成凭证', async () => { const adapter = createMallMockAdapter(); const input = await inputFor(adapter, { productId: 'product-tissue', skuId: 'tissue-box', quantity: 1 }, ['到店核销']); delete input.addressId; const trade = await adapter.createTrade(input); assert.equal(trade.orders[0].verificationCode, undefined); const paid = await adapter.payTrade(trade.tradeId, 'success'); assert.equal(paid.orders[0].fulfillmentStatus, '待核销'); assert.ok(paid.orders[0].verificationCode) })
await test('地址页选择非默认地址不修改默认、会话隔离', async () => { const adapter = createMallMockAdapter(); useAdapter(adapter); const page = setupPage('member/address/index.vue'); page.onLoad({ select: '1', checkoutKey: 'selection-check' }); await ready(page.page); await page.page.choose('address-work'); assert.equal(selection.get('selection-check'), 'address-work'); assert.equal(selection.get('other-session'), undefined); assert.equal((await adapter.getAddresses()).find((address) => address.isDefault).id, 'address-default') })
await test('只有显式设为默认才改变默认标记', async () => { await service.setDefaultAddress('address-work'); const addresses = await service.getAddresses(); assert.equal(addresses.filter((address) => address.isDefault).length, 1); assert.equal(addresses.find((address) => address.isDefault).id, 'address-work') })
await test('提交前价格变化拒绝旧报价', async () => { const h = harness(); const input = await inputFor(h.adapter); h.products[0].skus[1].price += 100; await assert.rejects(h.adapter.createTrade(input), /价格或数量/); assert.equal((await h.adapter.getResidentOrders()).length, 3) })
await test('提交前 SKU 失效阻止创建', async () => { const h = harness(); const input = await inputFor(h.adapter); h.products[0].skus[1].valid = false; await assert.rejects(h.adapter.createTrade(input), /规格已失效/) })
await test('提交前库存不足阻止创建', async () => { const h = harness(); const input = await inputFor(h.adapter); h.products[0].skus[1].availableStock = 1; await assert.rejects(h.adapter.createTrade(input), /库存不足/) })
await test('提交前商户资格异常阻止创建', async () => { const h = harness(); const input = await inputFor(h.adapter); h.store.allowed = false; await assert.rejects(h.adapter.createTrade(input), /暂停交易/); h.store.allowed = true; h.qualification.formalTradeAllowed = false; await assert.rejects(h.adapter.createTrade(input), /资格不可用/) })
await test('相同会话重复提交返回同一交易且不重复预占', async () => { const h = harness(); const input = await inputFor(h.adapter, multi); const [first, second] = await Promise.all([h.adapter.createTrade(input), h.adapter.createTrade(input)]); assert.equal(first.tradeId, second.tradeId); assert.equal((await h.adapter.getResidentOrders()).length, 5); assert.equal(h.products[0].skus[0].availableStock, originals[0].skus[0].availableStock - 2) })
await test('第二个 SKU 预占失败全部回滚、购物车不丢失', async () => { const h = harness({ reserveFailure: true }); const before = structuredClone(h.products); await assert.rejects(h.adapter.createTrade(await inputFor(h.adapter, multi)), /second reserve/); assert.deepEqual(h.products, before); assert.equal(h.cart.length, 2); assert.equal((await h.adapter.getResidentOrders()).length, 3) })
await test('支付成功全部子订单同步，重复支付幂等', async () => { const adapter = createMallMockAdapter(); const trade = await adapter.createTrade(await inputFor(adapter, multi)); const paid = await adapter.payTrade(trade.tradeId, 'success'); assert.equal(paid.paymentStatus, '支付成功'); assert.equal(paid.paidAmount, 8970); assert.ok(paid.orders.every((order) => order.paymentStatus === '支付成功' && order.tradeStatus === '已支付')); assert.deepEqual(await adapter.payTrade(trade.tradeId, 'failure'), paid) })
await test('支付处理中不提前成功，显式查询才确认', async () => { const adapter = createMallMockAdapter(); const trade = await adapter.createTrade(await inputFor(adapter, multi)); const pending = await adapter.payTrade(trade.tradeId, 'unknown'); assert.equal(pending.paymentStatus, '支付中'); assert.ok(pending.orders.every((order) => order.paymentStatus === '支付中' && order.paidAmount === 0)); assert.equal((await adapter.getTrade(trade.tradeId)).paymentStatus, '支付中'); assert.equal((await adapter.payTrade(trade.tradeId, 'success')).paymentStatus, '支付中'); assert.equal((await adapter.queryTradePayment(trade.tradeId)).paymentStatus, '支付成功') })
await test('失败保留待付款及预占库存，可重试原 Trade', async () => { const h = harness(); const trade = await h.adapter.createTrade(await inputFor(h.adapter, multi)); const stock = structuredClone(h.products); const failed = await h.adapter.payTrade(trade.tradeId, 'failure'); assert.equal(failed.paymentStatus, '支付失败'); assert.ok(failed.orders.every((order) => order.tradeStatus === '待支付' && order.paymentStatus === '支付失败')); assert.deepEqual(h.products, stock); assert.equal((await h.adapter.payTrade(trade.tradeId, 'success')).paymentStatus, '支付成功') })
await test('取消整笔交易同步关闭所有子订单、库存只释放一次', async () => { const h = harness(); const before = structuredClone(h.products); const trade = await h.adapter.createTrade(await inputFor(h.adapter, multi)); await h.adapter.payTrade(trade.tradeId, 'failure'); await h.adapter.cancelTrade(trade.tradeId); assert.deepEqual(h.products, before); assert.ok((await h.adapter.getTrade(trade.tradeId)).orders.every((order) => order.paymentStatus === '已关闭')); await h.adapter.cancelTrade(trade.tradeId); assert.deepEqual(h.products, before); await assert.rejects(h.adapter.payTrade(trade.tradeId, 'success'), /已关闭/) })
await test('Mock Pay 不可用阻止创建', async () => { const adapter = createMallMockAdapter({ tradeOverrides: { mockPayAllowed: false } }); await assert.rejects(adapter.createTrade(await inputFor(adapter)), /模拟经营/) })
await test('商品下架及履约变化在提交时重新校验', async () => { const h = harness(); const input = await inputFor(h.adapter); h.products[0].saleStatus = '已下架'; await assert.rejects(h.adapter.createTrade(input), /未审核上架/); h.products[0].saleStatus = '销售中'; h.products[0].fulfillmentMethods = ['社区自提']; await assert.rejects(h.adapter.createTrade(input), /履约方式已变化/) })
await test('数量边界、失效项选择和清空按实时状态处理', async () => { const options = { storeOverrides: {} }; const adapter = createMallMockAdapter(options); for (const quantity of [0, -1, 1.1, NaN, Infinity]) await assert.rejects(adapter.updateCartQuantity('cart-vegetables', quantity), /正整数/); await assert.rejects(adapter.updateCartQuantity('cart-vegetables', 39), /库存不足/); options.storeOverrides['operator-linli'] = { enabled: false }; await adapter.toggleCartItem('cart-vegetables', true); let cart = await adapter.getCart(); assert.equal(cart.groups.length, 1); assert.equal(cart.invalidItems.find((item) => item.id === 'cart-vegetables').selected, false); await adapter.clearInvalidCart(); cart = await adapter.getCart(); assert.equal(cart.invalidItems.length, 0) })
await test('历史地址快照不受编辑删除影响，删除默认选择另一地址', async () => { const adapter = createMallMockAdapter(); const trade = await adapter.createTrade(await inputFor(adapter)); const snapshot = structuredClone(trade.orders[0].addressSnapshot); const address = await adapter.getAddress('address-default'); await adapter.saveAddress({ ...address, detail: '修改后的地址 123 号' }); await adapter.deleteAddress(address.id); assert.deepEqual((await adapter.getTrade(trade.tradeId)).orders[0].addressSnapshot, snapshot); assert.equal((await adapter.getAddresses()).find((item) => item.isDefault).id, 'address-work'); await adapter.deleteAddress('address-work'); const first = await adapter.saveAddress({ name: '居民', mobile: '13812345821', region: '南京市秦淮区', detail: '大光路社区 5 号', label: '家', isDefault: false }); assert.equal(first.isDefault, true) })
await test('过期交易关闭并释放全部库存', async () => { const h = harness(); const before = structuredClone(h.products); const trade = await h.adapter.createTrade(await inputFor(h.adapter, multi)); const clock = Date.now; try { Date.now = () => trade.expiresAt + 1; assert.equal((await h.adapter.getTrade(trade.tradeId)).paymentStatus, '已关闭'); assert.deepEqual(h.products, before) } finally { Date.now = clock } })
await test('购物车提交阶段错误不留下半笔交易', async () => { const h = harness({ removeFailure: true }); const before = structuredClone(h.products); await assert.rejects(h.adapter.createTrade(await inputFor(h.adapter, multi)), /cart atomic/); assert.deepEqual(h.products, before); assert.equal((await h.adapter.getResidentOrders()).length, 3); assert.equal(h.cart.length, 2) })
await test('确认页编译逻辑保留数量、地址选择、逐商户备注及重复点击防护', async () => {
  const adapter = createMallMockAdapter(); useAdapter(adapter); routes.length = 0
  const screen = setupPage('mall/confirm/index.vue'); screen.onLoad({ cartIds: multi.cartIds.join(',') }); await ready(screen.page)
  assert.equal(screen.page.choices.value.length, 2); screen.page.choices.value[0].fulfillmentMethod = '社区自提'
  screen.page.choices.value[0].buyerRemark = '自提备注'; screen.page.choices.value[1].buyerRemark = '配送备注'
  selection.select(screen.page.idempotencyKey, 'address-work'); await screen.onShow()
  assert.equal(screen.page.selectedAddress.value.id, 'address-work')
  await Promise.all([screen.page.submit(), screen.page.submit()])
  assert.equal(routes.length, 1); assert.match(routes[0], /tradeId=/)
  const trade = await adapter.getTrade(screen.page.submittedTradeId.value)
  assert.equal(trade.orders[1].addressSnapshot.detail, '大光路 88 号社区服务中心 2 楼')
  assert.equal(trade.orders[0].buyerRemark, '自提备注'); assert.equal(trade.orders[1].buyerRemark, '配送备注')
  await screen.page.submit(); assert.equal(routes.length, 1)
})
await test('购物车全选与商户选择统一计算及跨店路由', async () => { useAdapter(createMallMockAdapter()); routes.length = 0; const screen = setupPage('mall/cart/index.vue'); screen.onLoad(); await ready(screen.page); assert.equal(screen.page.selectedAmount.value, 8970); await screen.page.toggleAll(); assert.equal(screen.page.selectedCount.value, 0); await screen.page.toggleAll(); screen.page.checkout(); assert.match(decodeURIComponent(routes[0]), /cart-vegetables,cart-rice/); await screen.page.toggleGroup(screen.page.data.value.groups[0]); assert.equal(screen.page.selectedAmount.value, 4990) })
await test('支付页处理中主状态不提前成功、查询后所有订单一致', async () => { const adapter = createMallMockAdapter(); useAdapter(adapter); const trade = await adapter.createTrade(await inputFor(adapter, multi)); const screen = setupPage('pay/result/index.vue'); screen.onLoad({ tradeId: trade.tradeId }); await ready(screen.page); await screen.page.pay('unknown'); assert.equal(screen.page.title.value, '支付结果确认中'); assert.equal(screen.page.paid.value, false); await screen.page.query(); assert.equal(screen.page.title.value, '支付成功'); assert.ok(screen.page.data.value.orders.every((order) => order.paymentStatus === '支付成功')) })
await test('同一经营者的两个 Store 仍独立选择履约', async () => { const h = harness(); h.products[0].storeId = 'store-a'; h.products[1].storeId = 'store-b'; h.products[1].operatorId = h.products[0].operatorId; const context = await h.adapter.getCheckoutContext(multi); assert.deepEqual(context.merchantGroups.map((group) => group.storeId), ['store-a', 'store-b']); const trade = await h.adapter.createTrade(await inputFor(h.adapter, multi, ['社区自提', '商户配送'])); assert.deepEqual(trade.orders.map((order) => order.deliveryMethod), ['SELF_PICK_UP', 'LOCAL_TOWN_DELIVERY']) })
await test('不完整联系人和超长商户备注均拒绝提交', async () => { const adapter = createMallMockAdapter(); const input = await inputFor(adapter, buyNow, ['社区自提']); input.contact.mobile = '123'; await assert.rejects(adapter.createTrade(input), /11 位手机号/); input.contact.mobile = '13812345821'; input.merchantGroups[0].buyerRemark = '字'.repeat(101); await assert.rejects(adapter.createTrade(input), /100 字/) })
await test('不存在购物车 ID 不得静默漏单', async () => { const adapter = createMallMockAdapter(); await assert.rejects(adapter.getCheckoutContext({ cartIds: ['cart-vegetables', 'missing-cart'] }), /商品已移除/) })
console.log('PASS P0 batch 3: ' + count + ' adapter/service/compiled-page scenarios. Browser and WeChat device evidence are separate.')
