import type { MerchantOrderContext, TradeOrder } from '../../common/types/mall'
import type { AfterSaleRecord, AfterSaleEligibility, AfterSalePresentation, AfterSaleServiceStatus, CreateAfterSaleInput, MerchantAfterSaleFilter, ResidentAfterSaleView, ReturnShipmentInput } from '../../common/types/after-sale'

interface Dependencies {
  orders: () => TradeOrder[]; memberId: () => string; merchant: () => MerchantOrderContext
  residentOrder: (order: TradeOrder) => TradeOrder; tradeSn: (order: TradeOrder) => string; refresh: () => void; now: () => string
  restoreStock: (productId: string, skuId: string, quantity: number) => void
}
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const active = (record: AfterSaleRecord) => !['REFUSE', 'BUYER_CANCEL', 'COMPLETE'].includes(record.serviceStatus)
const delivered = (order: TradeOrder) => ['配送中', '已送达', '已发货', '已核销', '已完成'].includes(order.fulfillmentStatus)
const reasons = ['商品质量问题', '商品破损', '商品与描述不符', '少件/错件', '不想要了', '其他']
const labels: Record<AfterSaleServiceStatus, string> = { APPLY: '待商家处理', PASS: '商家已同意', REFUSE: '商家已拒绝', BUYER_RETURN: '等待退货', SELLER_CONFIRM: '商家已确认收货', BUYER_CANCEL: '售后已取消', WAIT_REFUND: '等待退款', COMPLETE: '售后完成' }

