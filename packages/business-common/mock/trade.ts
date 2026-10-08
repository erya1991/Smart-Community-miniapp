import type {
  CartItem,
  CheckoutContext,
  CheckoutRequest,
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
} from '../../common/types/mall'

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
}

const clone = <T>(value: T): T => value === undefined ? value : JSON.parse(JSON.stringify(value)) as T
const now = () => '2026-09-18 10:30:00'
const maskMobile = (mobile: string) => `${mobile.slice(0, 3)}****${mobile.slice(-4)}`
const unique = <T>(values: T[]) => [...new Set(values)]

const displayStatus = (order: TradeOrder) => {
  if (order.tradeStatus === '已关闭' || order.paymentStatus === '已关闭') return '已关闭'
  if (order.paymentStatus === '未支付' || order.paymentStatus === '支付中' || order.paymentStatus === '支付失败') return '待支付'
  if (order.tradeStatus === '已完成') return '已完成'
  return order.fulfillmentStatus
}

const isVerifiable = (order: TradeOrder) => ['待自提', '待核销'].includes(order.fulfillmentStatus)

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
  const submitted = new Map<string, string>()

  const appendTimeline = (order: TradeOrder, title: string, description: string) => order.timeline.unshift({ time: now(), title, description })
  const getAddress = (id?: string) => addresses.find((item) => item.id === id) || addresses.find((item) => item.isDefault)
  const getItems = (request: CheckoutRequest) => {
    if (request.cartIds?.length) return deps.getCartItems(request.cartIds).map((item) => makeItem(item.productId, item.skuId, item.quantity))
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
    if (products.some((item) => !item || item.saleStatus !== '销售中')) throw new Error('部分商品已下架，请返回购物车刷新后重新结算。')
    if (unique(products.map((item) => item!.operatorId)).length !== 1) throw new Error('一次结算仅支持同一商户商品，请分别结算。')
    items.forEach((item) => {
      const sku = deps.findSku(item.productId, item.skuId)
      if (!sku?.valid) throw new Error(`“${item.productName}”规格已失效，请重新选择。`)
      if (sku.availableStock < item.quantity) throw new Error(`“${item.productName}”库存不足，当前仅剩 ${sku.availableStock} 件。`)
    })
    const first = products[0]!
    const fulfillmentMethods = products.slice(1).reduce<FulfillmentMethod[]>((result, product) => result.filter((method) => product!.fulfillmentMethods.includes(method)), [...first.fulfillmentMethods])
    if (!fulfillmentMethods.length) throw new Error('所选商品没有可共同使用的履约方式，请分别结算。')
    const goodsAmount = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0)
    const address = getAddress()
    return {
      merchantName: first.merchantName, storeName: first.storeName, storeAddress: first.storeAddress, operatorId: first.operatorId, items, fulfillmentMethods, defaultFulfillment: fulfillmentMethods[0], defaultAddress: address && clone(address), contact: { name: address?.name || '王阿姨', mobile: address?.mobile || '13812345821' }, goodsAmount, deliveryFee: 0, discountAmount: 0, payableAmount: goodsAmount, afterSaleNote: unique(items.map((item) => item.afterSaleNote)).join('；'),
    }
  }
  const assertOrder = (orderId: string) => {
    const order = orders.find((item) => item.id === orderId)
    if (!order) throw new Error('订单不存在或无权访问。')
    return order
  }
  const complete = (order: TradeOrder, message: string) => {
    if (order.tradeStatus === '已完成') return
    order.fulfillmentStatus = '已完成'
    order.tradeStatus = '已完成'
    order.profitSharingStatus = '待分账'
    appendTimeline(order, '订单已完成', message)
  }

  return {
    getTradeQualification: async () => clone(deps.getQualification()),
    getAddresses: async () => clone(addresses),
    getAddress: async (id: string) => clone(addresses.find((item) => item.id === id)),
    saveAddress: async (input: Omit<MemberAddress, 'id'> & { id?: string }) => {
      const mobile = input.mobile.replace(/\s/g, '')
      if (!input.name.trim()) throw new Error('请填写收货人。')
      if (!/^1\d{10}$/.test(mobile)) throw new Error('请输入正确的 11 位手机号。')
      if (!input.region.trim()) throw new Error('请填写省市区。')
      if (input.detail.trim().length < 5 || input.detail.trim().length > 100) throw new Error('详细地址需为 5—100 个字符。')
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
      if (previous) return clone(assertOrder(previous))
      const qualification = deps.getQualification()
      if (!qualification.businessAllowed || !qualification.mockPayAllowed) throw new Error(qualification.message)
      const context = ensureCheckout(input)
      if (!context.fulfillmentMethods.includes(input.fulfillmentMethod)) throw new Error('所选履约方式已发生变化，请重新确认。')
      const contact = { name: input.contact.name.trim(), mobile: input.contact.mobile.replace(/\s/g, '') }
      if (!contact.name || !/^1\d{10}$/.test(contact.mobile)) throw new Error('请填写正确的联系人和手机号。')
      const address = input.fulfillmentMethod === '商户配送' ? getAddress(input.addressId) : undefined
      if (input.fulfillmentMethod === '商户配送' && !address) throw new Error('商户配送必须选择收货地址。')
      const currentItems = getItems(input)
      currentItems.forEach((item) => deps.updateStock(item.productId, item.skuId, item.quantity, 'reserve'))
      const orderId = `trade-${Date.now()}`
      const order: TradeOrder = {
        id: orderId, no: `DGL${Date.now().toString().slice(-10)}`, projectId: deps.projectId, operatorId: context.operatorId, merchantName: context.merchantName, storeName: context.storeName, storeAddress: context.storeAddress, memberName: contact.name, memberMobile: contact.mobile, items: context.items, fulfillmentMethod: input.fulfillmentMethod, tradeStatus: '待支付', paymentStatus: '未支付', fulfillmentStatus: '待备货', afterSaleStatus: '无售后', refundStatus: '无退款', profitSharingStatus: '未开始', goodsAmount: context.goodsAmount, deliveryFee: context.deliveryFee, discountAmount: context.discountAmount, payableAmount: context.payableAmount, paidAmount: 0, payOrderId: `pay-${orderId}`, createdAt: now(), buyerRemark: input.buyerRemark?.trim(), addressSnapshot: address && { name: address.name, mobile: address.mobile, region: address.region, detail: address.detail, label: address.label }, contactSnapshot: contact, pickupPoint: input.fulfillmentMethod === '社区自提' ? '大光路社区服务点（生鲜恒温柜）' : input.fulfillmentMethod === '到店核销' ? context.storeName : undefined, verificationCode: input.fulfillmentMethod === '商户配送' ? undefined : `HX-${Date.now().toString().slice(-8)}`, verificationStatus: input.fulfillmentMethod === '商户配送' ? undefined : '待核销', timeline: [{ time: now(), title: '订单已提交', description: '库存已锁定，等待统一 Pay 支付结果。' }],
      }
      orders.unshift(order)
      submitted.set(input.idempotencyKey, orderId)
      if (input.cartIds?.length) deps.removeCartItems(input.cartIds)
      return clone(order)
    },
    getTradeOrder: async (id: string) => clone(assertOrder(id)),
    getResidentOrders: async () => clone(orders.map((order) => ({ ...order, displayStatus: displayStatus(order) }))),
    getMerchantOrders: async () => {
      const visible = orders.filter((order) => order.operatorId === deps.operatorId)
      const filters = [
        { label: '全部', count: visible.length },
        { label: '待处理', count: visible.filter((order) => ['待备货', '待核销'].includes(displayStatus(order))).length },
        { label: '履约中', count: visible.filter((order) => ['待配送', '配送中', '待自提', '已送达'].includes(displayStatus(order))).length },
        { label: '已完成', count: visible.filter((order) => order.tradeStatus === '已完成').length },
      ]
      return clone({ filters, orders: visible.map((order) => ({ ...order, displayStatus: displayStatus(order) })) })
    },
    getMerchantWorkbench: async () => {
      const visible = orders.filter((order) => order.operatorId === deps.operatorId)
      const count = (states: string[]) => visible.filter((order) => states.includes(displayStatus(order))).length
      const paid = visible.filter((order) => order.paymentStatus === 'Mock成功' || order.paymentStatus === '支付成功')
      return clone({
        merchant: { name: '邻里生鲜', storeName: '大光路店', operationStatus: '经营正常', businessHours: '07:00 - 21:30' },
        todoTotal: count(['待备货', '待配送', '待自提', '待核销']),
        todos: [
          { label: '待审核商品', value: 1, description: '待平台审核' },
          { label: '待备货', value: count(['待备货']), description: '已支付订单' },
          { label: '待配送', value: count(['待配送', '配送中']), description: '商户配送' },
          { label: '待核销', value: count(['待自提', '待核销']), description: '自提或到店' },
        ],
        afterSales: { value: 0, description: '售后将在下一阶段开放' },
        today: { orderCount: paid.length, amount: paid.reduce((sum, order) => sum + order.paidAmount, 0) },
        funds: { pending: visible.filter((order) => order.profitSharingStatus === '待分账').reduce((sum, order) => sum + order.paidAmount, 0), completed: visible.filter((order) => order.profitSharingStatus === '已分账').reduce((sum, order) => sum + order.paidAmount, 0) },
      })
    },
    payTradeOrder: async (orderId: string, outcome: 'success' | 'failure' | 'unknown') => {
      const order = assertOrder(orderId)
      if (order.tradeStatus === '已关闭') throw new Error('订单已关闭，请重新购买。')
      if (['Mock成功', '支付成功'].includes(order.paymentStatus)) return clone(order)
      order.paymentStatus = '支付中'
      appendTimeline(order, '支付处理中', '正在查询统一 Pay 支付结果。')
      if (outcome === 'unknown') return clone(order)
      if (outcome === 'failure') {
        order.paymentStatus = '支付失败'
        appendTimeline(order, '支付失败', '模拟支付未完成，请重新购买后再试。')
        order.tradeStatus = '已关闭'
        order.paymentStatus = '已关闭'
      }
      if (outcome === 'failure') {
        order.items.forEach((item) => deps.updateStock(item.productId, item.skuId, item.quantity, 'release'))
        appendTimeline(order, '订单已关闭', '支付失败，已释放锁定库存。')
        return clone(order)
      }
      order.paymentStatus = 'Mock成功'
      order.tradeStatus = '已支付'
      order.paidAmount = order.payableAmount
      order.paidAt = now()
      order.fulfillmentStatus = order.fulfillmentMethod === '到店核销' ? '待核销' : '待备货'
      appendTimeline(order, '模拟支付成功', '已按统一 Pay 业务口径确认支付，商户已收到履约待办。')
      return clone(order)
    },
    queryTradePay: async (orderId: string) => clone(assertOrder(orderId)),
    cancelTradeOrder: async (orderId: string) => {
      const order = assertOrder(orderId)
      if (!['未支付', '支付中', '支付失败'].includes(order.paymentStatus)) throw new Error('当前订单不可取消。')
      order.tradeStatus = '已关闭'
      order.paymentStatus = '已关闭'
      order.items.forEach((item) => deps.updateStock(item.productId, item.skuId, item.quantity, 'release'))
      appendTimeline(order, '订单已取消', '已关闭支付单并释放锁定库存。')
      return clone(order)
    },
    merchantFulfill: async (orderId: string, action: 'finish-preparing' | 'start-delivery' | 'mark-delivered') => {
      const order = assertOrder(orderId)
      if (!['Mock成功', '支付成功'].includes(order.paymentStatus)) throw new Error('订单尚未支付，无法履约。')
      if (order.afterSaleStatus !== '无售后') throw new Error('订单存在售后处理，暂不可继续履约。')
      if (action === 'finish-preparing' && order.fulfillmentStatus === '待备货') {
        order.fulfillmentStatus = order.fulfillmentMethod === '商户配送' ? '待配送' : '待自提'
        order.tradeStatus = '履约中'
        appendTimeline(order, '备货完成', order.fulfillmentMethod === '商户配送' ? '商品已备齐，等待开始配送。' : '商品已备齐，请居民携带核销码到自提点核对。')
      } else if (action === 'start-delivery' && order.fulfillmentStatus === '待配送') {
        order.fulfillmentStatus = '配送中'
        order.tradeStatus = '履约中'
        appendTimeline(order, '开始配送', '商户配送人员已出发。')
      } else if (action === 'mark-delivered' && order.fulfillmentStatus === '配送中') {
        order.fulfillmentStatus = '已送达'
        order.tradeStatus = '履约中'
        appendTimeline(order, '已送达', '商品已送达，等待居民确认收货。')
      } else throw new Error('订单状态已变化，请刷新后重试。')
      return clone(order)
    },
    saveMerchantRemark: async (orderId: string, remark: string) => {
      const order = assertOrder(orderId)
      order.merchantRemark = remark.trim().slice(0, 200)
      appendTimeline(order, '商户备注已更新', '备注仅供商户与平台处理人员查看。')
      return clone(order)
    },
    confirmResidentReceipt: async (orderId: string) => {
      const order = assertOrder(orderId)
      if (order.fulfillmentStatus !== '已送达') throw new Error('商品尚未标记送达，暂不能确认收货。')
      complete(order, '居民已确认收货，已进入待分账业务状态。')
      return clone(order)
    },
    lookupVerification: async (code: string) => {
      const normalized = code.trim().toUpperCase()
      const order = orders.find((item) => item.verificationCode === normalized || item.no === normalized)
      if (!order) return { kind: 'error' as const, message: '未找到对应核销订单，请核对凭证。' }
      if (order.fulfillmentMethod === '商户配送') return { kind: 'error' as const, message: '该订单为商户配送，不可在核销台操作。' }
      if (order.verificationStatus === '已核销') return { kind: 'already' as const, message: `该订单已于 ${order.verificationAt || '此前'} 完成核销。`, order: clone(order) }
      if (!isVerifiable(order) || order.paymentStatus === '已关闭') return { kind: 'error' as const, message: '当前订单状态不可核销。' }
      return { kind: 'ready' as const, message: '已匹配待核销订单，请现场核对后确认。', order: clone(order) }
    },
    confirmVerification: async (orderId: string) => {
      const order = assertOrder(orderId)
      if (!isVerifiable(order) || order.verificationStatus !== '待核销') throw new Error(order.verificationStatus === '已核销' ? '该核销凭证已使用，请勿重复核销。' : '当前订单不可核销。')
      order.verificationStatus = '已核销'
      order.verificationAt = now()
      order.fulfillmentStatus = '已核销'
      appendTimeline(order, '核销成功', '现场人工核对完成，核销凭证已失效。')
      complete(order, '核销完成，订单已进入待分账业务状态。')
      return clone(order)
    },
    getDisplayStatus: displayStatus,
    maskMobile,
  }
}
