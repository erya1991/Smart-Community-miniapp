import type { MallProduct, MallProductQuery, MallProductSort, ProductSku, ResidentMallProductSummary } from '../types/mall'

export const isMallProductSort = (value: string): value is MallProductSort => ['default', 'sales', 'price-asc', 'price-desc'].includes(value)
export const isSellableSku = (sku: ProductSku) => sku.valid !== false && sku.availableStock > 0

export function selectMallProducts(products: ResidentMallProductSummary[], query: MallProductQuery = {}) {
  const keyword = query.keyword?.trim().toLocaleLowerCase() || ''
  const items = products.filter((product) =>
    (!query.categoryId || product.categoryId === query.categoryId) &&
    (!keyword || `${product.name} ${product.merchantName} ${product.storeName} ${product.sellingPoint}`.toLocaleLowerCase().includes(keyword)),
  )
  if (query.sort === 'sales') return items.sort((a, b) => b.salesCount - a.salesCount)
  if (query.sort === 'price-asc') return items.sort((a, b) => a.price - b.price)
  if (query.sort === 'price-desc') return items.sort((a, b) => b.price - a.price)
  return items
}

/** Older merchant products have named SKU combinations without separate attributes. */
export const getSpecificationGroups = (product: MallProduct) => product.specifications?.length
  ? product.specifications
  : [{ name: '规格', values: Array.from(new Set(product.skus.map((sku) => sku.name))) }]

export const getSkuSpecValues = (product: MallProduct, sku: ProductSku) => product.specifications?.length
  ? sku.specValues || {}
  : { 规格: sku.name }

export function findSelectedSku(product: MallProduct, values: Record<string, string>) {
  const groups = getSpecificationGroups(product)
  if (groups.some((group) => !values[group.name])) return undefined
  return product.skus.find((sku) => groups.every((group) => getSkuSpecValues(product, sku)[group.name] === values[group.name]))
}

export function isSpecValueAvailable(product: MallProduct, selected: Record<string, string>, name: string, value: string) {
  const candidate = { ...selected, [name]: value }
  return product.skus.some((sku) => isSellableSku(sku) && Object.entries(candidate).every(([key, item]) => !item || getSkuSpecValues(product, sku)[key] === item))
}

export function getSkuSelectionIssue(product: MallProduct, selected: Record<string, string>, quantity: number) {
  const missing = getSpecificationGroups(product).filter((group) => !selected[group.name]).map((group) => group.name)
  if (missing.length) return `请选择${missing.join('、')}`
  const sku = findSelectedSku(product, selected)
  if (!sku) return '该规格组合不存在，请重新选择。'
  if (!isSellableSku(sku)) return '该规格已售罄或失效，请选择其他规格。'
  if (!Number.isSafeInteger(quantity) || quantity < 1) return '购买数量必须为正整数。'
  if (quantity > sku.availableStock) return `当前规格仅剩 ${sku.availableStock} 件，请减少数量。`
  return ''
}
