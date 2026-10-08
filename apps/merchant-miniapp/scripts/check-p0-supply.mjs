import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const nativeRequire = createRequire(path.join(root, 'package.json'))
const ts = nativeRequire('typescript')
const vue = nativeRequire('vue')
const { parse, compileScript } = nativeRequire('@vue/compiler-sfc')
const cache = new Map()
const routes = []
let pageLoad, pageShow
const query = { select() { return this }, boundingClientRect() { return this }, selectViewport() { return this }, scrollOffset() { return this }, exec(callback) { callback([{ top:1000 },{ scrollTop:0 }]) } }
const uni = { navigateTo: ({ url }) => routes.push(url), navigateBack() {}, showToast() {}, pageScrollTo() {}, createSelectorQuery:() => query, getWindowInfo:() => ({ statusBarHeight:0 }), getMenuButtonBoundingClientRect:() => ({ width:0 }), showModal: async () => ({ confirm:true }) }
function load(file, override) {
  const filename = path.resolve(root, file)
  if (!override && cache.has(filename)) return cache.get(filename).exports
  const module = { exports:{} }
  if (!override) cache.set(filename, module)
  const code = ts.transpileModule(override ?? readFileSync(filename, 'utf8'), { compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2020 } }).outputText
  const requireLocal = id => {
    if (id.endsWith('.vue')) return {}
    if (id === '@dcloudio/uni-app') return { onLoad:fn => { pageLoad = fn }, onShow:fn => { pageShow = fn } }
    if (id.startsWith('@/utils/')) return load('packages/common/utils/' + id.slice(8) + '.ts')
    if (id.startsWith('@/composables/')) return load('packages/common/composables/' + id.slice(14) + '.ts')
    if (id.startsWith('@/')) return load('apps/merchant-miniapp/src/' + id.slice(2) + '.ts')
    if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), id) + '.ts')
    return nativeRequire(id)
  }
  new Function('require','module','exports','uni',code)(requireLocal,module,module.exports,uni)
  return module.exports
}
const clone = value => JSON.parse(JSON.stringify(value))
const { createMallMockAdapter } = load('packages/business-common/mock/mall.ts')
const { createMerchantSupplyMockAdapter } = load('apps/merchant-miniapp/src/adapters/supply.ts')
const rules = load('apps/merchant-miniapp/src/features/supply/rules.ts')
const factory = options => createMerchantSupplyMockAdapter(createMallMockAdapter().getMerchantProducts, options)
const adapter = factory()
const goods = await adapter.getGoods()
assert.ok(goods.some(goods => goods.auditStatus === 'PASS' && goods.marketEnable === 'UPPER' && goods.skuList.length === 1))
assert.ok(goods.some(goods => goods.auditStatus === 'PASS' && goods.marketEnable === 'UPPER' && goods.skuList.length > 1))
assert.ok(goods.some(goods => goods.auditStatus === 'TOBEAUDITED'))
assert.ok(goods.some(goods => goods.auditStatus === 'REFUSE' && goods.authMessage))
assert.ok(goods.some(goods => goods.auditStatus === 'PASS' && goods.marketEnable === 'DOWN' && rules.goodsStock(goods) > 0))
assert.ok(goods.some(goods => rules.goodsStock(goods) === 0))
assert.ok(goods.some(goods => goods.draft))
for (const item of goods) {
  assert.ok(!('projectId' in item))
  assert.ok(item.skuList.every(sku => sku.sn && Number.isInteger(sku.price) && Number.isInteger(sku.cost) && Number.isInteger(sku.quantity) && sku.weight > 0))
}
console.log('PASS Goods/GoodsSku seed states, complete SKU fields and no Project contract')

let qualification = await adapter.getQualification()
assert.equal(qualification.baseBusinessReady,true)
assert.equal(qualification.tradeReady,false)
await assert.rejects(adapter.changeSaleStatus('goods-cucumber','up'),/支付|分账/)
await adapter.setQualificationDemo('ready')
await adapter.changeSaleStatus('goods-cucumber','up')
await adapter.changeSaleStatus('goods-cucumber','down')
for (const scenario of ['sharing-exception','agreement-expired','qualification-expired','store-closed']) {
  await adapter.setQualificationDemo(scenario)
  const current = await adapter.getQualification()
  assert.equal(current.tradeReady,false)
  assert.ok(current.tradeReasons.length)
  assert.equal(current.baseBusinessReady,scenario === 'sharing-exception')
  await assert.rejects(adapter.changeSaleStatus('goods-cucumber','up'))
  if (!current.baseBusinessReady) await assert.rejects(adapter.saveGoods(await adapter.getGood('goods-draft')))
}
await adapter.setQualificationDemo('ready')
await assert.rejects(adapter.changeSaleStatus('product-peach','up'),/审核/)
await assert.rejects(adapter.changeSaleStatus('product-water-dropwort','up'),/售罄/)
const forced = await adapter.getGood('goods-forced')
forced.forceOffShelf = false
assert.equal((await adapter.saveGoods(forced)).forceOffShelf,true)
await assert.rejects(adapter.changeSaleStatus('goods-forced','up'),/平台强制下架/)
console.log('PASS unified qualifications, transaction gating, pending/sold-out/forced-off-shelf guards')

