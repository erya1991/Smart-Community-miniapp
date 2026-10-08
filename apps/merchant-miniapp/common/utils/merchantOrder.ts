import type { MerchantOrderFilter, TradeOrder } from '../types/mall'

export const isOrderPaid = (order: TradeOrder) => ['支付成功', 'Mock成功'].includes(order.paymentStatus) && order.tradeStatus !== '已关闭'
export const merchantOrderStatus = (order: TradeOrder) => order.tradeStatus === '已关闭' ? '已关闭' : !isOrderPaid(order) ? order.paymentStatus : order.tradeStatus === '已完成' ? '已完成' : order.fulfillmentStatus
export const matchesMerchantOrderFilter = (order: TradeOrder, filter: MerchantOrderFilter) => {
  if (filter === 'all') return true
  if (!isOrderPaid(order)) return false
  const status = merchantOrderStatus(order)
  if (filter === 'preparing') return status === '待备货'
  if (filter === 'delivery') return ['待配送', '待发货'].includes(status)
  if (filter === 'transit') return ['配送中', '已发货', '已送达'].includes(status)
  if (filter === 'verification') return ['待自提', '待核销'].includes(status)
  return status === '已完成'
}
export const merchantOrderAction = (order: TradeOrder) => {
  if (!isOrderPaid(order) || order.afterSaleStatus !== '无售后' || order.tradeStatus === '已完成') return ''
  const status = order.fulfillmentStatus
  if (status === '待备货') return '完成备货'
  if (order.fulfillmentMethod === '商户配送' && status === '待配送') return '开始配送'
  if (order.fulfillmentMethod === '商户配送' && status === '配送中') return '确认送达'
  if (order.fulfillmentMethod === '普通物流' && status === '待发货') return '发货'
  if (order.fulfillmentMethod === '普通物流' && status === '已发货') return '查看物流'
  if (['社区自提', '到店核销'].includes(order.fulfillmentMethod) && ['待自提', '待核销'].includes(status)) return '去核销'
  return ''
}