export function createAfterSaleMockAdapter(deps: Dependencies) {
  let records: AfterSaleRecord[] = [], sequence = 0
  const submitted = new Map<string, string>()
  const orderById = (id: string) => { deps.refresh(); const order = deps.orders().find(order => order.id === id); if (!order) throw new Error('订单不存在。'); return order }
  const ownResidentOrder = (id: string) => { const order = orderById(id); if ((order.memberId || 'member-resident') !== deps.memberId()) throw new Error('非当前居民订单，无权访问。'); return order }
  const find = (id: string) => { const record = records.find(record => record.id === id); if (!record) throw new Error('售后不存在。'); return record }
  const resident = (id: string) => { const record = find(id); if (record.memberId !== deps.memberId()) throw new Error('非当前居民售后，无权访问。'); ownResidentOrder(record.orderId); return record }
  const owns = (record: AfterSaleRecord) => record.storeId === deps.merchant().storeId && record.operatorId === deps.merchant().operatorId
  const merchant = (id: string) => { const record = find(id); if (!owns(record)) throw new Error('非本店售后，无权访问或处理。'); return record }
  const log = (record: AfterSaleRecord, title: string, description: string, operatorName: string) => { record.updatedAt = deps.now(); record.timeline.unshift({ time: record.updatedAt, title, description, operatorName }) }
  const presentation = (record: AfterSaleRecord, side: 'resident' | 'merchant'): AfterSalePresentation => {
    const statusLabel = record.serviceStatus === 'BUYER_RETURN' && record.mDeliverTime ? '等待商家收货' : record.serviceStatus === 'COMPLETE' ? '退款成功' : record.serviceStatus === 'WAIT_REFUND' && record.refundStatus === '退款处理中' ? '退款处理中' : record.serviceStatus === 'WAIT_REFUND' && record.refundStatus === '退款失败' ? '退款异常，平台处理中' : labels[record.serviceStatus]
    const nextStep = record.serviceStatus === 'APPLY' ? '商家正在审核申请，请等待处理。' : record.serviceStatus === 'BUYER_RETURN' ? '请按商家提供的地点及说明退回商品，并提交退货信息。' : record.serviceStatus === 'SELLER_CONFIRM' ? '商家已确认收到退货，等待平台处理退款。' : record.serviceStatus === 'WAIT_REFUND' ? record.refundStatus === '退款失败' ? '退款处理中出现异常，平台正在处理。' : '等待平台支付/退款服务处理；商家同意不代表退款已到账。' : record.serviceStatus === 'REFUSE' ? '商家已拒绝，请查看处理原因。如仍符合规则，可重新申请。' : record.serviceStatus === 'BUYER_CANCEL' ? '本次申请已取消，如仍符合规则可重新申请。' : record.serviceStatus === 'COMPLETE' ? '退款成功，原支付渠道退回。本次售后已完成。' : '商家已同意，按当前提示处理。'
    return { statusLabel, typeLabel: record.serviceType === 'RETURN_MONEY' ? '退款' : '退货退款', nextStep: record.serviceStatus === 'BUYER_RETURN' && record.mDeliverTime ? '居民已提交退货信息，等待商家实际收到并确认。' : nextStep, operations: { cancel: side === 'resident' && record.serviceStatus === 'APPLY', submitReturn: side === 'resident' && record.serviceStatus === 'BUYER_RETURN' && !record.mDeliverTime, approve: side === 'merchant' && record.serviceStatus === 'APPLY', reject: side === 'merchant' && record.serviceStatus === 'APPLY', confirmReturn: side === 'merchant' && record.serviceStatus === 'BUYER_RETURN' && Boolean(record.mDeliverTime) } }
  }
  const residentView = (record: AfterSaleRecord): ResidentAfterSaleView => {
    const { stockRestored: _stock, restoreStockOnRefund: _restore, profitSharingReturnRequired: _sharing, fundAdjustmentStatus: _fund, ...result } = clone(record)
    return { ...result, ...presentation(record, 'resident') }
  }
  const merchantView = (record: AfterSaleRecord) => ({ ...clone(record), ...presentation(record, 'merchant') })
  const forOrder = (id: string) => records.filter(record => record.orderId === id)
  const syncOrder = (order: TradeOrder) => {
    const history = forOrder(order.id)
    if (!history.length) return // Preserve historical protected fixtures until independent records exist.
    const running = history.filter(active), completed = history.filter(record => record.serviceStatus === 'COMPLETE')
    order.hasAfterSaleRecords = true
    order.afterSaleStatus = running.length ? '售后处理中' : completed.length ? '售后完成' : '无售后'
    order.refundStatus = running.some(record => record.refundStatus === '退款处理中') ? '退款处理中' : running.some(record => record.refundStatus === '退款失败') ? '退款失败' : completed.length ? '退款成功' : '无退款'
    order.refundedAmount = completed.reduce((sum, record) => sum + record.actualRefundAmount, 0)
    order.profitSharingEligibleAmount = Math.max(0, order.paidAmount - order.refundedAmount)
    order.profitSharingReturnRequired = history.some(record => record.profitSharingReturnRequired)
    order.fundAdjustmentStatus = order.profitSharingReturnRequired ? '待平台资金调整' : '无需回退'
    order.afterSaleSummary = running.length ? running.some(record => record.serviceType === 'RETURN_GOODS') ? '退货处理中' : running.some(record => record.refundStatus === '退款失败') ? '退款异常，平台处理中' : '退款处理中' : completed.length ? '退款成功' : history[0].serviceStatus === 'REFUSE' ? '售后已拒绝' : '售后已取消'
    order.items.forEach(item => { item.remainingFulfillmentQuantity = item.quantity - completed.filter(record => record.skuId === item.skuId && record.productId === item.productId).reduce((sum, record) => sum + record.quantity, 0) })
    order.fulfillmentBlocked = running.length > 0 || (!delivered(order) && order.items.every(item => item.remainingFulfillmentQuantity === 0))
  }
  const eligibility = (orderId: string, skuId: string, quantity = 1): AfterSaleEligibility => {
    const order = ownResidentOrder(orderId), item = order.items.find(item => item.skuId === skuId)
    if (!item) throw new Error('当前订单商品不存在。')
    const history = forOrder(orderId).filter(record => record.skuId === skuId && record.productId === item.productId)
    const completedQuantity = history.filter(record => record.serviceStatus === 'COMPLETE').reduce((sum, record) => sum + record.quantity, 0)
    const activeQuantity = history.filter(active).reduce((sum, record) => sum + record.quantity, 0)
    const availableQuantity = Math.max(0, item.quantity - completedQuantity - activeQuantity)
    const goodsPaid = Math.min(order.goodsAmount, Math.max(0, order.paidAmount - order.deliveryFee))
    const shares = order.items.map(entry => Math.floor(goodsPaid * (entry.unitPrice * entry.quantity) / Math.max(1, order.goodsAmount)))
    shares[shares.length - 1] += goodsPaid - shares.reduce((sum, amount) => sum + amount, 0)
    const itemPaidAmount = shares[order.items.indexOf(item)]
    const claimed = history.filter(record => active(record) || record.serviceStatus === 'COMPLETE').reduce((sum, record) => sum + (record.serviceStatus === 'COMPLETE' ? record.actualRefundAmount : record.applyRefundAmount), 0)
    const validQuantity = Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= availableQuantity
    const maxRefundAmount = validQuantity ? Math.min(itemPaidAmount - claimed, Math.floor(itemPaidAmount * quantity / item.quantity) + (quantity === availableQuantity ? itemPaidAmount % item.quantity : 0)) : 0
    const reason = !['Mock成功', '支付成功'].includes(order.paymentStatus) ? order.paymentStatus === '已关闭' || order.tradeStatus === '已关闭' ? '订单已关闭，不能申请售后。' : '订单未支付成功，不能申请售后。' : order.tradeStatus === '已关闭' ? '订单已关闭，不能申请售后。' : order.afterSaleExpiresAt !== undefined && order.afterSaleExpiresAt <= Date.now() ? '售后期限已失效，当前不能申请。' : item.afterSaleEnabled === false ? '当前商品不能申请售后。' : availableQuantity === 0 ? activeQuantity > 0 ? '已有进行中售后占用全部可申请数量，请查看现有申请。' : '可售后数量不足，商品已完成有效售后。' : !validQuantity ? '可售后数量不足，请调整申请数量。' : maxRefundAmount <= 0 ? '商品没有剩余可退金额。' : ''
    const allowRefund = !reason, allowReturnGoods = allowRefund && delivered(order)
    return clone({ order: deps.residentOrder(order), item, itemPaidAmount, availableQuantity, activeQuantity, completedQuantity, requestedQuantity: quantity, maxRefundAmount, allowRefund, allowReturnGoods, reason, reasons, serviceTypes: [{ value: 'RETURN_MONEY' as const, label: '退款', description: '商品不退回，商家审核后由平台退款。' }, ...(allowReturnGoods ? [{ value: 'RETURN_GOODS' as const, label: '退货退款', description: '先退回商品，商家确认收到后由平台退款。' }] : [])] })
  }
  const assertReview = (record: AfterSaleRecord) => { const order = orderById(record.orderId); if (order.tradeStatus === '已关闭') throw new Error('订单已关闭，不允许当前操作。'); if (record.serviceStatus !== 'APPLY') throw new Error(record.serviceStatus === 'BUYER_CANCEL' ? '售后已取消。' : '售后状态已变化或已处理，请刷新。') }
  return {
    getAfterSaleEligibility: async (orderId: string, skuId: string, quantity = 1) => eligibility(orderId, skuId, quantity),
    getOrderAfterSales: async (orderId: string) => { ownResidentOrder(orderId); return forOrder(orderId).map(residentView) },
    getMerchantOrderAfterSales: async (orderId: string) => { const order = orderById(orderId); if ((order.storeId || order.operatorId) !== deps.merchant().storeId || order.operatorId !== deps.merchant().operatorId) throw new Error('非本店订单。'); return forOrder(orderId).map(merchantView) },
    getResidentAfterSale: async (id: string) => residentView(resident(id)),
    getMerchantAfterSale: async (id: string) => merchantView(merchant(id)),
    createAfterSale: async (input: CreateAfterSaleInput) => {
      const key = deps.memberId() + ':' + input.idempotencyKey.trim()
      if (!input.idempotencyKey.trim()) throw new Error('申请会话已失效，请重新进入。')
      const previous = submitted.get(key)
      if (previous) return residentView(resident(previous))
      const allowed = eligibility(input.orderId, input.skuId, input.quantity)
      if (!allowed.allowRefund) throw new Error(allowed.reason)
      if (!['RETURN_MONEY', 'RETURN_GOODS'].includes(input.serviceType) || input.serviceType === 'RETURN_GOODS' && !allowed.allowReturnGoods) throw new Error('当前履约阶段不允许该售后类型。')
      if (!reasons.includes(input.reason)) throw new Error('请选择有效的售后原因。')
      if (!Number.isSafeInteger(input.applyRefundAmount) || input.applyRefundAmount <= 0 || input.applyRefundAmount > allowed.maxRefundAmount) throw new Error('申请金额必须为正整数分且不得超过可退上限。')
      if (input.problemDesc.length > 500) throw new Error('问题描述最多 500 字。')
      if (!Array.isArray(input.images) || input.images.length > 6 || input.images.some(image => typeof image !== 'string' || !image.trim())) throw new Error('图片凭证最多 6 张，且必须为有效图片。')
      const order = orderById(input.orderId), stamp = Date.now() + '-' + ++sequence
      const record: AfterSaleRecord = { id: 'after-sale-' + stamp, sn: 'DGLAS' + stamp, tradeId: order.tradeId, tradeSn: deps.tradeSn(order), orderId: order.id, orderSn: order.no, orderItemSn: allowed.item.orderItemSn || order.no + '-' + input.skuId, storeId: order.storeId || order.operatorId, operatorId: order.operatorId, memberId: deps.memberId(), memberName: order.memberName, storeName: order.merchantName + '（' + order.storeName + '）', productId: allowed.item.productId, skuId: input.skuId, item: clone(allowed.item), quantity: input.quantity, serviceType: input.serviceType, serviceStatus: 'APPLY', reason: input.reason, problemDesc: input.problemDesc.trim(), images: clone(input.images), maxRefundAmount: allowed.maxRefundAmount, applyRefundAmount: input.applyRefundAmount, actualRefundAmount: 0, returnAddress: order.storeAddress, returnInstructions: '请与门店核对退回地点及商品，现场退回请提交交接信息；自行快递请填写公司和单号。', refundStatus: '无退款', stockRestored: false, restoreStockOnRefund: !delivered(order), profitSharingReturnRequired: false, fundAdjustmentStatus: '无需回退', createdAt: deps.now(), updatedAt: deps.now(), timeline: [] }
      log(record, '居民提交申请', `${record.quantity} 件，申请 ¥${(record.applyRefundAmount / 100).toFixed(2)}。`, record.memberName)
      records.unshift(record); submitted.set(key, record.id); syncOrder(order)
      return residentView(record)
    },
    cancelAfterSale: async (id: string) => { const record = resident(id); if (record.serviceStatus !== 'APPLY') throw new Error('当前售后不能取消。'); record.serviceStatus = 'BUYER_CANCEL'; log(record, '居民取消售后', '申请已取消，可申请数量已释放。', record.memberName); syncOrder(orderById(record.orderId)); return residentView(record) },
    approveAfterSale: async (id: string) => { const record = merchant(id); assertReview(record); log(record, '商户同意售后', record.serviceType === 'RETURN_MONEY' ? '同意退款，等待平台退款，不代表已到账。' : '同意退货，等待居民退回商品。', deps.merchant().operatorName); record.serviceStatus = record.serviceType === 'RETURN_MONEY' ? 'WAIT_REFUND' : 'BUYER_RETURN'; syncOrder(orderById(record.orderId)); return merchantView(record) },
    rejectAfterSale: async (id: string, reason: string) => { const record = merchant(id); assertReview(record); if (!reason.trim() || reason.length > 500) throw new Error('拒绝原因必填，最多 500 字。'); record.merchantAuditRemark = reason.trim(); record.serviceStatus = 'REFUSE'; log(record, '商户拒绝售后', record.merchantAuditRemark, deps.merchant().operatorName); syncOrder(orderById(record.orderId)); return merchantView(record) },
    submitReturnShipment: async (id: string, input: ReturnShipmentInput) => {
      const record = resident(id)
      if (record.serviceType !== 'RETURN_GOODS' || record.serviceStatus !== 'BUYER_RETURN' || record.mDeliverTime) throw new Error('退货状态已变化，不能重复提交退货信息。')
      if (!['现场退回', '自行快递'].includes(input.returnMethod)) throw new Error('请选择有效退货方式。')
      if (input.returnMethod === '自行快递' && (!input.mLogisticsCode?.trim() || !input.mLogisticsName?.trim() || !/^[A-Za-z0-9-]{5,40}$/.test(input.mLogisticsNo?.trim() || ''))) throw new Error('请填写退货物流公司及 5—40 位有效单号。')
      if ((input.remark || '').length > 200) throw new Error('退货备注最多 200 字。')
      Object.assign(record, { returnMethod: input.returnMethod, mLogisticsCode: input.returnMethod === '自行快递' ? input.mLogisticsCode?.trim() : undefined, mLogisticsName: input.returnMethod === '自行快递' ? input.mLogisticsName?.trim() : undefined, mLogisticsNo: input.returnMethod === '自行快递' ? input.mLogisticsNo?.trim() : undefined, mDeliverTime: deps.now(), returnRemark: input.remark?.trim() })
      log(record, '居民提交退货', input.returnMethod === '自行快递' ? `${record.mLogisticsName} ${record.mLogisticsNo}。` : '居民登记现场退回，等待商家实际核对收到。', record.memberName)
      syncOrder(orderById(record.orderId)); return residentView(record)
    },
    confirmReturnReceived: async (id: string) => { const record = merchant(id), order = orderById(record.orderId); if (order.tradeStatus === '已关闭') throw new Error('订单已关闭。'); if (record.serviceStatus !== 'BUYER_RETURN' || !record.mDeliverTime) throw new Error(record.returnReceivedAt ? '已确认收货，禁止重复确认。' : '退货尚未提交或状态已变化。'); record.returnReceivedAt = deps.now(); record.serviceStatus = 'SELLER_CONFIRM'; log(record, '商户确认收到退货', '实际收到商品，进入等待平台退款。', deps.merchant().operatorName); record.serviceStatus = 'WAIT_REFUND'; syncOrder(order); return merchantView(record) },
    processPlatformRefundDemo: async (id: string, outcome: 'processing' | 'success' | 'failure') => {
      const record = find(id)
      if (record.serviceStatus === 'COMPLETE') return merchantView(record)
      if (record.serviceStatus !== 'WAIT_REFUND') throw new Error('当前售后未进入等待平台退款。')
      if (!['processing', 'success', 'failure'].includes(outcome)) throw new Error('平台 Mock 退款结果无效。')
      const status = outcome === 'success' ? '退款成功' : outcome === 'failure' ? '退款失败' : '退款处理中'
      if (record.refundStatus === status) return merchantView(record)
      const order = orderById(record.orderId)
      record.profitSharingReturnRequired = order.profitSharingStatus === '已分账' || order.profitSharingStatus === '分账中'
      record.fundAdjustmentStatus = record.profitSharingReturnRequired ? '待平台资金调整' : '无需回退'
      if (outcome === 'success') {
        // Restore only here, never again when the seller confirms receipt.
        if (!record.stockRestored && (record.serviceType === 'RETURN_GOODS' ? Boolean(record.returnReceivedAt) : record.restoreStockOnRefund && !delivered(order))) { deps.restoreStock(record.productId, record.skuId, record.quantity); record.stockRestored = true }
        record.actualRefundAmount = record.applyRefundAmount; record.refundAt = deps.now(); record.refundTransactionNo = 'MOCK-REFUND-' + record.id
        record.serviceStatus = 'COMPLETE'
      }
      record.refundStatus = status
      log(record, '平台 Mock ' + status, outcome === 'success' ? '模拟原支付渠道退回；未发起真实退款或分账回退。' : outcome === 'failure' ? '平台模拟退款异常，保留待退款，可由平台重试。' : '平台模拟发起退款，等待结果。', '平台支付退款服务（Mock）')
      syncOrder(order); return merchantView(record)
    },
    getMerchantAfterSales: async () => { deps.refresh(); const visible = records.filter(owns); const match = (record: AfterSaleRecord, filter: MerchantAfterSaleFilter) => filter === 'all' || (filter === 'pending' ? record.serviceStatus === 'APPLY' : filter === 'processing' ? active(record) && record.serviceStatus !== 'APPLY' : !active(record)); return { records: visible.map(merchantView), filters: ([{ key: 'pending', label: '待处理' }, { key: 'processing', label: '处理中' }, { key: 'completed', label: '已完成' }, { key: 'all', label: '全部' }] as const).map(filter => ({ ...filter, count: visible.filter(record => match(record, filter.key)).length })) } },
    getMerchantAfterSaleTodo: () => ({ value: records.filter(record => owns(record) && record.serviceStatus === 'APPLY').length, description: '待商家审核' }),
    getMockAfterSaleSnapshot: () => clone({ records, submitted: [...submitted], sequence }),
    restoreMockAfterSaleSnapshot: (snapshot?: { records: AfterSaleRecord[]; submitted: [string, string][]; sequence: number }) => { records = clone(snapshot?.records || []); submitted.clear(); snapshot?.submitted.forEach(([key, id]) => submitted.set(key, id)); sequence = snapshot?.sequence || 0; deps.orders().forEach(syncOrder) },
  }
}
