import type { ProductSummary, QuickEntry, ServiceSummary } from '../../common/types/app'

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

const services: ServiceSummary[] = [
  { id: 's-001', name: '日常家庭保洁', description: '全屋深度清洁、厨房卫浴全面清洁消杀', priceLabel: '¥45/小时起', tag: '上门服务', image: '/static/images/home/service-cleaning.png', available: false, icon: 'cleaning' },
  { id: 's-002', name: '专业家电维修', description: '水暖管道、电路照明、空调电器排障', priceLabel: '¥30起', tag: '上门服务', image: '/static/images/home/service-repair.png', available: false, icon: 'repair' },
  { id: 's-003', name: '助老上门服务', description: '助餐协助、陪同就医、生活照料与助办', priceLabel: '公益敬老 / 预约上门', tag: '爱心便民服务', image: '/static/images/home/service-elderly.png', available: false, icon: 'heart' },
]

export const residentMockAdapter = {
  getResidentHome: () => waitForMock({ entries: residentEntries, services, products }),
  getMallHome: () => waitForMock({ categories: ['生鲜果蔬', '米面粮油', '生活日用', '熟食餐饮', '社区精选'], products }),
  getResidentEntries: () => waitForMock(residentServiceEntries),
  getResidentProfile: () => waitForMock({
    member: { name: '王阿姨', mobile: '138****5821', role: '居民用户' },
    groups: [
      { title: '我的订单', items: ['待支付', '待履约', '待自提', '待评价', '售后'] },
      { title: '我的服务', items: ['预约与服务进度'] },
      { title: '我的社区', items: ['我的房屋', '物业缴费', '我的车辆', '停车缴费'] },
      { title: '邻里生活', items: ['我的闲置', '我的互助'] },
      { title: '更多', items: ['我的积分', '收货地址', '消息中心', '意见反馈', '设置'] },
    ],
  }),
}
