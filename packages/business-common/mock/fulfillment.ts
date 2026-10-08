import type { LogisticsShipmentInput, MerchantOrderContext, MerchantOrderFilter, TradeOrder, VerificationResult } from '../../common/types/mall'
import { isOrderPaid, matchesMerchantOrderFilter, merchantOrderStatus } from '../../common/utils/merchantOrder'

interface FulfillmentDependencies {
  orders: () => TradeOrder[]
  context: () => MerchantOrderContext
  refresh: () => void
  tradeSn: (order: TradeOrder) => string
  now: () => string
  complete: (order: TradeOrder, message: string, operatorName?: string) => void
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** All merchant reads and mutations use a trusted adapter context, never a page storeId. */
export function createMerchantFulfillmentMockAdapter(deps: FulfillmentDependencies) {
  const owns = (order: TradeOrder) => order.operatorId === deps.context().operatorId && (order.storeId || order.operatorId) === deps.context().storeId
  const find = (id: string) => {
    deps.refresh()
    const order = deps.orders().find((entry) => entry.id === id)
    if (!order || !owns(order)) throw new Error('订单不存在或非本店订单，无权访问。')
    return order
  }
  const operable = (order: TradeOrder) => {
    if (order.tradeStatus === '已关闭' || order.paymentStatus === '已关闭') throw new Error('订单已关闭，不可履约。')
    if (!isOrderPaid(order)) throw new Error(order.paymentStatus === '支付中' ? '支付结果确认中，暂不能履约。' : '订单未支付成功，不可履约。')
    if (order.afterSaleStatus !== '无售后') throw new Error('订单存在阻断性售后，暂不可履约。')
  }
  const log = (order: TradeOrder, title: string, description: string, privateEvent = false) => order.timeline.unshift({ time: deps.now(), title, description, operatorName: deps.context().operatorName, ...(privateEvent ? { visibility: 'merchant' as const } : {}) })
  const lookup = (code: string): VerificationResult => {
    deps.refresh()
    const normalized = code.trim().toUpperCase()
    const order = deps.orders().find((entry) => entry.verificationCode?.toUpperCase() === normalized || entry.no.toUpperCase() === normalized)
    const error = (reason: VerificationResult['reason'], message: string): VerificationResult => ({ kind: 'error', reason, message })
    if (!normalized || !order) return error('not-found', '核销码不存在，请核对居民凭证。')
    if (!owns(order)) return error('foreign-store', '非本店订单，不能在当前门店核销。')
    if (order.tradeStatus === '已关闭' || order.paymentStatus === '已关闭') return error('closed', '订单已关闭，不可核销。')
    if (!isOrderPaid(order)) return error('unpaid', order.paymentStatus === '支付中' ? '支付结果确认中，暂不可核销。' : '订单未支付成功，不可核销。')
    if (!['社区自提', '到店核销'].includes(order.fulfillmentMethod)) return error('not-verifiable', '当前履约方式不允许核销。')
    if (order.verificationStatus === '已失效') return error('expired', '凭证已失效，请联系商户核对订单。')
    if (order.verificationStatus === '已核销') return { kind: 'already', reason: 'used', message: `该订单已于 ${order.verificationAt || '此前'} 核销，禁止重复核销。`, order: clone(order) }
    if (order.afterSaleStatus !== '无售后') return error('after-sale', '订单存在阻断性售后，暂不可核销。')
    if (order.fulfillmentStatus === '待备货') return error('not-prepared', '尚未完成备货，请先完成备货。')
    if (!['待自提', '待核销'].includes(order.fulfillmentStatus) || order.verificationStatus !== '待核销' || !order.verificationCode) return error('not-verifiable', '当前订单不可核销，请刷新状态后重试。')
    return { kind: 'ready', message: '请现场核对居民、商品数量和核销地点，再确认核销。', order: clone(order) }
  }
  return {
    getMerchantTradeOrder: async (id: string) => { const order = find(id); return clone({ ...order, tradeSn: deps.tradeSn(order), displayStatus: merchantOrderStatus(order) }) },
    getMerchantOrders: async () => {
      deps.refresh()
      const orders = deps.orders().filter(owns)
      const filters: { key: MerchantOrderFilter; label: string; count: number }[] = [
        { key: 'all', label: '全部', count: 0 }, { key: 'preparing', label: '待备货', count: 0 }, { key: 'delivery', label: '待配送/发货', count: 0 }, { key: 'transit', label: '配送/运输中', count: 0 }, { key: 'verification', label: '待自提/核销', count: 0 }, { key: 'completed', label: '已完成', count: 0 },
      ]
      return clone({ context: deps.context(), filters: filters.map((filter) => ({ ...filter, count: orders.filter((order) => matchesMerchantOrderFilter(order, filter.key)).length })), orders: orders.map((order) => ({ ...order, displayStatus: merchantOrderStatus(order) })) })
    },
    getMerchantWorkbench: async () => {
      deps.refresh()
      const visible = deps.orders().filter(owns)
      const count = (filter: MerchantOrderFilter) => visible.filter((order) => matchesMerchantOrderFilter(order, filter) && order.afterSaleStatus === '无售后').length
      const paid = visible.filter(isOrderPaid)
      const todos = [{ label: '待审核商品', value: 0, description: '待平台审核' }, { label: '待备货', value: count('preparing'), description: '已支付订单' }, { label: '待配送/发货', value: count('delivery'), description: '配送与物流' }, { label: '待核销', value: count('verification'), description: '自提或到店' }]
      return clone({ context: deps.context(), merchant: { name: deps.context().storeName, storeName: deps.context().storeName, operationStatus: '经营正常', businessHours: '07:00—21:30' }, todoTotal: todos.reduce((sum, todo) => sum + todo.value, 0), todos, afterSales: { value: visible.filter((order) => order.afterSaleStatus !== '无售后').length, description: '售后下一批开放' }, today: { orderCount: paid.filter((order) => order.paidAt?.startsWith(deps.now().slice(0, 10))).length, amount: paid.filter((order) => order.paidAt?.startsWith(deps.now().slice(0, 10))).reduce((sum, order) => sum + order.paidAmount, 0) }, funds: { pending: paid.filter((order) => order.profitSharingStatus === '待分账').reduce((sum, order) => sum + order.paidAmount, 0), completed: paid.filter((order) => order.profitSharingStatus === '已分账').reduce((sum, order) => sum + order.paidAmount, 0) } })
    },
    merchantFulfill: async (id: string, action: 'finish-preparing' | 'start-delivery' | 'mark-delivered') => {
      const order = find(id); operable(order)
      if (action === 'finish-preparing' && order.fulfillmentStatus === '待备货' && ['商户配送', '社区自提', '普通物流', '到店核销'].includes(order.fulfillmentMethod)) {
        order.fulfillmentStatus = order.fulfillmentMethod === '商户配送' ? '待配送' : order.fulfillmentMethod === '普通物流' ? '待发货' : order.fulfillmentMethod === '到店核销' ? '待核销' : '待自提'
        order.tradeStatus = '履约中'; log(order, '完成备货', `备货已完成，订单进入${order.fulfillmentStatus}。`)
      } else if (action === 'start-delivery' && order.fulfillmentMethod === '商户配送' && order.fulfillmentStatus === '待配送') {
        order.fulfillmentStatus = '配送中'; order.tradeStatus = '履约中'; log(order, '开始配送', '商户已开始配送。')
      } else if (action === 'mark-delivered' && order.fulfillmentMethod === '商户配送' && order.fulfillmentStatus === '配送中') {
        order.fulfillmentStatus = '已送达'; log(order, '确认送达', '商户确认实际送达，等待居民确认收货。')
      } else throw new Error('订单状态已变化或操作不适用，请刷新后重试。')
      return clone(order)
    },
    shipLogistics: async (id: string, input: LogisticsShipmentInput) => {
      const order = find(id); operable(order)
      if (order.fulfillmentMethod !== '普通物流' || order.fulfillmentStatus !== '待发货') throw new Error('订单状态已变化，仅待发货物流订单可发货。')
      const name = input.logisticsName.trim(), code = input.logisticsCode.trim(), no = input.logisticsNo.trim()
      if (!name || !code) throw new Error('请选择物流公司。')
      if (!/^[A-Za-z0-9-]{5,40}$/.test(no)) throw new Error('请填写 5—40 位字母、数字或短横线的物流单号。')
      if ((input.shipmentRemark || '').length > 200) throw new Error('发货备注不得超过 200 字。')
      Object.assign(order, { logisticsCode: code, logisticsName: name, logisticsNo: no, shippedAt: deps.now(), shipmentRemark: input.shipmentRemark?.trim(), fulfillmentStatus: '已发货', tradeStatus: '履约中' })
      log(order, '物流发货', `${name} ${no}，等待居民收货。`)
      return clone(order)
    },
    getLogisticsCompanies: async () => [{ code: 'SF', name: '顺丰速运' }, { code: 'YTO', name: '圆通速递' }, { code: 'ZTO', name: '中通快递' }, { code: 'OTHER', name: '其他物流' }],
    saveMerchantRemark: async (id: string, remark: string) => {
      const order = find(id)
      if (remark.length > 200) throw new Error('商户备注不得超过 200 字。')
      if ((order.merchantRemark || '') !== remark.trim()) { order.merchantRemark = remark.trim(); log(order, '商户备注已更新', '仅本店和平台处理人员可见。', true) }
      return clone(order)
    },
    lookupVerification: async (code: string) => lookup(code),
    confirmVerification: async (id: string) => {
      const order = find(id)
      const result = lookup(order.verificationCode || order.no)
      if (result.kind !== 'ready') throw new Error(result.message)
      order.verificationStatus = '已核销'; order.verificationAt = deps.now(); order.verificationOperatorName = deps.context().operatorName
      log(order, '核销成功', `现场核对完成：${order.fulfillmentMethod}，凭证不可重复使用。`)
      deps.complete(order, '商品已现场核销，订单履约完成。', deps.context().operatorName)
      return clone(order)
    },
  }
}
