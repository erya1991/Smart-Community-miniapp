import type { MallProduct } from '@/types/mall'
import type { ApplicationEvent, StoreApplication, StoreStatus, SupplyGoods, SupplyQualification, SupplyScenario } from '../features/supply/types'
import { goodsStock, needsNewAudit, validateApplication, validateGoods } from '../features/supply/rules'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const timestamp = () => new Date().toISOString().replace('T', ' ').slice(0, 16)
const storeId = 'store-daguanglu'
const categories = [
  { id: 'category-fresh', name: '生鲜果蔬' },
  { id: 'category-grain', name: '米面粮油' },
  { id: 'category-household', name: '生活日用' },
  { id: 'category-food', name: '熟食餐饮' },
]
const applicationSeed: StoreApplication = {
  id: 'store-application-demo', storeStatus: 'OPEN', subjectType: 'individual-business',
  subjectName: '南京市秦淮区邻里生鲜果蔬店', licenseNumber: '92320104MA27000001',
  licenseImages: ['营业执照示例.jpg'], legalScope: '食品销售、食用农产品零售',
  legalName: '示例经营者', legalId: 'DEMO-ID-001', legalIdImages: ['经营者证件示例.jpg'],
  contactName: '示例联系人', mobile: '13900000000', email: '',
  storeName: '邻里生鲜（大光路店）', storeLogo: ['店铺Logo示例.jpg'],
  description: '社区周边生鲜直供，方便邻里日常采购。', storeAddress: '南京市秦淮区大光路138号',
  longitude: '118.806', latitude: '32.019', categoryIds: ['category-fresh'], storePhone: '13900000000',
  qualificationImages: ['食品经营资质示例.jpg'], otherImages: [], currentStep: 1,
  savedAt: '2026-10-04 09:00', submittedAt: '2026-10-04 09:10', reviewedAt: '2026-10-04 10:00',
}

function mapLegacyGoods(product: MallProduct): SupplyGoods {
  return {
    id: product.id, storeId, goodsName: product.name,
    categoryId: categories.find(category => category.name === product.category)?.id || categories[0].id,
    goodsImage: product.mainImage, goodsGallery: [...product.gallery], unit: product.id === 'product-eggs' ? '盒' : '份',
    sellingPoint: product.sellingPoint, detail: product.detail, deliveryMethods: [...product.fulfillmentMethods],
    deliveryNote: product.deliveryNote, afterSaleNote: product.afterSaleNote,
    skuList: product.skus.map(sku => ({
      id: sku.id, specs: sku.specValues || { '规格': sku.name }, sn: sku.code,
      price: sku.price, cost: Math.round(sku.price * 0.6), quantity: sku.availableStock,
      weight: sku.id === 'veg-family' ? 2.5 : sku.id === 'veg-two' ? 1.2 : product.id === 'product-peach' ? 3.8 : 0.5,
      skuImage: sku.image, isMain: Boolean(sku.isMain),
    })),
    draft: product.auditStatus === '草稿',
    auditStatus: product.auditStatus === '已通过' ? 'PASS' : product.auditStatus === '待审核' ? 'TOBEAUDITED' : product.auditStatus === '已驳回' ? 'REFUSE' : undefined,
    marketEnable: product.saleStatus === '销售中' ? 'UPPER' : 'DOWN', authMessage: product.rejectionReason,
    forceOffShelf: false,
  }
}

