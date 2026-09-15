import type { ProductSummary, QuickEntry, ResidentProfileSummary, ServiceSummary } from '../../common/types/app'

const waitForMock = async <T>(value: T): Promise<T> => Promise.resolve(value)

const residentEntries: QuickEntry[] = [
  { id: 'service', label: '社区服务', icon: 'services', tone: 'teal', available: false },
  { id: 'property', label: '物业缴费', icon: 'bill', tone: 'teal', available: false },
  { id: 'parking', label: '停车缴费', icon: 'parking', tone: 'blue', available: false },
  { id: 'house', label: '房屋绑定', icon: 'key', tone: 'orange', available: false },
  { id: 'mall', label: '社区商城', icon: 'bag', tone: 'orange', path: '/pages/mall/index', available: true },
  { id: 'idle', label: '闲置共享', icon: 'recycle', tone: 'green', available: false },
  { id: 'help', label: '邻里互助', icon: 'neighbor', tone: 'blue', available: false },
  { id: 'all', label: '全部服务', icon: 'more', tone: 'gray', path: '/pages/service/index', available: true },
]

const residentServiceEntries: QuickEntry[] = [
  ...residentEntries.filter((item) => ['property', 'parking'].includes(item.id)),
  residentEntries.find((item) => item.id === 'house')!,
  { id: 'my-house', label: '我的房屋', icon: 'house', tone: 'teal', available: false },
  { id: 'my-car', label: '车辆管理', icon: 'car', tone: 'blue', available: false },
  { id: 'cleaning', label: '家政保洁', icon: 'cleaning', tone: 'green', available: false },
  { id: 'repair', label: '家电维修', icon: 'repair', tone: 'orange', available: false },
  { id: 'elderly', label: '助老服务', icon: 'heart', tone: 'orange', available: false },
  { id: 'more-service', label: '更多服务', icon: 'more', tone: 'gray', path: '/pages/service/index', available: true },
  residentEntries.find((item) => item.id === 'idle')!,
  residentEntries.find((item) => item.id === 'help')!,
  residentEntries.find((item) => item.id === 'mall')!,
]

const products: ProductSummary[] = [
  { id: 'p-001', name: '当日新鲜蔬菜组合', merchantName: '邻里生鲜', price: 19.9, fulfillment: '社区自提', imageTone: '#d9e8d7', image: '/static/images/product-vegetables.svg', homeImage: '/static/images/home/product-vegetables.png' },
  { id: 'p-002', name: '正宗五常大米 5kg', merchantName: '大光路生活超市', price: 49.9, fulfillment: '商户配送', imageTone: '#eadfcf', image: '/static/images/product-rice.svg', homeImage: '/static/images/home/product-rice.png' },
  { id: 'p-003', name: '时令水蜜桃家庭装', merchantName: '邻里生鲜', price: 29.9, fulfillment: '社区自提', imageTone: '#f1d9d1', image: '/static/images/product-peach.svg', homeImage: '/static/images/home/product-tissue.png', homeName: '家庭装竹浆抽纸', homeMerchantName: '大光路百货便利店', homePrice: 19.9 },
  { id: 'p-004', name: '社区暖心早餐包组合', merchantName: '大光路社区食堂', price: 15.8, fulfillment: '社区自提', imageTone: '#eee1ca', image: '/static/images/product-breakfast.svg', homeImage: '/static/images/home/product-peach.png', homeName: '时令水蜜桃家庭装', homeMerchantName: '邻里生鲜', homePrice: 29.9 },
]

const mallProducts: ProductSummary[] = [
  ...products.map((product, index) => ({ ...product, image: `/static/images/catalog/${['vegetables', 'rice', 'peach', 'breakfast'][index]}.png` })),
  { id: 'p-005', name: '原生竹浆家庭装抽纸', merchantName: '大光路生活超市', price: 18.9, fulfillment: '商户配送', imageTone: '#e8e3d9', image: '/static/images/catalog/tissue.png' },
  { id: 'p-006', name: '传统手作鲜肉小馄饨', merchantName: '大光路社区食堂', price: 16.5, fulfillment: '社区自提', imageTone: '#eadfcf', image: '/static/images/catalog/wonton.png' },
]

const services: ServiceSummary[] = [
  { id: 's-001', name: '日常家庭保洁', description: '全屋深度清洁、厨房卫浴全面清洁消杀', priceLabel: '¥45/小时起', tag: '上门服务', image: '/static/images/home/service-cleaning.png', available: false, icon: 'cleaning' },
  { id: 's-002', name: '专业家电维修', description: '水暖管道、电路照明、空调电器排障', priceLabel: '¥30起', tag: '上门服务', image: '/static/images/home/service-repair.png', available: false, icon: 'repair' },
  { id: 's-003', name: '助老上门服务', description: '助餐协助、陪同就医、生活照料与助办', priceLabel: '公益敬老 / 预约上门', tag: '爱心便民服务', image: '/static/images/home/service-elderly.png', available: false, icon: 'heart' },
]

export const residentMockAdapter = {
  getResidentHome: () => waitForMock({ entries: residentEntries, services, products }),
  getMallHome: () => waitForMock({ categories: ['生鲜果蔬', '米面粮油', '生活日用', '熟食餐饮', '社区精选'], products: mallProducts }),
  getResidentEntries: () => waitForMock(residentServiceEntries),
  getResidentProfile: (): Promise<ResidentProfileSummary> => waitForMock({
    member: { name: '王阿姨', mobile: '138****5821', role: '居民用户', projectName: '大光路智慧社区' },
    groups: [
      {
        title: '我的订单',
        type: 'orders',
        items: [
          { label: '待支付', icon: 'bill' },
          { label: '待履约', icon: 'car', badge: '1' },
          { label: '待自提', icon: 'bag' },
          { label: '待评价', icon: 'message' },
          { label: '售后', icon: 'recycle' },
        ],
      },
      {
        title: '我的服务',
        type: 'service',
        items: [{ label: '预约与服务进度', icon: 'services', description: '查看预约与服务进度', actionText: '查看进度' }],
      },
      {
        title: '我的社区',
        type: 'tiles',
        items: [
          { label: '我的房屋', icon: 'house', description: '已绑定 1 处...' },
          { label: '物业缴费', icon: 'bill', description: '在线查缴与...' },
          { label: '我的车辆', icon: 'car', description: '苏A·12345' },
          { label: '停车缴费', icon: 'parking', description: '月卡/临停结算' },
        ],
      },
      {
        title: '邻里生活',
        type: 'tiles',
        items: [
          { label: '我的闲置', icon: 'recycle', description: '发布与流转记录', tone: 'orange' },
          { label: '我的互助', icon: 'neighbor', description: '互助求助与响应', tone: 'orange' },
        ],
      },
      {
        title: '更多',
        type: 'list',
        items: [
          { label: '我的积分', icon: 'points', value: '120 分' },
          { label: '收货地址', icon: 'location', value: '大光新村 12幢...' },
          { label: '消息中心', icon: 'bell', badge: 'dot' },
          { label: '意见反馈', icon: 'message' },
          { label: '设置', icon: 'settings', tone: 'gray' },
        ],
      },
    ],
  }),
}
