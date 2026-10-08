import type { FieldErrors, StoreApplication, SupplyGoods } from './types'

export function validateApplication(form: StoreApplication, step?: number): FieldErrors {
  const errors: FieldErrors = {}
  const check = (part: number) => step === undefined || step === part
  if (check(1)) {
    if (!form.subjectName.trim()) errors.subjectName = '请填写与营业执照一致的主体名称'
    if (!/^[0-9A-Z]{18}$/.test(form.licenseNumber)) errors.licenseNumber = '请输入18位营业执照号 / 统一社会信用代码'
    if (!form.licenseImages.length) errors.licenseImages = '请上传清晰的营业执照'
    if (!form.legalScope.trim()) errors.legalScope = '请填写证照上的法定经营范围'
    if (!form.legalName.trim()) errors.legalName = '请填写法人 / 经营者姓名'
    if (!form.legalId.trim()) errors.legalId = '请填写法人 / 经营者证件信息'
    if (!form.legalIdImages.length) errors.legalIdImages = '请补充必要的证件附件'
  }
  if (check(2)) {
    if (!form.contactName.trim()) errors.contactName = '请填写联系人姓名'
    if (!/^1\d{10}$/.test(form.mobile)) errors.mobile = '请输入11位联系手机号'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = '请输入有效邮箱，或留空'
  }
  if (check(3)) {
    if (!form.storeName.trim()) errors.storeName = '请填写店铺名称'
    if (!form.storeLogo.length) errors.storeLogo = '请上传店铺 Logo'
    if (!form.description.trim()) errors.description = '请填写店铺简介'
    if (!form.storeAddress.trim()) errors.storeAddress = '请填写店铺详细地址'
    if (!form.categoryIds.length) errors.categoryIds = '请至少选择一个经营类目'
    if (!/^[0-9\-+() ]{7,20}$/.test(form.storePhone)) errors.storePhone = '请填写店铺联系电话'
    if (!form.longitude.trim() || !Number.isFinite(Number(form.longitude)) || Math.abs(Number(form.longitude)) > 180) errors.longitude = '请填写 -180 至 180 的经度'
    if (!form.latitude.trim() || !Number.isFinite(Number(form.latitude)) || Math.abs(Number(form.latitude)) > 90) errors.latitude = '请填写 -90 至 90 的纬度'
  }
  if (check(4) && form.categoryIds.some(id => id === 'category-fresh' || id === 'category-food') && !form.qualificationImages.length) {
    errors.qualificationImages = '食品相关类目请补充平台要求的经营资质'
  }
  return errors
}

export function validateGoods(form: SupplyGoods, strict = true): FieldErrors {
  const errors: FieldErrors = {}
  if (strict) {
    if (!form.goodsName.trim()) errors.goodsName = '请填写商品名称'
    if (!form.categoryId) errors.categoryId = '请选择商品类目'
    if (!form.sellingPoint.trim()) errors.sellingPoint = '请填写商品卖点'
    if (!form.goodsImage || !form.goodsGallery.includes(form.goodsImage)) errors.goodsImage = '请设置商品主图'
    if (!form.unit.trim()) errors.unit = '请填写商品单位'
    if (!form.detail.trim()) errors.detail = '请补充商品详情'
    if (!form.deliveryMethods.length) errors.deliveryMethods = '请至少选择一种履约方式'
  }
  if (form.goodsGallery.length > 4) errors.goodsImage = '商品图片最多4张'
  if (form.deliveryMethods.some(method => !['商户配送', '社区自提', '到店核销'].includes(method))) errors.deliveryMethods = '请选择本期支持的履约方式'
  if (!form.skuList.length) errors.skuList = '至少保留一个 SKU'
  if (form.skuList.filter(sku => sku.isMain).length !== 1) errors.skuList = '请选择一个主规格'
  const codes = new Set<string>()
  const combinations = new Set<string>()
  const firstKeys = Object.keys(form.skuList[0]?.specs || {}).sort().join('|')
  form.skuList.forEach((sku, index) => {
    const key = 'sku.' + index + '.'
    const names = Object.keys(sku.specs).sort()
    const combination = JSON.stringify(names.map(name => [name.trim(), sku.specs[name].trim()]))
    if (strict && (!names.length || names.some(name => !name.trim() || !sku.specs[name].trim()))) errors[key + 'specs'] = '请完善规格属性和属性值'
    if (names.join('|') !== firstKeys) errors[key + 'specs'] = '每个 SKU 须使用相同的规格属性'
    if (combinations.has(combination)) errors[key + 'specs'] = '规格组合不能重复'
    combinations.add(combination)
    if (strict && !sku.sn.trim()) errors[key + 'sn'] = '请填写 SKU 编码'
    if (sku.sn.trim() && codes.has(sku.sn.trim())) errors[key + 'sn'] = 'SKU 编码不能重复'
    codes.add(sku.sn.trim())
    if (!Number.isSafeInteger(sku.price) || sku.price < 0 || (strict && sku.price === 0)) errors[key + 'price'] = '销售价须大于0，最多两位小数'
    if (!Number.isSafeInteger(sku.cost) || sku.cost < 0) errors[key + 'cost'] = '成本价须为非负金额，最多两位小数'
    if (!Number.isSafeInteger(sku.quantity) || sku.quantity < 0) errors[key + 'quantity'] = '库存须为非负整数'
    if (!Number.isFinite(sku.weight) || sku.weight < 0 || (strict && sku.weight === 0)) errors[key + 'weight'] = '重量须大于0，以 kg 为单位'
  })
  return errors
}

export const auditLabel = (goods: SupplyGoods) => goods.draft ? '草稿' : ({ TOBEAUDITED: '待审核', PASS: '已通过', REFUSE: '已驳回' }[goods.auditStatus || 'TOBEAUDITED'])
export const goodsStock = (goods: SupplyGoods) => goods.skuList.reduce((sum, sku) => sum + sku.quantity, 0)
export const specLabel = (specs: Record<string, string>) => Object.values(specs).join(' / ')

export function needsNewAudit(before: SupplyGoods, after: SupplyGoods): boolean {
  const critical = (goods: SupplyGoods) => ({
    goodsName: goods.goodsName, categoryId: goods.categoryId, sellingPoint: goods.sellingPoint,
    goodsImage: goods.goodsImage, goodsGallery: goods.goodsGallery, detail: goods.detail,
    unit: goods.unit, deliveryMethods: goods.deliveryMethods, deliveryNote: goods.deliveryNote, afterSaleNote: goods.afterSaleNote,
    skuList: goods.skuList.map(({ quantity, ...sku }) => sku),
  })
  return JSON.stringify(critical(before)) !== JSON.stringify(critical(after))
}
