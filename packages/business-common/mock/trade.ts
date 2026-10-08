import type {
  CartItem,
  CheckoutContext,
  CheckoutRequest,
  CheckoutMerchantGroup,
  CreateTradeInput,
  CreateTradeOrderInput,
  FulfillmentMethod,
  FulfillmentStatus,
  MallProduct,
  MemberAddress,
  PaymentStatus,
  ProductSku,
  TradeOrder,
  TradeOrderItem,
  TradeQualificationCheck,
  TradeSummary,
  MerchantOrderContext,
} from '../../common/types/mall'
import { createMerchantFulfillmentMockAdapter } from './fulfillment'

type StockAction = 'reserve' | 'release'

interface TradeDependencies {
  projectId: string
  operatorId: string
  findProduct: (id: string) => MallProduct | undefined
  findSku: (productId: string, skuId: string) => ProductSku | undefined
  getCartItems: (ids?: string[]) => CartItem[]
  removeCartItems: (ids: string[]) => void
  updateStock: (productId: string, skuId: string, quantity: number, action: StockAction) => void
  getQualification: () => TradeQualificationCheck
  getStoreEligibility?: (product: MallProduct) => { allowed: boolean; reason: string }
  demoStores?: () => MerchantOrderContext[]
  fulfillmentDemoSeeds?: boolean
}

