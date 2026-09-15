const waitForMock = async <T>(value: T): Promise<T> => Promise.resolve(value)

export const merchantMockAdapter = {
  getMerchantWorkbench: () => waitForMock({
    merchant: { name: '邻里生鲜', storeName: '大光路店', operationStatus: '经营正常' },
    todos: [
      { label: '待审核商品', value: 2, description: '待平台审核' },
      { label: '待备货', value: 6, description: '已支付订单' },
      { label: '待配送', value: 3, description: '商户配送' },
      { label: '待核销', value: 2, description: '自提或到店' },
    ],
    today: { orderCount: 18, amount: 128600 },
    funds: { pending: 38600, completed: 258000 },
  }),
  getMerchantProducts: () => waitForMock([
    { id: 'm-001', name: '当日新鲜蔬菜组合', price: 1990, stock: 38, auditStatus: '已通过', saleStatus: '销售中', image: '/static/images/product-vegetables.svg' },
    { id: 'm-002', name: '南京江宁横溪西瓜精选装', price: 2800, stock: 50, auditStatus: '待审核', saleStatus: '未上架', image: '/static/images/product-peach.svg' },
    { id: 'm-003', name: '农家土鸡蛋礼盒装', price: 4500, stock: 20, auditStatus: '已驳回', saleStatus: '未上架', image: '/static/images/product-breakfast.svg' },
  ]),
  getMerchantOrders: () => waitForMock([
    { id: 'order-001', no: '202609110001', status: '待备货', fulfillment: '社区自提', amount: 6890, count: 3 },
    { id: 'order-002', no: '202609110002', status: '待配送', fulfillment: '商户配送', amount: 4990, count: 1 },
  ]),
  getMerchantProfile: () => waitForMock({
    merchant: { name: '邻里生鲜', role: '商户负责人' },
    groups: [
      { title: '商户管理', items: ['基本资料', '门店', '人员', '资质'] },
      { title: '经营状态', items: ['合作状态', '经营资格'] },
      { title: '通用设置', items: ['消息', '设置'] },
    ],
  }),
}
