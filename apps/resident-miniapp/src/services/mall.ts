import { appAdapter } from '@/adapters/mock'
import type { CheckoutRequest, CreateTradeInput, CreateTradeOrderInput, MallProductDetail, MallProductQuery, MemberAddress } from '../../../../packages/common/types/mall'

const assertPurchase = (product: MallProductDetail, skuId: string, quantity: number, expectedPrice?: number) => {
  if (!product.purchaseEligibility.allowed) throw new Error(product.purchaseEligibility.reason)
  const sku = product.skus.find((item) => item.id === skuId)
  if (!sku || sku.valid === false || sku.availableStock <= 0) throw new Error('当前规格已售罄或失效，请选择其他规格。')
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('购买数量必须为正整数。')
  if (quantity > sku.availableStock) throw new Error(`当前规格仅剩 ${sku.availableStock} 件，请减少数量。`)
  if (expectedPrice !== undefined && sku.price !== expectedPrice) throw new Error('商品价格已调整，请刷新后确认新价格。')
  return sku
}

const getCartCount = async () => {
  const cart = await appAdapter.getCart()
  return cart.groups.reduce((total, group) => total + group.items.reduce((sum, item) => sum + item.quantity, 0), 0)
}

const getHome = async () => {
  const [catalog, community, cartCount] = await Promise.all([
    appAdapter.getMallHome(), appAdapter.getResidentCommunity(), getCartCount(),
  ])
  return { ...catalog, communityName: community.name, cartCount }
}

const addCart = async (productId: string, skuId?: string, expectedPrice?: number, quantity = 1) => {
  const [product, cart] = await Promise.all([appAdapter.getProductDetail(productId), appAdapter.getCart()])
  const sku = assertPurchase(product, skuId || product.currentSkuId, quantity, expectedPrice)
  const items = [...cart.groups.flatMap((group) => group.items), ...cart.invalidItems]
  const existingQuantity = items.filter((item) => item.productId === productId && item.skuId === sku.id).reduce((sum, item) => sum + item.quantity, 0)
  if (existingQuantity + quantity > sku.availableStock) throw new Error(`购物车已有 ${existingQuantity} 件，当前库存仅 ${sku.availableStock} 件，请先调整购物车数量。`)
  await appAdapter.addCart(productId, sku.id, quantity)
}

/** Resident product flow boundary. Swap only the adapter when real Mall APIs are ready. */
export const residentMallService = {
  getHome,
  getCommunityHome: async () => {
    const [home, catalog] = await Promise.all([appAdapter.getResidentHome(), getHome()])
    const products = catalog.products.filter((product) => !product.soldOut && product.purchaseEligibility.allowed).slice(0, 4).map((product) => {
      const visual = home.products.find((item) => item.id === product.id && (item.homeName || item.name) === product.name)
      return { ...product, homeImage: visual?.homeImage || product.image }
    })
    return { entries: home.entries, services: home.services, communityName: catalog.communityName, products }
  },
  getCartCount,
  getProducts: (query: MallProductQuery = {}) => appAdapter.getResidentProducts(query),
  getDetail: (id: string) => appAdapter.getProductDetail(id),
  prepareBuyNow: async (productId: string, skuId: string, quantity: number, expectedPrice?: number): Promise<CheckoutRequest> => {
    const product = await appAdapter.getProductDetail(productId)
    assertPurchase(product, skuId, quantity, expectedPrice)
    return { productId, skuId, quantity }
  },
  getCart: () => appAdapter.getCart(),
  addCart,
  updateCartQuantity: (cartId: string, quantity: number) => appAdapter.updateCartQuantity(cartId, quantity),
  toggleCartItem: (cartId: string, selected: boolean) => appAdapter.toggleCartItem(cartId, selected),
  removeCartItem: (cartId: string) => appAdapter.removeCartItem(cartId),
  clearInvalidCart: () => appAdapter.clearInvalidCart(),
  getAddresses: () => appAdapter.getAddresses(),
  getAddress: (id: string) => appAdapter.getAddress(id),
  saveAddress: (input: Omit<MemberAddress, 'id'> & { id?: string }) => appAdapter.saveAddress(input),
  deleteAddress: (id: string) => appAdapter.deleteAddress(id),
  setDefaultAddress: (id: string) => appAdapter.setDefaultAddress(id),
  getCheckout: (request: CheckoutRequest) => appAdapter.getCheckoutContext(request),
  createTrade: (input: CreateTradeInput) => appAdapter.createTrade(input),
  getTrade: (id: string) => appAdapter.getTrade(id),
  getTradeForOrder: (id: string) => appAdapter.getTradeForOrder(id),
  payTrade: (id: string, outcome: 'success' | 'failure' | 'unknown') => appAdapter.payTrade(id, outcome),
  queryTradePayment: (id: string) => appAdapter.queryTradePayment(id),
  cancelTrade: (id: string) => appAdapter.cancelTrade(id),
  createOrder: (input: CreateTradeOrderInput) => appAdapter.createTradeOrder(input),
  getOrder: (id: string) => appAdapter.getTradeOrder(id),
  getOrders: () => appAdapter.getResidentOrders(),
  payOrder: (id: string, outcome: 'success' | 'failure' | 'unknown') => appAdapter.payTradeOrder(id, outcome),
  queryPayment: (id: string) => appAdapter.queryTradePay(id),
  cancelOrder: (id: string) => appAdapter.cancelTradeOrder(id),
  confirmReceipt: (id: string) => appAdapter.confirmResidentReceipt(id),
}