const zero = await adapter.getGood('product-water-dropwort')
zero.skuList[0].quantity = 12
assert.equal((await adapter.saveGoods(zero)).auditStatus,'PASS')
await adapter.changeSaleStatus(zero.id,'up')
const changing = await adapter.getGood('goods-tomato')
changing.goodsName += '（新包装）'
const changed = await adapter.saveGoods(changing)
assert.equal(changed.draft,true)
assert.equal(changed.auditStatus,undefined)
assert.equal(changed.marketEnable,'DOWN')
await assert.rejects(adapter.changeSaleStatus(changed.id,'up'),/审核/)
const pending = await adapter.submitGoods(changed)
assert.equal(pending.auditStatus,'TOBEAUDITED')
await assert.rejects(adapter.saveGoods(pending),/审核中/)
await assert.rejects(adapter.submitGoods(pending),/审核中/)
await adapter.reviewGoodsDemo(pending.id,'REFUSE')
const rejected = await adapter.getGood(pending.id)
assert.ok(rejected.authMessage)
const rejectedSaved = await adapter.saveGoods(rejected)
assert.equal(rejectedSaved.auditStatus,'REFUSE')
await adapter.submitGoods(rejectedSaved)
await adapter.reviewGoodsDemo(pending.id,'PASS')
await adapter.changeSaleStatus(pending.id,'up')
await adapter.changeSaleStatus(pending.id,'down')
console.log('PASS inventory-only save, critical-edit re-audit, rejection/resubmission and approve/up/down chain')

for (const [key,value] of [['price',0],['price',1.5],['cost',-1],['cost',NaN],['quantity',-1],['quantity',1.5],['quantity',Infinity],['weight',0],['weight',NaN]]) {
  const invalid = clone(await adapter.getGood('goods-cucumber'))
  invalid.skuList[0][key] = value
  await assert.rejects(adapter.submitGoods(invalid))
}
const duplicate = await adapter.getGood('product-vegetables')
duplicate.skuList[1].sn = duplicate.skuList[0].sn
await assert.rejects(adapter.submitGoods(duplicate),/编码不能重复/)
duplicate.skuList[1].sn = 'UNIQUE-DEMO-SN'
duplicate.skuList[1].specs = clone(duplicate.skuList[0].specs)
await assert.rejects(adapter.submitGoods(duplicate),/组合不能重复/)
const otherCode = await adapter.getGood('goods-cucumber')
otherCode.skuList[0].sn = (await adapter.getGood('goods-draft')).skuList[0].sn
await assert.rejects(adapter.saveGoods(otherCode),/其他商品/)
const foreign = await adapter.getGood('goods-cucumber')
foreign.storeId = 'another-store'
await assert.rejects(adapter.saveGoods(foreign),/其他店铺/)
const draft = await adapter.newGood()
const savedDraft = await adapter.saveGoods(draft)
assert.ok(savedDraft.id && savedDraft.draft)
await assert.rejects(adapter.submitGoods(savedDraft),/商品名称/)
const fresh = clone(await adapter.getGood('goods-cucumber'))
delete fresh.id
fresh.skuList[0].sn = 'NEW-RETAIL-DEMO'
const beforeCount = (await adapter.getGoods()).length
const concurrent = await Promise.allSettled([adapter.submitGoods(fresh),adapter.submitGoods(fresh)])
assert.equal(concurrent.filter(result => result.status === 'fulfilled').length,1)
assert.equal((await adapter.getGoods()).length,beforeCount + 1)
console.log('PASS strict SKU numeric/code/combination validation, store scope, partial drafts and duplicate-submit guard')

await adapter.setApplicationDemo('APPLY')
let application = (await adapter.getApplication()).application
assert.deepEqual(rules.validateApplication(application),{})
application.storeName = '供给链路演示店'
application.currentStep = 3
const applicationSaved = await adapter.saveApplication(application)
assert.equal(applicationSaved.currentStep,3)
await adapter.submitApplication(applicationSaved)
await assert.rejects(adapter.saveApplication(applicationSaved),/只读/)
await assert.rejects(adapter.submitApplication(applicationSaved),/重复提交/)
await adapter.reviewApplicationDemo('REFUSED')
application = (await adapter.getApplication()).application
assert.ok(application.rejectionReason)
await adapter.saveApplication(application)
await adapter.submitApplication(application)
await adapter.reviewApplicationDemo('OPEN')
assert.equal((await adapter.getApplication()).application.storeName,'供给链路演示店')
assert.equal((await adapter.getQualification()).tradeReady,false)
assert.equal((await adapter.getQualification()).baseBusinessReady,false)
await adapter.setQualificationDemo('ready')
assert.equal((await adapter.getQualification()).baseBusinessReady,true)
assert.equal((await adapter.getQualification()).tradeReady,true)
for (const field of ['licenseImages','legalIdImages','storeLogo','categoryIds','qualificationImages']) {
  const invalid = clone(application)
  invalid[field] = []
  assert.ok(Object.keys(rules.validateApplication(invalid)).length)
}
const invalidCoordinates = clone(application)
invalidCoordinates.longitude = '181'
invalidCoordinates.latitude = 'NaN'
invalidCoordinates.email = 'invalid'
assert.ok(rules.validateApplication(invalidCoordinates).longitude)
assert.ok(rules.validateApplication(invalidCoordinates).latitude)
assert.ok(rules.validateApplication(invalidCoordinates).email)
console.log('PASS five-step Store application, attachments/coordinates, review locks, rejection and qualification separation')

