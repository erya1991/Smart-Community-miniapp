import type {
  BusinessQualificationCheck,
  CartItem,
  CartSummary,
  FulfillmentMethod,
  MallCategory,
  MallProduct,
  MallProductDetail,
  MallProductQuery,
  MallPurchaseEligibility,
  MallStoreAvailability,
  ProductEditorPayload,
  ProductSku,
  ResidentMallProductSummary,
  TradeQualificationCheck,
} from '../../common/types/mall'
import { createMallTradeMockAdapter } from './trade'
import { isSellableSku, selectMallProducts } from '../../common/utils/mallCatalog'

const PROJECT_ID = 'project-daguanglu'
const OPERATOR_ID = 'operator-linli'
const waitForMock = async <T>(value: T): Promise<T> => Promise.resolve(value)
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const categories: MallCategory[] = [
  { id: 'category-fresh', name: '生鲜果蔬', icon: 'leaf', enabled: true },
  { id: 'category-grain', name: '米面粮油', icon: 'grain', enabled: true },
  { id: 'category-household', name: '生活日用', icon: 'household', enabled: true },
  { id: 'category-food', name: '熟食餐饮', icon: 'food', enabled: true },
  { id: 'category-featured', name: '社区精选', icon: 'verified', enabled: false },
]

const createSku = (id: string, name: string, price: number, stock: number, overrides: Partial<ProductSku> = {}): ProductSku => ({
  id,
  name,
  price,
  marketPrice: Math.round(price * 1.2),
  code: `SKU-${id.toUpperCase()}`,
  availableStock: stock,
  reservedStock: 0,
  warningStock: 5,
  isMain: true,
  valid: true,
  ...overrides,
})