export function createMerchantSupplyMockAdapter(getLegacyProducts: () => Promise<MallProduct[]>, options: { scenario?: SupplyScenario; applicationStatus?: StoreStatus } = {}) {
  let scenario: SupplyScenario = options.scenario || 'payment-pending'
  let agreementExists = true
  let application = clone(applicationSeed)
  if (options.applicationStatus) application.storeStatus = options.applicationStatus
  let history: ApplicationEvent[] = [{ id: 'application-approved', title: '商户审核已通过', description: '店铺已开通，合作与正式交易条件需单独核对。', occurredAt: application.reviewedAt!, tone: 'success' }]
  let goodsPromise: Promise<SupplyGoods[]> | undefined
  let sequence = 0
  const inFlight = new Set<string>()
  const runMutation = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    if (inFlight.has(key)) throw new Error('操作正在处理中，请勿重复提交')
    inFlight.add(key)
    try { return await operation() } finally { inFlight.delete(key) }
  }
  const getGoodsSource = () => {
    if (!goodsPromise) goodsPromise = getLegacyProducts().then(products => {
      const goods = products.map(mapLegacyGoods)
      const template = goods[0]
      if (!template) throw new Error('商品 Mock 种子缺失')
      const extra = (id: string, name: string, quantity: number, price: number, state: 'active' | 'down' | 'draft' | 'forced'): SupplyGoods => ({
        ...clone(template), id, goodsName: name, unit: '袋', draft: state === 'draft',
        auditStatus: state === 'draft' ? undefined : 'PASS', marketEnable: state === 'active' ? 'UPPER' : 'DOWN',
        sellingPoint: '当日鲜采，分装便捷。', detail: '社区日常鲜蔬，建议冷藏保存。',
        skuList: [{ id: id + '-sku', specs: { '规格': '500g 袋装' }, sn: id.toUpperCase(), price, cost: Math.round(price * 0.6), quantity, weight: 0.5, isMain: true }],
        forceOffShelf: state === 'forced', authMessage: state === 'forced' ? '平台已强制下架，请完善材料并联系平台解除限制。' : undefined,
      })
      goods.push(extra('goods-tomato', '鲜采番茄便民装', 36, 990, 'active'))
      goods.push(extra('goods-cucumber', '时令黄瓜便民装', 18, 790, 'down'))
      goods.push(extra('goods-draft', '青菜净菜装', 10, 590, 'draft'))
      goods.push(extra('goods-forced', '蔬菜组合礼盒', 20, 1590, 'forced'))
      return goods
    })
    return goodsPromise
  }
  const qualification = (): SupplyQualification => {
    const storeEnabled = application.storeStatus === 'OPEN' && scenario !== 'store-closed'
    const necessaryQualificationsValid = scenario !== 'qualification-expired'
    const agreementActive = agreementExists && scenario !== 'agreement-expired'
    const paymentStatus = scenario === 'payment-pending' ? 'pending' : 'ready'
    const profitSharingStatus = scenario === 'sharing-exception' ? 'exception' : scenario === 'payment-pending' ? 'pending' : 'ready'
    const baseReasons: string[] = []
    if (application.storeStatus === 'APPLY') baseReasons.push('商户入驻申请尚未提交')
    if (application.storeStatus === 'APPLYING') baseReasons.push('商户入驻审核中')
    if (application.storeStatus === 'REFUSED') baseReasons.push('商户入驻审核未通过：' + (application.rejectionReason || '请完善申请资料'))
    if (!storeEnabled && ['OPEN', 'CLOSED'].includes(application.storeStatus)) baseReasons.push('店铺已停用')
    if (!necessaryQualificationsValid) baseReasons.push('必要经营资质已失效，请补充有效资质')
    if (!agreementActive) baseReasons.push(agreementExists ? '合作协议已失效，请联系平台续签' : '合作协议尚未建立，请联系平台')
    const tradeReasons = [...baseReasons]
    if (paymentStatus !== 'ready') tradeReasons.push('支付接入待配置')
    if (profitSharingStatus !== 'ready') tradeReasons.push(profitSharingStatus === 'exception' ? '分账接入异常，请联系平台处理' : '分账关系待完善')
    return {
      storeId, storeName: application.storeName, subjectName: application.subjectName, storeStatus: scenario === 'store-closed' ? 'CLOSED' : application.storeStatus,
      storeEnabled, necessaryQualificationsValid,
      agreement: { no: 'DGL-COOP-2026-001', name: '大光路社区商城合作协议', version: 'V1.0', status: !agreementExists ? 'missing' : agreementActive ? 'active' : 'expired', startsAt: agreementExists ? '2026-09-01' : '', endsAt: agreementExists ? agreementActive ? '2027-08-31' : '2026-09-30' : '', attachment: agreementExists ? '社区商城合作协议示例.pdf' : '', scope: '生鲜果蔬、社区实物零售', commissionSummary: '按平台生效佣金规则执行，商户只读。', afterSaleSummary: '按平台售后规则处理，生鲜问题及时协商。' },
      paymentStatus, profitSharingStatus, profitSharingRequired: true,
      baseBusinessReady: baseReasons.length === 0, tradeReady: tradeReasons.length === 0,
      baseReasons, tradeReasons, checkedAt: timestamp(),
    }
  }
  const assertBase = () => { const result = qualification(); if (!result.baseBusinessReady) throw new Error(result.baseReasons.join('；')) }
  const findGoods = async (id: string) => {
    const goods = (await getGoodsSource()).find(item => item.id === id && item.storeId === storeId)
    if (!goods) throw new Error('商品不存在或无权查看，请返回商品管理')
    return goods
  }
  const validatePayload = async (payload: SupplyGoods, strict: boolean) => {
    if (payload.storeId !== storeId) throw new Error('无权维护其他店铺商品')
    const errors = validateGoods(payload, strict)
    if (!categories.some(category => category.id === payload.categoryId)) errors.categoryId = '请选择有效商品类目'
    const products = await getGoodsSource()
    const otherCodes = new Set(products.filter(goods => goods.id !== payload.id).flatMap(goods => goods.skuList.map(sku => sku.sn.trim())))
    if (payload.skuList.some(sku => sku.sn.trim() && otherCodes.has(sku.sn.trim()))) errors.skuList = 'SKU 编码已被其他商品使用，请使用独立编码'
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
  }
  const saveGoods = (payload: SupplyGoods, submit: boolean) => runMutation(payload.id || 'new-goods', async () => {
    assertBase()
    await validatePayload(payload, submit)
    const products = await getGoodsSource()
    const current = payload.id ? await findGoods(payload.id) : undefined
    if (current?.auditStatus === 'TOBEAUDITED') throw new Error('商品审核中，关键资料不可修改')
    const next = clone(payload)
    if (!current) {
      next.id = 'merchant-goods-' + Date.now() + '-' + (++sequence)
      next.forceOffShelf = false
      next.marketEnable = 'DOWN'
      next.draft = true
      next.auditStatus = undefined
      next.authMessage = undefined
    } else {
      next.id = current.id
      next.forceOffShelf = current.forceOffShelf
      next.marketEnable = current.marketEnable
      next.auditStatus = current.auditStatus
      next.draft = current.draft
      next.authMessage = current.authMessage
      if (current.auditStatus === 'PASS' && needsNewAudit(current, next)) {
        next.draft = true
        next.auditStatus = undefined
        next.marketEnable = 'DOWN'
      }
    }
    if (submit) {
      next.draft = false
      next.auditStatus = 'TOBEAUDITED'
      next.marketEnable = 'DOWN'
      next.authMessage = undefined
    }
    if (current) Object.assign(current, next)
    else products.unshift(next)
    return clone(next)
  })

  return {
    getCategories: async () => clone(categories),
    getQualification: async () => clone(qualification()),
    getApplication: async () => ({ application: clone(application), history: clone(history), categories: clone(categories) }),
    saveApplication: (payload: StoreApplication) => runMutation('application', async () => {
      if (!['APPLY', 'REFUSED'].includes(application.storeStatus)) throw new Error('申请审核中或已通过，核心申请资料只读')
      const state = application.storeStatus
      application = { ...clone(payload), id: application.id, storeStatus: state, savedAt: timestamp(), rejectionReason: application.rejectionReason }
      return clone(application)
    }),
    submitApplication: (payload: StoreApplication) => runMutation('application', async () => {
      if (!['APPLY', 'REFUSED'].includes(application.storeStatus)) throw new Error('已有申请或已开通店铺，请勿重复提交')
      const errors = validateApplication(payload)
      if (payload.categoryIds.some(id => !categories.some(category => category.id === id))) errors.categoryIds = '请选择有效经营类目'
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0])
      application = { ...clone(payload), id: application.id, storeStatus: 'APPLYING', currentStep: 5, savedAt: timestamp(), submittedAt: timestamp(), reviewedAt: undefined, rejectionReason: undefined }
      history.unshift({ id: 'application-' + (++sequence), title: '已提交入驻审核', description: '申请资料已锁定，等待平台审核。', occurredAt: timestamp(), tone: 'pending' })
      return clone(application)
    }),
    // Only used by explicitly labelled prototype demonstration controls.
    setApplicationDemo: async (state: StoreStatus) => {
      application = { ...clone(applicationSeed), storeStatus: state, reviewedAt: ['OPEN', 'REFUSED'].includes(state) ? timestamp() : undefined, submittedAt: state === 'APPLY' ? undefined : timestamp(), rejectionReason: state === 'REFUSED' ? '营业执照影像不清晰，请重新上传；请补齐经营者证件附件。' : undefined }
      history = [{ id: 'application-demo', title: state === 'OPEN' ? '商户审核已通过' : state === 'REFUSED' ? '入驻申请已驳回' : state === 'APPLYING' ? '平台审核中' : '申请草稿', description: application.rejectionReason || '原型场景数据，未连接平台审核。', occurredAt: timestamp(), tone: state === 'OPEN' ? 'success' : state === 'REFUSED' ? 'error' : 'pending' }]
      scenario = 'payment-pending'
      agreementExists = state === 'OPEN'
    },
    reviewApplicationDemo: (decision: 'OPEN' | 'REFUSED') => runMutation('application', async () => {
      if (application.storeStatus !== 'APPLYING') throw new Error('仅审核中的申请可演示平台审核结果')
      application.storeStatus = decision
      application.reviewedAt = timestamp()
      application.rejectionReason = decision === 'REFUSED' ? '营业执照影像不清晰，请重新上传经营者证件附件。' : undefined
      history.unshift({ id: 'review-' + (++sequence), title: decision === 'OPEN' ? '商户审核已通过' : '入驻审核已驳回', description: application.rejectionReason || '店铺已开通，还需完成合作及正式交易条件。', occurredAt: timestamp(), tone: decision === 'OPEN' ? 'success' : 'error' })
    }),
    setQualificationDemo: async (value: SupplyScenario) => { scenario = value; agreementExists = true },
    getGoods: async () => clone(await getGoodsSource()),
    getGood: async (id: string) => clone(await findGoods(id)),
    newGood: async (): Promise<SupplyGoods> => ({
      storeId, goodsName: '', categoryId: categories[0].id, goodsImage: '', goodsGallery: [], unit: '份', sellingPoint: '', detail: '',
      deliveryMethods: ['社区自提'], deliveryNote: '', afterSaleNote: '',
      skuList: [{ id: 'sku-new-' + (++sequence), specs: { '规格': '默认规格' }, sn: '', price: 0, cost: 0, quantity: 0, weight: 0, isMain: true }],
      draft: true, marketEnable: 'DOWN', forceOffShelf: false,
    }),
    saveGoods: (payload: SupplyGoods) => saveGoods(payload, false),
    submitGoods: (payload: SupplyGoods) => saveGoods(payload, true),
    changeSaleStatus: (id: string, action: 'up' | 'down') => runMutation(id, async () => {
      const goods = await findGoods(id)
      if (action === 'up') {
        const result = qualification()
        if (!result.tradeReady) throw new Error(result.tradeReasons.join('；'))
        if (goods.draft || goods.auditStatus !== 'PASS') throw new Error('商品审核通过后才可上架')
        if (goods.forceOffShelf) throw new Error('平台强制下架限制尚未解除，请联系平台')
        await validatePayload(goods, true)
        if (goodsStock(goods) === 0) throw new Error('商品已售罄，请先编辑库存')
        goods.marketEnable = 'UPPER'
      } else {
        if (goods.marketEnable !== 'UPPER') throw new Error('当前商品已下架')
        goods.marketEnable = 'DOWN'
      }
      return clone(goods)
    }),
    reviewGoodsDemo: (id: string, decision: 'PASS' | 'REFUSE') => runMutation(id, async () => {
      const goods = await findGoods(id)
      if (goods.auditStatus !== 'TOBEAUDITED') throw new Error('只有待审核商品可以演示审核结果')
      goods.auditStatus = decision
      goods.draft = false
      goods.marketEnable = 'DOWN'
      goods.authMessage = decision === 'REFUSE' ? '请补充清晰商品图并核对规格、重量后重新提交。' : undefined
      return clone(goods)
    }),
  }
}
