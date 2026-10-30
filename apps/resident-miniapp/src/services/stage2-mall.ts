import { productImageReference, stage2Asset } from './stage2-assets'
import { stage2Request as request, stage2OperationId as operation, stage2Owner, Stage2Error } from '../adapters/stage2-http'
import type { CheckoutRequest, MallProductDetail, MallProductQuery, ResidentMallProductSummary, CartSummary, CartMerchantGroup, MemberAddress, FulfillmentMethod } from '../../../../packages/common/types/mall'
import type { S2Product, S2CartLine, S2Book, S2Address, S2Item, S2Choice, S2Quote, S2Intent, S2Trade, S2Pending, S2Page, S2Region, S2StoreOptions, S2ItemPresentation } from './stage2-types'
import { methodNames } from './stage2-types'

// Selection is UI state only; quantity/version and consumed shares always come from the backend.
let owner = '', book: S2Book | undefined
let lines: S2CartLine[] = []
const selected = new Map<string, string>()
const notices = new Map<string, string>()
const unresolved = new Map<string, { operationId: string; body: Record<string, unknown> }>()
function scope() { const current = stage2Owner(); if (current !== owner) { owner = current; selected.clear(); notices.clear(); unresolved.clear(); lines = []; book = undefined } return current }
function fingerprint(line: S2CartLine) { return `${line.version}:${line.unitPriceCent}:${line.quantity}` }
async function command<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body: Record<string, unknown>): Promise<T> {
  scope(); const key = `${method}:${path}:${JSON.stringify(body)}`
  let original = unresolved.get(key)
  if (!original) { original = { operationId: operation(), body }; unresolved.set(key, original) }
  try { const result = await request<T>(method, path, { ...original.body, operationId: original.operationId }); unresolved.delete(key); return result }
  catch (error) { if (error instanceof Stage2Error && error.status >= 400 && error.status < 500) unresolved.delete(key); throw error }
}
export function productView(raw: S2Product): MallProductDetail {
  const skus = raw.skus.map((sku) => {
    const specValues = Object.fromEntries(sku.specifications.map((part) => [part.name || part.specName || '规格', part.value || part.specValue || '标准规格']))
    return { id: sku.id, name: Object.values(specValues).join(' / ') || '标准规格', image: /^stage1-file:([1-9]\d{0,18})$/.test(sku.image || '') ? productImageReference(raw.id, sku.image!.slice(12)) : '', price: sku.priceCent, code: sku.code, availableStock: sku.quantity, reservedStock: 0, warningStock: 0, valid: raw.available && sku.quantity > 0, specValues }
  })
  return { id: raw.id, storeId: raw.storeId, projectId: '', operatorId: '', merchantName: raw.storeName, storeName: raw.storeName, storeAddress: '', category: raw.categoryName, name: raw.name || '商品当前不可售', sellingPoint: '', mainImage: raw.galleryFileIds[0] ? productImageReference(raw.id, raw.galleryFileIds[0]) : '', gallery: raw.galleryFileIds.map(file => productImageReference(raw.id, file)), detail: raw.detailBlocks.filter((b) => b.type === 'text').map((b) => b.text || '').join('\n'), fulfillmentMethods: raw.methods.map((m) => methodNames[m] as FulfillmentMethod), deliveryNote: '结算时按本店当前条件确认履约与费用', afterSaleNote: '', auditStatus: '已通过', saleStatus: raw.available ? '销售中' : '已下架', skus, currentSkuId: skus[0]?.id || '', purchaseEligibility: { allowed: raw.available, reason: raw.available ? '' : '当前不可购买，请刷新后查看店铺和商品状态。' } }
}
function summary(raw: S2Product): ResidentMallProductSummary {
  const price = Math.min(...raw.skus.map((s) => s.priceCent))
  return { id: raw.id, category: raw.categoryName, categoryId: raw.categoryId, name: raw.name || '商品当前不可售', merchantName: raw.storeName, storeName: raw.storeName, sellingPoint: '', salesCount: 0, purchaseEligibility: { allowed: raw.available, reason: raw.available ? '' : '商品当前不可购买' }, price: Number.isFinite(price) ? price / 100 : 0, fulfillment: methodNames[raw.methods[0]] as FulfillmentMethod, image: raw.galleryFileIds[0] ? productImageReference(raw.id, raw.galleryFileIds[0]) : '', imageTone: '#eef3f2', soldOut: !raw.available, stockTight: false }
}
function addressView(raw: S2Address): MemberAddress { return { ...raw, label: raw.alias || '' } }
async function hydrate(product: MallProductDetail): Promise<MallProductDetail> {
  const image = async (value: string) => { try { return await stage2Asset(value) } catch { return '' } }
  const gallery = await Promise.all(product.gallery.map(image))
  const skus = await Promise.all(product.skus.map(async s => ({ ...s, image: s.image ? await image(s.image) : gallery[0] || '' })))
  return { ...product, gallery: gallery.filter(Boolean), mainImage: gallery[0] || '', skus }
}
export const stage2Mall = {
  async products(query: MallProductQuery = {}, page = 1, pageSize = 20) {
    scope(); const result = await request<S2Page<S2Product>>('GET', '/goods', undefined, { keyword: query.keyword || '', ...(query.categoryId ? {categoryId:query.categoryId} : {}), sort: query.sort === 'price-asc' ? 'PRICE_ASC' : query.sort === 'price-desc' ? 'PRICE_DESC' : 'COMPREHENSIVE', page, pageSize })
    return { ...result, records: result.records.map(summary) }
  },
  async getProducts(query: MallProductQuery = {}) { return (await stage2Mall.products(query)).records },
  async getHome() {
    if (stage2Owner().startsWith('anonymous:')) throw new Stage2Error('AUTH_REQUIRED',403)
    const [categories, products, cart] = await Promise.allSettled([request<Array<{ id: string; name: string; parentId?: string }>>('GET', '/catalog'), stage2Mall.products({}, 1, 20), stage2Mall.getCartCount()])
    for (const result of [categories, products, cart]) if (result.status === 'rejected' && result.reason instanceof Stage2Error && [401,403].includes(result.reason.status)) throw result.reason
    const sectionErrors: Record<string,string> = {}
    if (categories.status === 'rejected') sectionErrors.categories = '分类暂未加载，可重试分类或直接搜索商品。'
    if (products.status === 'rejected') sectionErrors.products = '商品暂未加载，请重试；当前未显示旧推荐。'
    if (cart.status === 'rejected') sectionErrors.cart = '购物车数量暂未核实，可重试或进入购物车查看。'
    return { categories: categories.status === 'fulfilled' ? categories.value.map((c) => ({ ...c, icon: 'bag', enabled: true })) : [], products: products.status === 'fulfilled' ? products.value.records : [], communityName: '大光路智慧社区', cartCount: cart.status === 'fulfilled' ? cart.value : 0, sectionErrors }
  },
  async homeSection(section: 'categories' | 'products' | 'cart') {
    if (section === 'categories') return { categories: (await request<Array<{ id: string; name: string }>>('GET', '/catalog')).map(c => ({...c,icon:'bag',enabled:true})) }
    if (section === 'products') return { products: (await stage2Mall.products({},1,20)).records }
    return { cartCount: await stage2Mall.getCartCount() }
  },
  async getDetail(id: string) { scope(); return hydrate(productView(await request<S2Product>('GET', `/goods/${id}`))) },
  async prepareBuyNow(productId: string, skuId: string, quantity: number, expectedPrice?: number): Promise<CheckoutRequest> {
    const product = await stage2Mall.getDetail(productId), sku = product.skus.find((s) => s.id === skuId)
    if (!product.purchaseEligibility.allowed || !sku?.valid || quantity < 1 || quantity > 99 || quantity > sku.availableStock || (expectedPrice !== undefined && expectedPrice !== sku.price)) throw new Error('商品、数量或价格已变化，请刷新后重新选择。')
    return { productId, skuId, quantity }
  },
  async readCart() {
    scope(); const prior = new Map(lines.map(l => [l.id, l])); const result = await request<{ items: S2CartLine[] }>('GET', '/cart'); lines = result.items
    for(const line of lines) { const old = prior.get(line.id); if(old && old.unitPriceCent !== line.unitPriceCent) notices.set(line.id, '商品价格已更新，请核对当前价格后重新勾选。') }
    for(const id of notices.keys()) if(!lines.some(l => l.id === id)) notices.delete(id)
    for (const [id, version] of selected) { const line = lines.find((l) => l.id === id); if (!line?.available || fingerprint(line) !== version) selected.delete(id) }
    return lines
  },
  async getCartCount() { return (await stage2Mall.readCart()).reduce((n, l) => n + l.quantity, 0) },
  async getCart(): Promise<CartSummary> {
    const current = await stage2Mall.readCart(), groups = new Map<string, CartMerchantGroup>(), invalidItems: CartSummary['invalidItems'] = []
    for (const line of current) {
      const product = line.product ? await hydrate(productView(line.product)) : { ...productView({ id: '', storeId: line.storeId, storeName: '', categoryId: '', categoryName: '', name: '商品已不可用', available: false, reasonCodes: [], methods: [], skus: [], galleryFileIds: [], detailBlocks: [] }) }
      const sku = product.skus.find((s) => s.id === line.skuId) || { id: line.skuId, name: '规格已失效', price: line.unitPriceCent || 0, code: '', availableStock: 0, reservedStock: 0, warningStock: 0, valid: false }
      const adjustable = !line.available && line.reasonCodes.every(reason => reason === 'OUT_OF_STOCK') && sku.availableStock > 0 && sku.availableStock < line.quantity
      const item = { id: line.id, productId: product.id, skuId: line.skuId, quantity: line.quantity, selected: selected.has(line.id), status: line.available ? 'normal' as const : adjustable ? 'stock-insufficient' as const : 'sku-invalid' as const, latestPrice: line.unitPriceCent || 0, invalidReason: line.available ? notices.get(line.id) : adjustable ? `当前仅可购买${sku.availableStock}件，请调整数量后重新勾选。` : '商品、规格或店铺条件已变化，请重新选择有效商品。', product, sku }
      if (!line.available) { invalidItems.push(item); continue }
      if (!groups.has(line.storeId)) groups.set(line.storeId, { storeId: line.storeId, merchantName: product.storeName, storeName: product.storeName, fulfillment: product.fulfillmentMethods[0], items: [] })
      groups.get(line.storeId)!.items.push(item)
    }
    return { groups: [...groups.values()], invalidItems }
  },
  async addCart(productId: string, skuId?: string, expectedPrice?: number, quantity = 1) {
    const prepared = await stage2Mall.prepareBuyNow(productId, skuId || (await stage2Mall.getDetail(productId)).currentSkuId, quantity, expectedPrice)
    await command('POST', '/cart/items', { skuId: prepared.skuId, quantity })
  },
  async updateCartQuantity(id: string, quantity: number) { scope(); const line = lines.find((l) => l.id === id); if (!line) throw new Error('请刷新购物车后再调整。'); await command('PUT', `/cart/items/${id}`, { expectedVersion: line.version, quantity }); selected.delete(id) },
  async toggleCartItem(id: string, value: boolean) { scope(); const line = lines.find((l) => l.id === id); if (!line?.available) throw new Error('该商品当前不可结算。'); if (value) { selected.set(id, fingerprint(line)); notices.delete(id) } else selected.delete(id) },
  async removeCartItem(id: string) { scope(); const line = lines.find((l) => l.id === id); if (!line) throw new Error('请刷新购物车。'); await command('POST', '/cart/remove', { items: [{ id, expectedVersion: line.version }] }); selected.delete(id) },
  invalidRemoval() { scope(); const currentOwner = owner; const items = lines.filter(l => !l.available).map(l => ({ id: l.id, expectedVersion: l.version })); return async () => { if (currentOwner !== stage2Owner()) throw new Error('登录状态已变化，请重新选择。'); if (items.length) await command('POST', '/cart/remove', { items }) } },
  async clearInvalidCart() { scope(); const invalid = lines.filter((l) => !l.available); if (invalid.length) await command('POST', '/cart/remove', { items: invalid.map((l) => ({ id: l.id, expectedVersion: l.version })) }) },
  async book() { scope(); book = await request<S2Book>('GET', '/addresses'); return book },
  async getAddresses() { return (await stage2Mall.book()).records.map(addressView) },
  async getAddress(id: string) { const current = await stage2Mall.book(); const address = current.records.find((a) => a.id === id); if (!address) throw new Error('该地址已变化或不可访问。'); return addressView(address) },
  async saveAddress(input: Omit<MemberAddress, 'id'> & { id?: string; provinceCode?: string; cityCode?: string; districtCode?: string; version?: number; addressBookVersion?: number }) {
    scope(); if (!book) throw new Error('请先加载当前地址簿。')
    book = await command<S2Book>(input.id ? 'PUT' : 'POST', input.id ? `/addresses/${input.id}` : '/addresses', { ...(input.id ? { expectedVersion: input.version } : {}), addressBookVersion: input.addressBookVersion ?? book.version, name: input.name, mobile: input.mobile, provinceCode: input.provinceCode, cityCode: input.cityCode, districtCode: input.districtCode, detail: input.detail, alias: input.label, isDefault: input.isDefault })
  },
  addressRemoval(id: string) { scope(); const row = book?.records.find((a) => a.id === id); if (!row || !book) throw new Error('请先刷新地址簿。'); const currentOwner = owner, expectedVersion = row.version, addressBookVersion = book.version; return async () => { if (currentOwner !== stage2Owner()) throw new Error('登录状态已变化，请重新选择。'); book = await command<S2Book>('DELETE', `/addresses/${id}`, { expectedVersion, addressBookVersion }) } },
  async deleteAddress(id: string) { await stage2Mall.addressRemoval(id)() },
  async setDefaultAddress(id: string) { scope(); const row = book?.records.find((a) => a.id === id); if (!row || !book) throw new Error('请先刷新地址簿。'); book = await command<S2Book>('POST', `/addresses/${id}/default`, { expectedVersion: row.version, addressBookVersion: book.version }) },
  async clearDefault() { scope(); if (!book) throw new Error('请先刷新地址簿。'); book = await command<S2Book>('POST', '/addresses/default/clear', { addressBookVersion: book.version }) },
  regions: (parentId?: string) => request<S2Region[]>('GET', '/regions', undefined, parentId ? {parentId} : {}),
  async checkoutItems(input: CheckoutRequest): Promise<S2Item[]> {
    if (input.cartIds?.length) { const current = await stage2Mall.readCart(); return input.cartIds.map((id) => { const line = current.find((l) => l.id === id); if (!line?.available || selected.get(id) !== fingerprint(line)) throw new Error('购物车内容已变化，请返回购物车重新选择。'); return { skuId: line.skuId, quantity: line.quantity, cartId: line.id, expectedVersion: line.version } }) }
    if (!input.skuId || !input.quantity) throw new Error('请先选择商品与规格。')
    return [{ skuId: input.skuId, quantity: input.quantity }]
  },
  async detailBlocks(id: string) { const raw=await request<S2Product>('GET','/goods/'+id);return Promise.all(raw.detailBlocks.map(async b=>b.type==='text'?{type:'text',text:b.text||'',image:'',failed:false}:{type:'image',text:'',image:await stage2Asset(productImageReference(id,b.fileId||'')).catch(()=>''),failed:false})); },
  async checkoutPresentation(input: CheckoutRequest, items: S2Item[]): Promise<S2ItemPresentation[]> {
    scope();const products = input.cartIds?.length ? lines.filter(l=>input.cartIds!.includes(l.id)).map(l=>l.product).filter((p):p is S2Product=>Boolean(p)) : input.productId ? [await request<S2Product>('GET', '/goods/'+input.productId)] : [];
    return items.map(item=>{const product=products.find(p=>p.skus.some(s=>s.id===item.skuId));const sku=product?.skus.find(s=>s.id===item.skuId);return {skuId:item.skuId,storeId:product?.storeId||'',name:product?.name||'商品名称未核实',quantity:item.quantity,unitPriceCent:sku?.priceCent??null,specifications:JSON.stringify(sku?.specifications||[])};});
  },
  options: (items: S2Item[], addresses: Array<{ storeId: string; addressId: string; addressVersion: number }> = []) => request<{ stores: S2StoreOptions[] }>('POST', '/checkout/options', { items, addresses }),
  quote: (items: S2Item[], stores: S2Choice[]) => request<S2Quote>('POST', '/checkout/quotes', { items, stores }),
  create: (body: { intentId: string; quoteId: string; confirmationHash: string }) => request<S2Intent>('POST', '/checkout/intents', body),
  intent: (id: string) => request<S2Intent>('GET', `/checkout/intents/${id}`),
  summary: (id: string) => request<S2Trade>('GET', `/trades/${id}/summary`),
  prepare: (id: string) => command<{ trade: S2Trade; launchReady: boolean }>('POST', `/trades/${id}/payment/prepare`, {}),
  launch: (id: string) => command<{ trade: S2Trade; launchReady: boolean }>('POST', `/trades/${id}/payment/launch`, {}),
  refresh: (id: string) => request<{ trade: S2Trade; launchReady: boolean }>('POST', `/trades/${id}/payment/refresh`),
  cancel: (id: string) => command<{ trade: S2Trade; launchReady: boolean }>('POST', `/trades/${id}/cancel`, {}),
  pending: (page = 1) => request<S2Page<S2Pending>>('GET', '/pending-transactions', undefined, { page, pageSize: 20 }),
}