const initialProducts: MallProduct[] = [
  {
    id: 'product-vegetables', projectId: PROJECT_ID, operatorId: OPERATOR_ID, merchantName: '邻里生鲜', storeName: '大光路店', storeAddress: '秦淮区大光路138号邻里集市1楼', category: '生鲜果蔬', name: '当日新鲜蔬菜组合', sellingPoint: '当日清晨鲜采，基地直供，新鲜到家。', mainImage: '/static/images/catalog/vegetables.png', gallery: ['/static/images/catalog/vegetables.png'], detail: '精选青菜、番茄、脆黄瓜和时令配菜，建议冷藏保存，3—5天内食用更佳。', fulfillmentMethods: ['商户配送', '社区自提'], deliveryNote: '社区辖区内配送，预计当日16:00—18:00送达。', afterSaleNote: '生鲜商品请在收货后及时验货；如有问题请联系商户处理。', auditStatus: '已通过', saleStatus: '销售中', skus: [createSku('veg-family', '家庭装（约2.5kg）', 1990, 38, { code: 'VEG-FAMILY-25', warningStock: 8 }), createSku('veg-two', '双人尝鲜装（约1.2kg）', 1250, 12, { code: 'VEG-TRY-12', isMain: false, warningStock: 5 })],
  },
  {
    id: 'product-rice', projectId: PROJECT_ID, operatorId: 'operator-supermarket', merchantName: '大光路生活超市', storeName: '大光路便民店', storeAddress: '秦淮区大光路88号', category: '米面粮油', name: '正宗五常大米 5kg', sellingPoint: '抽真空锁鲜包装，米香自然。', mainImage: '/static/images/catalog/rice.png', gallery: ['/static/images/catalog/rice.png'], detail: '5kg家庭装，阴凉干燥处保存。', fulfillmentMethods: ['商户配送'], deliveryNote: '支持社区内配送，满额免配送费。', afterSaleNote: '包装完好商品支持按平台规则售后。', auditStatus: '已通过', saleStatus: '销售中', skus: [createSku('rice-5kg', '5kg 抽真空锁鲜装', 4990, 56, { code: 'RICE-WC-5KG' })],
  },
  {
    id: 'product-tissue', projectId: PROJECT_ID, operatorId: 'operator-lifestyle', merchantName: '大光路百货便利店', storeName: '大光路百货便利店', storeAddress: '秦淮区大光路96号', category: '生活日用', name: '家庭装竹浆抽纸', sellingPoint: '整箱家庭装，柔韧亲肤。', mainImage: '/static/images/catalog/tissue.png', gallery: ['/static/images/catalog/tissue.png'], detail: '原生竹浆抽纸，适合家庭日常使用。', fulfillmentMethods: ['商户配送', '到店核销'], deliveryNote: '支持项目内配送，配送时段以门店实际安排为准。', afterSaleNote: '未拆封商品可联系商户协商售后。', auditStatus: '已通过', saleStatus: '销售中', skus: [createSku('tissue-box', '24 包整箱装', 1890, 60, { code: 'TISSUE-24', reservedStock: 2, warningStock: 10 })],
  },
  {
    id: 'product-peach', projectId: PROJECT_ID, operatorId: OPERATOR_ID, merchantName: '邻里生鲜', storeName: '大光路店', storeAddress: '秦淮区大光路138号邻里集市1楼', category: '生鲜果蔬', name: '南京江宁横溪西瓜精选装', sellingPoint: '基地直发，清甜多汁。', mainImage: '/static/images/catalog/watermelon.png', gallery: ['/static/images/catalog/watermelon.png'], detail: '单果约3.5—4kg，切开后请冷藏保存。', fulfillmentMethods: ['商户配送'], deliveryNote: '商户配送，预计当日送达。', afterSaleNote: '生鲜品请当面验货。', auditStatus: '待审核', saleStatus: '未上架', skus: [createSku('watermelon-one', '单果精选装', 2800, 50, { code: 'MELON-JN-01' })],
  },
  {
    id: 'product-eggs', projectId: PROJECT_ID, operatorId: OPERATOR_ID, merchantName: '邻里生鲜', storeName: '大光路店', storeAddress: '秦淮区大光路138号邻里集市1楼', category: '生鲜果蔬', name: '农家土鸡蛋礼盒装', sellingPoint: '精选散养慢产，顺丰现配。', mainImage: '/static/images/catalog/eggs.png', gallery: ['/static/images/catalog/eggs.png'], detail: '30枚礼盒装，请置于阴凉干燥处。', fulfillmentMethods: ['社区自提'], deliveryNote: '到店后凭取货码自提。', afterSaleNote: '易碎商品请当场查验。', auditStatus: '已驳回', saleStatus: '未上架', rejectionReason: '商品主图需清晰展示保质期与商品全貌，请核对后重新提交。', skus: [createSku('eggs-30', '30枚礼盒装', 4500, 20, { code: 'EGG-FARM-30' })],
  },
  {
    id: 'product-water-dropwort', projectId: PROJECT_ID, operatorId: OPERATOR_ID, merchantName: '邻里生鲜', storeName: '大光路店', storeAddress: '秦淮区大光路138号邻里集市1楼', category: '生鲜果蔬', name: '本地水芹鲜嫩装', sellingPoint: '水八仙时令菜，清炒回甘。', mainImage: '/static/images/catalog/water-dropwort.png', gallery: ['/static/images/catalog/water-dropwort.png'], detail: '水芹鲜嫩，建议当天食用。', fulfillmentMethods: ['社区自提'], deliveryNote: '大光路社区服务点自提。', afterSaleNote: '生鲜商品请及时验货。', auditStatus: '已通过', saleStatus: '已下架', skus: [createSku('dropwort-500', '500g 鲜嫩装', 650, 0, { code: 'VEG-DROP-500', warningStock: 5 })],
  },
  {
    id: 'product-breakfast', projectId: PROJECT_ID, operatorId: 'operator-canteen', merchantName: '大光路社区食堂', storeName: '社区食堂', storeAddress: '秦淮区大光路社区服务中心东侧', category: '熟食餐饮', name: '社区暖心早餐包组合', sellingPoint: '现做现取，早餐更安心。', mainImage: '/static/images/catalog/breakfast.png', gallery: ['/static/images/catalog/breakfast.png'], detail: '含包子、豆浆及鸡蛋，建议当日食用。', fulfillmentMethods: ['社区自提'], deliveryNote: '08:00—10:00到社区食堂取餐。', afterSaleNote: '餐食制作后不支持无理由退换。', auditStatus: '已通过', saleStatus: '销售中', skus: [createSku('breakfast-one', '单人早餐包', 1580, 18, { code: 'FOOD-BREAKFAST-01', warningStock: 6 })],
  },
  {
    id: 'product-wonton', projectId: PROJECT_ID, operatorId: 'operator-canteen', merchantName: '大光路社区食堂', storeName: '社区食堂', storeAddress: '秦淮区大光路社区服务中心东侧', category: '熟食餐饮', name: '传统手作鲜肉小馄饨', sellingPoint: '手作鲜肉馅，现包现煮。', mainImage: '/static/images/catalog/wonton.png', gallery: ['/static/images/catalog/wonton.png'], detail: '传统石臼馄饨，建议到店自提。', fulfillmentMethods: ['社区自提'], deliveryNote: '到店后凭取货码自提。', afterSaleNote: '餐食制作后不支持无理由退换。', auditStatus: '已通过', saleStatus: '销售中', skus: [createSku('wonton-12', '12只鲜肉小馄饨', 1650, 1, { code: 'FOOD-WONTON-12', warningStock: 4 })],
  },
]