function setup(file, props = {}, context = {}) {
  const filename = 'apps/merchant-miniapp/src/' + file
  const { descriptor } = parse(readFileSync(path.join(root,filename),'utf8'))
  const component = load(filename,compileScript(descriptor,{ id:'merchant-supply-check' }).content).default
  const page = component.setup(props,{ expose() {}, emit() {}, ...context })
  return { page,onLoad:pageLoad,onShow:pageShow }
}
async function ready(page) {
  for (let attempt=0;attempt<100 && page.status.value === 'loading';attempt++) await new Promise(resolve => setTimeout(resolve,5))
  assert.equal(page.status.value,'ready')
}
const { merchantSupplyService } = load('apps/merchant-miniapp/src/services/supply.ts')
await merchantSupplyService.setApplicationDemo('OPEN')
await merchantSupplyService.setQualificationDemo('ready')
const list = setup('pages/operation/index.vue')
list.onLoad({ filter:'pending' })
await ready(list.page)
assert.equal(list.page.activeFilter.value,'待审核')
assert.ok(list.page.products.value.every(goods => goods.auditStatus === 'TOBEAUDITED'))
list.page.edit(list.page.products.value[0])
assert.match(routes.pop(),/pages\/product\/editor\/index\?id=/)
list.onShow()
assert.equal(list.page.status.value,'ready')

const editor = setup('pages/product/editor/index.vue')
await editor.onLoad({})
const page = editor.page
assert.equal(page.title.value,'新增商品')
await page.persist(true)
assert.ok(page.errors.value.goodsName)
assert.ok(page.errors.value['sku.0.sn'])
page.form.value = { ...page.form.value, goodsName:'手机端新增演示商品', goodsImage:'/static/images/catalog/vegetables.png', goodsGallery:['/static/images/catalog/vegetables.png'], sellingPoint:'现场验证字段完整', detail:'普通实物演示商品', skuList:[{ ...page.form.value.skuList[0], sn:'MOBILE-NEW-001', price:1990, cost:1200, quantity:36, weight:0.5 }] }
const pageCount = (await merchantSupplyService.getGoods()).length
await Promise.all([page.persist(true),page.persist(true)])
assert.equal((await merchantSupplyService.getGoods()).length,pageCount + 1)
assert.equal(page.form.value.auditStatus,'TOBEAUDITED')
assert.equal(page.readonly.value,true)
await merchantSupplyService.reviewGoodsDemo(page.form.value.id,'PASS')
await page.refreshDemo()
assert.equal(page.primaryLabel.value,'上架')
await page.primary()
assert.equal(page.form.value.marketEnable,'UPPER')
await page.primary()
assert.equal(page.form.value.marketEnable,'DOWN')
await merchantSupplyService.setQualificationDemo('payment-pending')
editor.onShow()
await new Promise(resolve => setTimeout(resolve,0))
assert.equal(page.canPrimary.value,false)

const props = vue.reactive({ modelValue:clone(page.form.value.skuList), readonly:false, errors:{} })
const sku = setup('features/supply/SkuEditor.vue',props,{ emit(event,value) { if (event === 'update:modelValue') props.modelValue = value } }).page
sku.setNumber(0,'price','12.345')
assert.ok(Number.isNaN(props.modelValue[0].price))
sku.setNumber(0,'price','12.50')
sku.setNumber(0,'quantity','1.5')
assert.equal(props.modelValue[0].price,1250)
assert.ok(Number.isNaN(props.modelValue[0].quantity))
sku.setNumber(0,'quantity','36')
sku.addSku()
assert.equal(props.modelValue.length,2)
assert.equal(props.modelValue[1].isMain,false)
sku.removeSku(0)
assert.equal(props.modelValue[0].isMain,true)

await merchantSupplyService.setApplicationDemo('APPLY')
const applicationPage = setup('pages/onboarding/application/index.vue')
await applicationPage.onLoad()
applicationPage.page.form.value.currentStep = 2
applicationPage.page.form.value.mobile = 'invalid'
applicationPage.page.next()
assert.equal(applicationPage.page.form.value.currentStep,2)
assert.ok(applicationPage.page.errors.value.mobile)
applicationPage.page.form.value.mobile = '13900000000'
applicationPage.page.next()
assert.equal(applicationPage.page.form.value.currentStep,3)
console.log('PASS compiled list navigation/filter/refresh, editor fields/review/up-down/duplicate guards and SKU input precision')
console.log('PASS P0 batch 2 merchant supply checks')
