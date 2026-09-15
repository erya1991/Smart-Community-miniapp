import type { MerchantOrderSummary, MerchantOrdersSummary, MerchantProductSummary, MerchantProductsSummary, MerchantProfileSummary } from '../../common/types/app'

const waitForMock = async <T>(value: T): Promise<T> => Promise.resolve(value)

const merchantProducts: MerchantProductSummary[] = [
  { id: 'm-001', name: '当日新鲜蔬菜组合', description: '规格：约1.5kg 惠民保鲜装', category: '生鲜时蔬', unit: '份', price: 1990, stock: 38, auditStatus: '已通过', saleStatus: '销售中', image: '/static/images/catalog/vegetables.png' },
  { id: 'm-002', name: '南京江宁横溪西瓜精选装', description: '单果重 3.5kg-4kg 基地直发', category: '特色林果', unit: '个', price: 2800, stock: 50, auditStatus: '待审核', saleStatus: '未上架', image: '/static/images/catalog/watermelon.png' },
  { id: 'm-003', name: '农家土鸡蛋礼盒装', description: '精选散养慢产 顺丰现配', category: '农副产品', unit: '盒', price: 4500, stock: 20, auditStatus: '已驳回', saleStatus: '未上架', image: '/static/images/catalog/eggs.png', rejectionReason: '商品主图需清晰展示保质期与商品全貌，请核对后重新提交。' },
  { id: 'm-004', name: '本地水芹鲜嫩装', description: '水八仙时令菜 清炒回甘', category: '水生鲜蔬', unit: '把', price: 650, stock: 0, auditStatus: '已通过', saleStatus: '已下架', image: '/static/images/catalog/water-dropwort.png' },
]

const merchantProductFilters = [
  { label: '全部', count: merchantProducts.length },
  { label: '销售中', count: merchantProducts.filter((item) => item.saleStatus === '销售中').length },
  { label: '待审核', count: merchantProducts.filter((item) => item.auditStatus === '待审核').length },
  { label: '已驳回', count: merchantProducts.filter((item) => item.auditStatus === '已驳回').length },
  { label: '已下架', count: merchantProducts.filter((item) => item.saleStatus === '已下架').length },
]

const merchantOrders: MerchantOrderSummary[] = [
  { id: 'order-001', no: 'M202609040001', status: '待备货', fulfillment: '社区自提', amount: 6890, count: 3, customerName: '王阿姨', itemSummary: '当日新鲜蔬菜组合等 3 件', createdAt: '2026-09-04 09:30', promise: '请尽快完成备货' },
  { id: 'order-002', no: 'M202609040002', status: '待配送', fulfillment: '商户配送', amount: 4990, count: 1, customerName: '李叔叔', itemSummary: '正宗五常大米 5kg', createdAt: '2026-09-04 09:12', promise: '承诺 16:00 前送出' },
  { id: 'order-003', no: 'M202609030018', status: '已完成', fulfillment: '社区自提', amount: 3980, count: 2, customerName: '陈女士', itemSummary: '社区暖心早餐包组合等 2 件', createdAt: '2026-09-03 18:20', promise: '已完成核销' },
]

const merchantOrderFilters = [
  { label: '全部', count: merchantOrders.length },
  { label: '待处理', count: merchantOrders.filter((item) => item.status === '待备货').length },
  { label: '履约中', count: merchantOrders.filter((item) => ['待配送', '配送中'].includes(item.status)).length },
  { label: '已完成', count: merchantOrders.filter((item) => item.status === '已完成').length },
]

export const merchantMockAdapter = {
  getMerchantWorkbench: () => waitForMock({
    merchant: { name: '邻里生鲜', storeName: '大光路店', operationStatus: '经营正常', businessHours: '07:00 - 21:30' },
    todoTotal: 14,
    todos: [
      { label: '待审核商品', value: 2, description: '待平台审核' },
      { label: '待备货', value: 6, description: '已支付订单' },
      { label: '待配送', value: 3, description: '商户配送' },
      { label: '待核销', value: 2, description: '自提或到店' },
    ],
    afterSales: { value: 1, description: '退款及售后待确认' },
    today: { orderCount: 18, amount: 128600 },
    funds: { pending: 38600, completed: 258000 },
  }),
  getMerchantProducts: (): Promise<MerchantProductsSummary> => waitForMock({ filters: merchantProductFilters, products: merchantProducts }),
  getMerchantOrders: (): Promise<MerchantOrdersSummary> => waitForMock({ filters: merchantOrderFilters, orders: merchantOrders }),
  getMerchantProfile: (): Promise<MerchantProfileSummary> => waitForMock({
    merchant: { name: '邻里生鲜', storeName: '大光路店', role: '商户负责人', projectName: '大光路智慧社区（秦淮区）' },
    qualification: {
      projectName: '大光路智慧社区（秦淮区）',
      businessStatus: '已生效 · 有效',
      businessDescription: '主体、资质与合作关系已完成核验',
      transactionStatus: '配置中 · 暂未具备',
      transactionDescription: '资金接入与正式交易资格待完成配置',
      reminder: '业务经营资格支持正常运营；正式交易资格完成后即可开展线上支付。',
    },
    groups: [
      {
        title: '商户管理',
        items: [
          { label: '基本资料', icon: 'user', description: '负责人及主体信息' },
          { label: '门店', icon: 'store', description: '门店信息与营业时间' },
          { label: '人员', icon: 'neighbor', description: '协作成员与权限' },
          { label: '资质', icon: 'verified', description: '资质证照与经营类目' },
        ],
      },
      {
        title: '经营与资质',
        items: [
          { label: '合作状态', icon: 'services', description: '项目合作关系' },
          { label: '经营资格', icon: 'verified', description: '双资格认定状态' },
        ],
      },
      {
        title: '通用设置',
        items: [
          { label: '消息', icon: 'bell', description: '通知与提醒' },
          { label: '设置', icon: 'settings', description: '账号与偏好', tone: 'gray' },
        ],
      },
    ],
  }),
}