const catalogMetrics: Record<string, { salesCount: number; reviewCount: number }> = {
  'product-vegetables': { salesCount: 326, reviewCount: 58 },
  'product-rice': { salesCount: 182, reviewCount: 36 },
  'product-tissue': { salesCount: 468, reviewCount: 72 },
  'product-breakfast': { salesCount: 615, reviewCount: 94 },
  'product-wonton': { salesCount: 258, reviewCount: 42 },
}

/** Seed overrides allow isolated unavailable/stock/query scenarios without UI debug switches. */
interface MallMockOptions {
  productOverrides?: Record<string, Partial<MallProduct>>
  categoryOverrides?: Record<string, Partial<MallCategory>>
  storeOverrides?: Record<string, Partial<MallStoreAvailability>>
}

export function createMallMockAdapter(options: MallMockOptions = {}) {
  const mallCategories = categories.map((category) => ({ ...category, ...options.categoryOverrides?.[category.id] }))
  let products: MallProduct[] = clone(initialProducts.map((product) => ({
    ...product,
    ...catalogMetrics[product.id],
    ...(product.id === 'product-vegetables' ? {
      specifications: [{ name: '份量', values: product.skus.map((sku) => sku.name) }, { name: '包装', values: ['袋装'] }],
      skus: product.skus.map((sku) => ({ ...sku, specValues: { 份量: sku.name, 包装: '袋装' } })),
    } : {}),
    ...options.productOverrides?.[product.id],
  })))
  const storeAvailability = (operatorId: string): MallStoreAvailability => ({
    enabled: true, businessAllowed: true, tradeAllowed: true, ...options.storeOverrides?.[operatorId],
  })
  const purchaseEligibility = (product: MallProduct): MallPurchaseEligibility => {
    const store = storeAvailability(product.operatorId)
    if (product.auditStatus !== '已通过' || product.saleStatus !== '销售中') return { allowed: false, reason: '商品尚未审核上架，暂不可购买。' }
    if (!store.enabled) return { allowed: false, reason: store.reason || '店铺已暂停营业，暂不可购买。' }
    if (!store.businessAllowed) return { allowed: false, reason: store.reason || '店铺经营资格暂不可用，请稍后再来。' }
    if (!store.tradeAllowed) return { allowed: false, reason: store.reason || '店铺暂不可交易，请选择其他商品。' }
    return { allowed: true, reason: '' }
  }
  const toResidentSummary = (product: MallProduct): ResidentMallProductSummary => {
    const availableSkus = product.skus.filter(isSellableSku)
    const sku = availableSkus.find((item) => item.isMain) || availableSkus[0] || product.skus.find((item) => item.isMain) || product.skus[0]
    const stock = sku?.availableStock || 0
    return {
      id: product.id, category: product.category, categoryId: mallCategories.find((item) => item.name === product.category)?.id || '',
      name: product.name, sellingPoint: product.sellingPoint, merchantName: product.merchantName, storeName: product.storeName,
      salesCount: product.salesCount || 0, reviewCount: product.reviewCount, purchaseEligibility: purchaseEligibility(product),
      price: (sku?.price || 0) / 100, fulfillment: product.fulfillmentMethods[0], image: product.mainImage, imageTone: '#edf2ef',
      soldOut: availableSkus.length === 0, stockTight: availableSkus.length > 0 && stock <= (sku?.warningStock || 0),
    }
  }
  let cartItems: CartItem[] = [
    { id: 'cart-vegetables', productId: 'product-vegetables', skuId: 'veg-family', quantity: 2, selected: true, status: 'normal', latestPrice: 1990 },
    { id: 'cart-rice', productId: 'product-rice', skuId: 'rice-5kg', quantity: 1, selected: true, status: 'normal', latestPrice: 4990 },
    { id: 'cart-wonton', productId: 'product-wonton', skuId: 'wonton-12', quantity: 2, selected: false, status: 'stock-insufficient', latestPrice: 1650 },
    { id: 'cart-off-shelf', productId: 'product-water-dropwort', skuId: 'dropwort-500', quantity: 1, selected: false, status: 'off-shelf', latestPrice: 650 },
  ]

  const findProduct = (id: string) => products.find((item) => item.id === id)
  const findSku = (productId: string, skuId: string) => findProduct(productId)?.skus.find((item) => item.id === skuId)
  const publicVersion = (product: MallProduct) => product.auditStatus === '已通过' ? product : product.publishedSnapshot
  const residentProducts = (query: MallProductQuery = {}) => selectMallProducts(products
    .filter((item) => item.saleStatus === '销售中')
    .map(publicVersion).filter((item): item is MallProduct => Boolean(item && item.auditStatus === '已通过'))
    .filter((item) => mallCategories.some((category) => category.enabled && category.name === item.category))
    .map(toResidentSummary), query)
  const qualification = (): BusinessQualificationCheck => ({ allowed: true, message: '当前项目的商城业务经营资格有效，可提交审核和上架。' })
  const requireQualification = () => {
    const result = qualification()
    if (!result.allowed) throw new Error(result.message)
  }
  const defaultSku = (product: MallProduct) => product.skus.find((item) => item.isMain) || product.skus[0]
  const tradeQualification = (): TradeQualificationCheck => ({
    businessAllowed: true,
    formalTradeAllowed: false,
    mockPayAllowed: true,
    message: '当前为开发测试环境：商城业务经营资格有效，可使用 Mock Pay；正式交易资格尚未接入真实支付。',
  })
  const trade = createMallTradeMockAdapter({
    projectId: PROJECT_ID,
    operatorId: OPERATOR_ID,
    findProduct,
    findSku,
    getCartItems: (ids) => cartItems.filter((item) => item.status === 'normal' && (!ids?.length || ids.includes(item.id))).map(clone),
    removeCartItems: (ids) => { cartItems = cartItems.filter((item) => !ids.includes(item.id)) },
    updateStock: (productId, skuId, quantity, action) => {
      const sku = findSku(productId, skuId)
      if (!sku) throw new Error('商品规格已失效，请重新确认订单。')
      if (action === 'reserve') {
        if (sku.availableStock < quantity) throw new Error(`库存不足，当前仅剩 ${sku.availableStock} 件。`)
        sku.availableStock -= quantity
        sku.reservedStock += quantity
        return
      }
      sku.availableStock += quantity
      sku.reservedStock = Math.max(0, sku.reservedStock - quantity)
    },
    getQualification: tradeQualification,
  })

  return {
    ...trade,
    getMallHome: async () => waitForMock({ categories: mallCategories.filter((category) => category.enabled).map(clone), products: residentProducts(), cartCount: cartItems.filter((item) => item.status === 'normal').reduce((sum, item) => sum + item.quantity, 0) }),
    getResidentProducts: async (query: MallProductQuery = {}) => waitForMock(residentProducts(query)),
    getProductDetail: async (id: string): Promise<MallProductDetail> => {
      const product = findProduct(id)
      const publicProduct = product && publicVersion(product)
      if (!publicProduct || publicProduct.saleStatus !== '销售中') throw new Error('商品暂不可查看，请返回商城刷新。')
      return waitForMock({ ...clone(publicProduct), currentSkuId: toResidentSummary(publicProduct).soldOut ? defaultSku(publicProduct).id : (publicProduct.skus.find((sku) => sku.isMain && isSellableSku(sku)) || publicProduct.skus.find(isSellableSku))!.id, purchaseEligibility: purchaseEligibility(publicProduct) })
    },
    getCart: async (): Promise<CartSummary> => {
      const resolved = cartItems.map((item) => {
        const product = findProduct(item.productId)!
        const sku = findSku(item.productId, item.skuId)!
        const status = product.saleStatus !== '销售中' ? 'off-shelf' : !sku.valid ? 'sku-invalid' : sku.availableStock < item.quantity ? 'stock-insufficient' : item.status
        return { ...clone(item), status, product: clone(product), sku: clone(sku) }
      })
      const normal = resolved.filter((item) => item.status === 'normal')
      const invalidItems = resolved.filter((item) => item.status !== 'normal')
      const groups = normal.reduce<CartSummary['groups']>((result, item) => {
        let group = result.find((entry) => entry.merchantName === item.product.merchantName)
        if (!group) {
          group = { merchantName: item.product.merchantName, storeName: item.product.storeName, fulfillment: item.product.fulfillmentMethods[0], items: [] }
          result.push(group)
        }
        group.items.push(item)
        return result
      }, [])
      return waitForMock({ groups, invalidItems })
    },
    addCart: async (productId: string, skuId?: string, quantity = 1) => {
      const product = findProduct(productId)
      if (!product || product.saleStatus !== '销售中') throw new Error('商品已下架，暂不能加入购物车。')
      const publicProduct = publicVersion(product)
      if (!publicProduct) throw new Error('商品暂不可购买。')
      const eligibility = purchaseEligibility(publicProduct)
      if (!eligibility.allowed) throw new Error(eligibility.reason)
      if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('购买数量必须为正整数。')
      const sku = skuId ? findSku(productId, skuId) : defaultSku(product)
      if (!sku || !sku.valid || sku.availableStock <= 0) throw new Error('当前规格暂无可售库存。')
      const cartQuantity = cartItems.filter((item) => item.productId === productId && item.skuId === sku.id).reduce((total, item) => total + item.quantity, 0)
      if (cartQuantity + quantity > sku.availableStock) throw new Error(`购物车已有 ${cartQuantity} 件，当前库存仅 ${sku.availableStock} 件，请减少数量。`)
      const existing = cartItems.find((item) => item.productId === productId && item.skuId === sku.id && item.status === 'normal')
      if (existing) existing.quantity += quantity
      else cartItems.push({ id: `cart-${Date.now()}`, productId, skuId: sku.id, quantity, selected: true, status: 'normal', latestPrice: sku.price })
      return waitForMock(undefined)
    },
    updateCartQuantity: async (cartId: string, quantity: number) => {
      const item = cartItems.find((entry) => entry.id === cartId)
      if (!item) throw new Error('购物车商品已不存在，请刷新后重试。')
      const sku = findSku(item.productId, item.skuId)
      item.quantity = Math.max(1, Math.min(quantity, sku?.availableStock || 1))
      return waitForMock(undefined)
    },
    toggleCartItem: async (cartId: string, selected: boolean) => {
      const item = cartItems.find((entry) => entry.id === cartId)
      if (item) item.selected = selected
      return waitForMock(undefined)
    },
    removeCartItem: async (cartId: string) => {
      cartItems = cartItems.filter((entry) => entry.id !== cartId)
      return waitForMock(undefined)
    },
    clearInvalidCart: async () => {
      cartItems = cartItems.filter((item) => item.status === 'normal')
      return waitForMock(undefined)
    },
    getMerchantProducts: async () => waitForMock(products.filter((item) => item.operatorId === OPERATOR_ID).map(clone)),
    getMerchantProduct: async (id: string) => {
      const product = findProduct(id)
      if (!product || product.operatorId !== OPERATOR_ID) throw new Error('无权查看该商品。')
      return waitForMock(clone(product))
    },
    getProductBusinessQualification: async () => waitForMock(qualification()),
    saveMerchantProduct: async (payload: ProductEditorPayload) => {
      const mainSku = payload.skus.find((item) => item.isMain) || payload.skus[0]
      if (!mainSku) throw new Error('请至少保留一个销售规格。')
      if (payload.id) {
        const product = findProduct(payload.id)
        if (!product || product.operatorId !== OPERATOR_ID) throw new Error('无权编辑该商品。')
        if (product.auditStatus === '待审核') throw new Error('待审核商品不可编辑，请先撤回审核。')
        Object.assign(product, clone(payload), { auditStatus: product.auditStatus === '已通过' ? '已通过' : '草稿', saleStatus: product.saleStatus === '销售中' ? '销售中' : '未上架' })
        return waitForMock(clone(product))
      }
      const product: MallProduct = { id: `product-draft-${Date.now()}`, projectId: PROJECT_ID, operatorId: OPERATOR_ID, merchantName: '邻里生鲜', storeName: '大光路店', storeAddress: '秦淮区大光路138号邻里集市1楼', ...clone(payload), auditStatus: '草稿', saleStatus: '未上架' }
      products.unshift(product)
      return waitForMock(clone(product))
    },
    submitExistingOrNew: async (payload: ProductEditorPayload) => {
      requireQualification()
      let product = payload.id ? findProduct(payload.id) : undefined
      if (product) {
        if (product.operatorId !== OPERATOR_ID) throw new Error('无权提交该商品。')
        if (product.auditStatus === '待审核') throw new Error('商品正在审核中，请勿重复提交。')
        const publishedSnapshot = product.auditStatus === '已通过' && product.saleStatus === '销售中' ? clone(product) : product.publishedSnapshot
        Object.assign(product, clone(payload), { auditStatus: '待审核', saleStatus: product.saleStatus === '销售中' ? '销售中' : '未上架', rejectionReason: undefined, publishedSnapshot })
      } else {
        product = { id: `product-${Date.now()}`, projectId: PROJECT_ID, operatorId: OPERATOR_ID, merchantName: '邻里生鲜', storeName: '大光路店', storeAddress: '秦淮区大光路138号邻里集市1楼', ...clone(payload), auditStatus: '待审核', saleStatus: '未上架' }
        products.unshift(product)
      }
      return waitForMock(clone(product))
    },
    withdrawMerchantProduct: async (id: string) => {
      const product = findProduct(id)
      if (!product || product.operatorId !== OPERATOR_ID || product.auditStatus !== '待审核') throw new Error('当前商品不可撤回。')
      product.auditStatus = '草稿'
      return waitForMock(undefined)
    },
    changeMerchantSaleStatus: async (id: string, action: 'up' | 'down') => {
      const product = findProduct(id)
      if (!product || product.operatorId !== OPERATOR_ID) throw new Error('无权操作该商品。')
      if (action === 'up') {
        requireQualification()
        if (product.auditStatus !== '已通过') throw new Error('审核通过后才可上架。')
        if (!product.skus.some((item) => item.valid && item.availableStock > 0)) throw new Error('至少一个规格有可售库存后才可上架。')
        product.saleStatus = '销售中'
      } else {
        if (product.saleStatus !== '销售中') throw new Error('当前商品未在销售中。')
        product.saleStatus = '已下架'
      }
      return waitForMock(undefined)
    },
  }
}