const clone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value)) as T
const now = () => { const date = new Date(); const pad = (value: number) => String(value).padStart(2, '0'); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` }
const maskMobile = (mobile: string) => `${mobile.slice(0, 3)}****${mobile.slice(-4)}`
const unique = <T>(values: T[]) => [...new Set(values)]

const displayStatus = (order: TradeOrder) => {
  if (order.tradeStatus === '已关闭' || order.paymentStatus === '已关闭') return '已关闭'
  if (order.paymentStatus === '未支付' || order.paymentStatus === '支付中' || order.paymentStatus === '支付失败') return '待支付'
  if (order.tradeStatus === '已完成') return '已完成'
  return order.fulfillmentStatus
}

export function createMallTradeMockAdapter(deps: TradeDependencies) {
  let addresses: MemberAddress[] = [
    { id: 'address-default', name: '王阿姨', mobile: '13812345821', region: '江苏省南京市秦淮区', detail: '大光路街道大光新村 12 幢 2 单元 302 室', label: '家', isDefault: true },
    { id: 'address-work', name: '王阿姨', mobile: '13812345821', region: '江苏省南京市秦淮区', detail: '大光路 88 号社区服务中心 2 楼', label: '常用', isDefault: false },
  ]
  const makeItem = (productId: string, skuId: string, quantity: number): TradeOrderItem => {
    const product = deps.findProduct(productId)
    const sku = deps.findSku(productId, skuId)
    if (!product || !sku) throw new Error('商品或规格已发生变化，请返回商城刷新。')
    return { productId, skuId, productName: product.name, productImage: sku.image || product.mainImage, category: product.category, skuName: sku.name, quantity, unitPrice: sku.price, afterSaleNote: product.afterSaleNote }
  }
  const createSeed = (id: string, no: string, method: FulfillmentMethod, fulfillmentStatus: FulfillmentStatus, item: TradeOrderItem): TradeOrder => ({
    id, no, projectId: deps.projectId, operatorId: deps.operatorId, merchantName: '邻里生鲜', storeName: '大光路店', storeAddress: '秦淮区大光路138号邻里集市1楼', memberName: '王阿姨', memberMobile: '13812345821', items: [item], fulfillmentMethod: method,
    tradeStatus: fulfillmentStatus === '已完成' ? '已完成' : '履约中', paymentStatus: 'Mock成功', fulfillmentStatus, afterSaleStatus: '无售后', refundStatus: '无退款', profitSharingStatus: fulfillmentStatus === '已完成' ? '待分账' : '未开始', goodsAmount: item.unitPrice * item.quantity, deliveryFee: 0, discountAmount: 0, payableAmount: item.unitPrice * item.quantity, paidAmount: item.unitPrice * item.quantity, payOrderId: `pay-${id}`, createdAt: '2026-09-18 09:30:15', paidAt: '2026-09-18 09:30:28', contactSnapshot: { name: '王阿姨', mobile: '13812345821' }, addressSnapshot: method === '商户配送' ? { name: '王阿姨', mobile: '13812345821', region: '江苏省南京市秦淮区', detail: '大光路街道大光新村 12 幢 2 单元 302 室', label: '家' } : undefined, pickupPoint: method === '社区自提' ? '大光路社区服务点（生鲜恒温柜）' : method === '到店核销' ? '邻里生鲜（大光路店）' : undefined, verificationCode: method === '商户配送' ? undefined : id === 'trade-pickup' ? 'HX-88260904' : 'HX-88260905', verificationStatus: method === '商户配送' ? undefined : fulfillmentStatus === '已完成' ? '已核销' : '待核销', timeline: [{ time: '2026-09-18 09:30:15', title: '订单已支付', description: '模拟支付成功，商户已收到履约待办。' }, { time: '2026-09-18 09:45:00', title: fulfillmentStatus, description: method === '商户配送' ? '商户正在安排社区配送。' : '请携带核销码到指定地点核对商品。' }],
  })
  const vegetable = makeItem('product-vegetables', 'veg-family', 1)
  let orders: TradeOrder[] = [
    createSeed('trade-delivery', 'DGL202609180001', '商户配送', '待备货', vegetable),
    createSeed('trade-pickup', 'DGL202609180002', '社区自提', '待自提', vegetable),
    createSeed('trade-store', 'DGL202609180003', '到店核销', '待核销', vegetable),
  ]
  if (deps.fulfillmentDemoSeeds) {
    const logistics = createSeed('demo-logistics', 'DGL-DEMO-LOGISTICS', '普通物流', '待备货', vegetable)
    logistics.verificationCode = undefined; logistics.verificationStatus = undefined
    logistics.deliveryMethod = 'LOGISTICS'; logistics.addressSnapshot = clone(orders[0].addressSnapshot)
    orders.push(logistics)
    for (const [id, paymentStatus] of [['unpaid', '未支付'], ['pending', '支付中'], ['failed', '支付失败'], ['closed', '已关闭']] as const) {
      const order = createSeed(`demo-${id}`, `DGL-DEMO-${id.toUpperCase()}`, '社区自提', '待备货', vegetable)
      order.paymentStatus = paymentStatus; order.paidAmount = 0; order.paidAt = undefined
      order.tradeStatus = paymentStatus === '已关闭' ? '已关闭' : '待支付'
      order.verificationCode = `DEMO-${id.toUpperCase()}`
      orders.push(order)
    }
  }
  const submitted = new Map<string, string>()
  const trades: TradeSummary[] = []
  let sequence = 0
  let merchantContext: MerchantOrderContext = { storeId: deps.operatorId, operatorId: deps.operatorId, storeName: '邻里生鲜（大光路店）', operatorName: '店长张华' }

  const appendTimeline = (order: TradeOrder, title: string, description: string) => order.timeline.unshift({ time: now(), title, description })
  const getAddress = (id?: string) => id ? addresses.find((item) => item.id === id) : addresses.find((item) => item.isDefault)
  const getItems = (request: CheckoutRequest) => {
    if (request.cartIds?.length) {
      const ids = unique(request.cartIds)
      const cart = deps.getCartItems(ids)
      if (cart.length !== ids.length) throw new Error('部分购物车商品已移除，请返回重新选择。')
      return cart.map((item) => makeItem(item.productId, item.skuId, item.quantity))
    }
    if (request.productId && request.skuId) {
      const quantity = request.quantity ?? 1
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('购买数量必须为正整数。')
      return [makeItem(request.productId, request.skuId, quantity)]
    }
    throw new Error('未找到待结算商品，请返回购物车重新选择。')
  }
  const ensureCheckout = (request: CheckoutRequest): CheckoutContext => {
    const items = getItems(request)
    const products = items.map((item) => deps.findProduct(item.productId))
    if (products.some((item) => !item || item.saleStatus !== '销售中' || item.auditStatus !== '已通过')) throw new Error('部分商品未审核上架，请返回购物车刷新后重新结算。')
    items.forEach((item) => {
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('购买数量必须为正整数。')
      const product = deps.findProduct(item.productId)!
      const eligibility = deps.getStoreEligibility?.(product)
      if (eligibility && !eligibility.allowed) throw new Error(`${product.storeName}：${eligibility.reason}`)
      const sku = deps.findSku(item.productId, item.skuId)
      if (!sku || sku.valid === false) throw new Error(`“${item.productName}”规格已失效，请重新选择。`)
      if (!Number.isSafeInteger(sku.price) || sku.price < 0) throw new Error(`“${item.productName}”价格异常，请联系商户。`)
      const quantity = items.filter((entry) => entry.productId === item.productId && entry.skuId === item.skuId).reduce((sum, entry) => sum + entry.quantity, 0)
      if (sku.availableStock < quantity) throw new Error(`“${item.productName}”库存不足，当前仅剩 ${sku.availableStock} 件。`)
    })
    const merchantGroups: CheckoutMerchantGroup[] = unique(products.map((product) => product!.storeId || product!.operatorId)).map((storeId) => {
      const groupProducts = products.filter((product) => (product!.storeId || product!.operatorId) === storeId) as MallProduct[]
      const product = groupProducts[0]
      const groupItems = items.filter((item) => groupProducts.some((entry) => entry.id === item.productId))
      const fulfillmentMethods = groupProducts.slice(1).reduce<FulfillmentMethod[]>((result, entry) => result.filter((method) => entry.fulfillmentMethods.includes(method)), [...product.fulfillmentMethods])
      if (!fulfillmentMethods.length) throw new Error(`${product.storeName}所选商品没有共同履约方式，请调整商品。`)
      const goodsAmount = groupItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
      const location = { id: `store-${storeId}`, name: `${product.merchantName}（${product.storeName}）`, address: product.storeAddress, mobile: '02552345678', hours: '07:00—21:30', instructions: '支付成功后凭核销码到店取货，请当场核对商品。' }
      return { storeId, operatorId: product.operatorId, merchantName: product.merchantName, storeName: product.storeName, storeAddress: product.storeAddress, items: groupItems, fulfillmentMethods, defaultFulfillment: fulfillmentMethods[0], pickupPoints: [{ ...location, id: `pickup-${storeId}`, instructions: '支付成功后凭提货码到指定自提点领取。' }], verificationStore: location, deliveryNote: product.deliveryNote, goodsAmount, deliveryFee: 0, discountAmount: 0, payableAmount: goodsAmount }
    })
    const goodsAmount = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
    if (!Number.isSafeInteger(goodsAmount)) throw new Error('商品总金额异常，请调整购买数量。')
    const address = getAddress()
    return {
      merchantGroups, items, defaultAddress: address && clone(address), contact: { name: address?.name || '王阿姨', mobile: address?.mobile || '13812345821' }, goodsAmount, deliveryFee: 0, discountAmount: 0, payableAmount: goodsAmount,
    }
  }
  const assertOrder = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId)
    if (!order) throw new Error('订单不存在或无权访问。')
    return order
  }
  const complete = (order: TradeOrder, message: string, operatorName?: string) => {
    if (order.tradeStatus === '已完成') return
    order.fulfillmentStatus = '已完成'
    order.tradeStatus = '已完成'
    order.profitSharingStatus = '待分账'
    appendTimeline(order, '订单已完成', message)
    if (operatorName) order.timeline[0].operatorName = operatorName
  }
  const residentOrder = (order: TradeOrder) => {
    const result = clone(order)
    delete result.merchantRemark
    result.timeline = result.timeline.filter((event) => event.visibility !== 'merchant')
    return result
  }
  const residentTrade = (trade: TradeSummary) => ({ ...clone(trade), orders: trade.orders.map(residentOrder) })

  const assertTrade = (tradeId: string) => {
    const trade = trades.find((item) => item.tradeId === tradeId)
    if (!trade) throw new Error('交易不存在或无权访问。')
    return trade
  }
  const createTrade = async (input: CreateTradeInput) => {
    if (!input.idempotencyKey.trim()) throw new Error('结算会话已失效，请重新进入。')
    const previous = submitted.get(input.idempotencyKey)
    if (previous) return residentTrade(assertTrade(previous))
    const qualification = deps.getQualification()
    if (!qualification.businessAllowed || !qualification.formalTradeAllowed || !qualification.mockPayAllowed) throw new Error(qualification.message || '交易资格或原型支付暂不可用。')
    const context = ensureCheckout(input)
    if (input.merchantGroups.length !== context.merchantGroups.length || new Set(input.merchantGroups.map((group) => group.storeId)).size !== input.merchantGroups.length) throw new Error('商户分组已变化，请重新确认。')
    const contact = { name: input.contact.name.trim(), mobile: input.contact.mobile.replace(/\s/g, '') }
    if (!contact.name || !/^1\d{10}$/.test(contact.mobile)) throw new Error('请填写联系人及正确的 11 位手机号。')
    if (input.expectedItems.length !== context.items.length || context.items.some((item) => !input.expectedItems.some((expected) => expected.productId === item.productId && expected.skuId === item.skuId && expected.quantity === item.quantity && expected.unitPrice === item.unitPrice))) throw new Error('商品价格或数量已调整，请刷新并确认后再提交。')
    if (input.expectedPayableAmount !== context.payableAmount) throw new Error('应付金额已变化，请刷新后重新确认。')
    const address = getAddress(input.addressId)
    const prepared = context.merchantGroups.map((group) => {
      const choice = input.merchantGroups.find((entry) => entry.storeId === group.storeId)
      if (!choice || !group.fulfillmentMethods.includes(choice.fulfillmentMethod)) throw new Error(`${group.storeName}履约方式已变化，请重新选择。`)
      const delivery = ['商户配送', '普通物流'].includes(choice.fulfillmentMethod)
      if (delivery && (!input.addressId || !address || !address.name.trim() || !/^1\d{10}$/.test(address.mobile) || !address.region.trim() || address.detail.trim().length < 5)) throw new Error(`${choice.fulfillmentMethod}必须选择完整收货地址。`)
      if (choice.buyerRemark.length > 100) throw new Error(`${group.storeName}备注不能超过 100 字。`)
      const location = choice.fulfillmentMethod === '社区自提' ? group.pickupPoints.find((point) => point.id === choice.pickupPointId) : choice.fulfillmentMethod === '到店核销' ? group.verificationStore : undefined
      if (choice.fulfillmentMethod === '社区自提' && !location) throw new Error(`${group.storeName}请选择可用自提点。`)
      return { group, choice, delivery, location }
    })
    const stamp = `${Date.now()}-${++sequence}`
    const tradeId = `trade-${stamp}`
    const children: TradeOrder[] = prepared.map(({ group, choice, delivery, location }, index) => ({
      id: `order-${stamp}-${index + 1}`, no: `DGL${stamp}-${index + 1}`, tradeId, storeId: group.storeId, projectId: deps.projectId, operatorId: group.operatorId, merchantName: group.merchantName, storeName: group.storeName, storeAddress: group.storeAddress, memberName: contact.name, memberMobile: contact.mobile, items: clone(group.items), fulfillmentMethod: choice.fulfillmentMethod,
      deliveryMethod: choice.fulfillmentMethod === '普通物流' ? 'LOGISTICS' : choice.fulfillmentMethod === '商户配送' ? 'LOCAL_TOWN_DELIVERY' : 'SELF_PICK_UP', tradeStatus: '待支付', paymentStatus: '未支付', fulfillmentStatus: '待备货', afterSaleStatus: '无售后', refundStatus: '无退款', profitSharingStatus: '未开始', goodsAmount: group.goodsAmount, deliveryFee: group.deliveryFee, discountAmount: group.discountAmount, payableAmount: group.payableAmount, paidAmount: 0, payOrderId: `pay-${tradeId}`, createdAt: now(), buyerRemark: choice.buyerRemark.trim(), addressSnapshot: delivery && address ? { name: address.name, mobile: address.mobile, region: address.region, detail: address.detail, label: address.label } : undefined, contactSnapshot: clone(contact), pickupPoint: location?.name, fulfillmentLocation: location && clone(location), timeline: [{ time: now(), title: '订单已提交', description: '库存已锁定，等待交易统一支付。' }],
    }))
    const trade: TradeSummary = { tradeId, tradeSn: `DGLT${stamp}`, memberId: 'member-resident', goodsAmount: context.goodsAmount, deliveryFee: context.deliveryFee, discountAmount: context.discountAmount, payableAmount: context.payableAmount, paidAmount: 0, paymentStatus: '未支付', createdAt: now(), expiresAt: Date.now() + 30 * 60 * 1000, orders: children }
    const reserved: TradeOrderItem[] = []
    try {
      context.items.forEach((item) => {
        deps.updateStock(item.productId, item.skuId, item.quantity, 'reserve')
        reserved.push(item)
      })
      // No await inside the in-memory transaction: cart mutation is the final fallible step.
      if (input.cartIds?.length) deps.removeCartItems(unique(input.cartIds))
    } catch (error) {
      reserved.reverse().forEach((item) => deps.updateStock(item.productId, item.skuId, item.quantity, 'release'))
      throw error
    }
    orders.unshift(...children)
    trades.unshift(trade)
    submitted.set(input.idempotencyKey, tradeId)
    return residentTrade(trade)
  }
  const closeTrade = (trade: TradeSummary) => {
    if (trade.paymentStatus === '已关闭') return trade
    if (['支付成功', 'Mock成功'].includes(trade.paymentStatus)) throw new Error('已支付交易不可关闭。')
    trade.orders.forEach((order) => {
      order.items.forEach((item) => deps.updateStock(item.productId, item.skuId, item.quantity, 'release'))
      order.tradeStatus = '已关闭'
      order.paymentStatus = '已关闭'
      order.verificationStatus = order.verificationCode ? '已失效' : undefined
      appendTimeline(order, '交易已关闭', '已释放预占库存。')
    })
    trade.paymentStatus = '已关闭'
    return trade
  }
  const expireTrade = (trade: TradeSummary) => {
    if (trade.expiresAt <= Date.now() && !['支付成功', 'Mock成功', '已关闭'].includes(trade.paymentStatus)) closeTrade(trade)
    return trade
  }
  const settleTrade = (trade: TradeSummary, outcome: 'success' | 'failure' | 'unknown') => {
    expireTrade(trade)
    if (trade.paymentStatus === '已关闭') throw new Error('交易已关闭，请重新购买。')
    if (trade.paymentStatus === '支付成功') return trade
    trade.paymentStatus = outcome === 'success' ? '支付成功' : outcome === 'failure' ? '支付失败' : '支付中'
    trade.orders.forEach((order, index) => {
      order.paymentStatus = trade.paymentStatus
      if (outcome === 'success') {
        order.tradeStatus = '已支付'
        order.paidAmount = order.payableAmount
        order.paidAt = now()
        order.fulfillmentStatus = order.fulfillmentMethod === '到店核销' ? '待核销' : '待备货'
        if (['社区自提', '到店核销'].includes(order.fulfillmentMethod)) {
          order.verificationCode = `HX-${trade.tradeId.slice(6)}-${index + 1}`
          order.verificationStatus = '待核销'
        }
      }
      appendTimeline(order, trade.paymentStatus, outcome === 'failure' ? '支付未完成，可重试；库存仍保留至交易关闭。' : outcome === 'unknown' ? '支付结果确认中，请查询交易状态。' : '原型支付适配器已确认交易支付结果。')
    })
    if (outcome === 'success') { trade.paidAmount = trade.payableAmount; trade.paidAt = now() }
    return trade
  }

  const fulfillment = createMerchantFulfillmentMockAdapter({ orders: () => orders, context: () => merchantContext, refresh: () => trades.forEach(expireTrade), tradeSn: (order) => order.tradeId ? assertTrade(order.tradeId).tradeSn : order.no, now, complete })
  return {
    ...fulfillment,
    getMerchantContext: async () => clone(merchantContext),
    getMerchantDemoStores: async () => clone(deps.demoStores?.() || [merchantContext]),
    setMerchantContextDemo: async (storeId: string) => {
      const context = (deps.demoStores?.() || [merchantContext]).find((entry) => entry.storeId === storeId)
      if (!context) throw new Error('模拟门店不存在。')
      merchantContext = clone(context)
      return clone(merchantContext)
    },
    getMockTradeSnapshot: () => clone({ addresses, orders, trades, submitted: [...submitted], sequence }),
    restoreMockTradeSnapshot: (snapshot: { addresses: MemberAddress[]; orders: TradeOrder[]; trades: TradeSummary[]; submitted: [string, string][]; sequence: number }) => {
      addresses = clone(snapshot.addresses); orders = clone(snapshot.orders)
      trades.splice(0, trades.length, ...clone(snapshot.trades).map((trade) => ({ ...trade, orders: trade.orders.map((child) => orders.find((order) => order.id === child.id)!) })))
      submitted.clear(); snapshot.submitted.forEach(([key, id]) => submitted.set(key, id)); sequence = snapshot.sequence
    },
    createTrade,
    getTrade: async (tradeId: string) => residentTrade(expireTrade(assertTrade(tradeId))),
    getTradeForOrder: async (orderId: string) => {
      const order = assertOrder(orderId)
      if (order.tradeId) return residentTrade(expireTrade(assertTrade(order.tradeId)))
      // Historical single-order Mock entries share the same child object and payment state.
      const trade: TradeSummary = { tradeId: order.id, tradeSn: order.no, memberId: 'member-resident', goodsAmount: order.goodsAmount, deliveryFee: order.deliveryFee, discountAmount: order.discountAmount, payableAmount: order.payableAmount, paidAmount: order.paidAmount, paymentStatus: order.paymentStatus === 'Mock成功' ? '支付成功' : order.paymentStatus, createdAt: order.createdAt, expiresAt: Date.now() + 30 * 60 * 1000, orders: [order] }
      order.tradeId = trade.tradeId
      trades.push(trade)
      return residentTrade(trade)
    },
    payTrade: async (tradeId: string, outcome: 'success' | 'failure' | 'unknown' = 'success') => {
      const trade = expireTrade(assertTrade(tradeId))
      if (trade.paymentStatus === '支付中') return residentTrade(trade)
      return residentTrade(settleTrade(trade, outcome))
    },
    queryTradePayment: async (tradeId: string) => {
      const trade = expireTrade(assertTrade(tradeId))
      // Demo pending result is resolved by this adapter query, never by the page callback.
      return residentTrade(trade.paymentStatus === '支付中' ? settleTrade(trade, 'success') : trade)
    },
    cancelTrade: async (tradeId: string) => residentTrade(closeTrade(expireTrade(assertTrade(tradeId)))),
    getTradeQualification: async () => clone(deps.getQualification()),
    getAddresses: async () => clone(addresses),
    getAddress: async (id: string) => clone(addresses.find((item) => item.id === id)),
    saveAddress: async (input: Omit<MemberAddress, 'id'> & { id?: string }) => {
      const mobile = input.mobile.replace(/\s/g, '')
      if (!input.name.trim()) throw new Error('请填写收货人。')
      if (!/^1\d{10}$/.test(mobile)) throw new Error('请输入正确的 11 位手机号。')
      if (!input.region.trim()) throw new Error('请填写省市区。')
      if (input.detail.trim().length < 5 || input.detail.trim().length > 100) throw new Error('详细地址需为 5—100 个字符。')
      if (input.id && !addresses.some((item) => item.id === input.id)) throw new Error('地址不存在或无权编辑。')
      if (input.isDefault) addresses.forEach((item) => { item.isDefault = false })
      if (input.id) {
        const address = addresses.find((item) => item.id === input.id)
        if (!address) throw new Error('地址不存在或无权编辑。')
        Object.assign(address, { ...input, mobile, name: input.name.trim(), region: input.region.trim(), detail: input.detail.trim(), label: input.label.trim() || '常用' })
        return clone(address)
      }
      if (!addresses.length) input.isDefault = true
      const address: MemberAddress = { ...input, id: `address-${Date.now()}`, mobile, name: input.name.trim(), region: input.region.trim(), detail: input.detail.trim(), label: input.label.trim() || '常用' }
      addresses.unshift(address)
      return clone(address)
    },
    deleteAddress: async (id: string) => {
      const removed = addresses.find((item) => item.id === id)
      addresses = addresses.filter((item) => item.id !== id)
      if (removed?.isDefault && addresses.length) addresses[0].isDefault = true
    },
    setDefaultAddress: async (id: string) => {
      if (!addresses.some((item) => item.id === id)) throw new Error('地址不存在。')
      addresses.forEach((item) => { item.isDefault = item.id === id })
    },
    getCheckoutContext: async (request: CheckoutRequest) => clone(ensureCheckout(request)),
    createTradeOrder: async (input: CreateTradeOrderInput) => {
      const previous = submitted.get(input.idempotencyKey)
      if (previous) return residentOrder(assertTrade(previous).orders[0])
      const context = ensureCheckout(input)
      const trade = await createTrade({ ...input, merchantGroups: context.merchantGroups.map((group) => ({ storeId: group.storeId, fulfillmentMethod: input.fulfillmentMethod, pickupPointId: group.pickupPoints[0]?.id, buyerRemark: input.buyerRemark || '' })), expectedItems: context.items, expectedPayableAmount: context.payableAmount })
      return trade.orders[0]
    },
    getTradeOrder: async (id: string) => {
      const order = assertOrder(id)
      if (order.tradeId) expireTrade(assertTrade(order.tradeId))
      return residentOrder(order)
    },
    getResidentOrders: async () => {
      trades.forEach(expireTrade)
      return orders.map((order) => ({ ...residentOrder(order), displayStatus: displayStatus(order) }))
    },
    payTradeOrder: async (orderId: string, outcome: 'success' | 'failure' | 'unknown') => {
      const order = assertOrder(orderId)
      if (order.tradeId) {
        const trade = expireTrade(assertTrade(order.tradeId))
        if (trade.paymentStatus !== '支付中') settleTrade(trade, outcome)
        return residentOrder(order)
      }
      if (['Mock成功', '支付成功'].includes(order.paymentStatus)) return residentOrder(order)
      throw new Error('请通过交易支付入口继续。')
    },
    queryTradePay: async (orderId: string) => {
      const order = assertOrder(orderId)
      if (order.tradeId) {
        const trade = expireTrade(assertTrade(order.tradeId))
        if (trade.paymentStatus === '支付中') settleTrade(trade, 'success')
      }
      return residentOrder(order)
    },
    cancelTradeOrder: async (orderId: string) => {
      const order = assertOrder(orderId)
      if (order.tradeId) { closeTrade(expireTrade(assertTrade(order.tradeId))); return residentOrder(order) }
      if (!['未支付', '支付中', '支付失败'].includes(order.paymentStatus)) throw new Error('当前订单不可取消。')
      order.tradeStatus = '已关闭'
      order.paymentStatus = '已关闭'
      order.items.forEach((item) => deps.updateStock(item.productId, item.skuId, item.quantity, 'release'))
      appendTimeline(order, '订单已取消', '已关闭支付单并释放锁定库存。')
      return residentOrder(order)
    },
    confirmResidentReceipt: async (orderId: string) => {
      const order = assertOrder(orderId)
      if (!['Mock成功', '支付成功'].includes(order.paymentStatus) || order.afterSaleStatus !== '无售后' || !(order.fulfillmentStatus === '已送达' || (order.fulfillmentMethod === '普通物流' && order.fulfillmentStatus === '已发货'))) throw new Error('当前订单尚不可确认收货。')
      complete(order, '居民已确认收货，订单履约完成。', order.contactSnapshot.name)
      return residentOrder(order)
    },
    getDisplayStatus: displayStatus,
    maskMobile,
  }
}
