<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppButton from '@/components/AppButton.vue'
import AppIcon from '@/components/AppIcon.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppPage from '@/components/AppPage.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import FormField from '@/components/FormField.vue'
import FormSection from '@/components/FormSection.vue'
import StatusTag from '@/components/StatusTag.vue'
import SkuEditor from '@/features/supply/SkuEditor.vue'
import SupplyDemoPanel from '@/features/supply/SupplyDemoPanel.vue'
import { usePageResource } from '@/composables/usePageResource'
import { merchantProductService } from '@/services/product'
import { openSubPage } from '@/utils/navigation'
import { auditLabel, goodsStock, needsNewAudit, validateGoods } from '@/features/supply/rules'
import type { FieldErrors, SupplyGoods, SupplyQualification } from '@/features/supply/types'
import type { FulfillmentMethod } from '@/types/mall'

const productId = ref('')
const intent = ref('')
const isSaving = ref(false)
const form = ref<SupplyGoods | null>(null)
const original = ref<SupplyGoods | null>(null)
const qualification = ref<SupplyQualification | null>(null)
const categories = ref<{ id:string; name:string }[]>([])
const errors = ref<FieldErrors>({})
const actionMessage = ref('')
const actionFailed = ref(false)
const { status, errorMessage, load, refresh } = usePageResource(async () => {
  const [context, categoryList, goods] = await Promise.all([
    merchantProductService.getQualification(), merchantProductService.getCategories(),
    productId.value ? merchantProductService.getProduct(productId.value) : merchantProductService.newProduct(),
  ])
  qualification.value = context
  categories.value = categoryList
  form.value = goods
  original.value = JSON.parse(JSON.stringify(goods))
  return goods
})
const isPending = computed(() => form.value?.auditStatus === 'TOBEAUDITED')
const readonly = computed(() => isPending.value || !qualification.value?.baseBusinessReady)
const criticalChanged = computed(() => Boolean(original.value && form.value && original.value.auditStatus === 'PASS' && needsNewAudit(original.value, form.value)))
const passed = computed(() => form.value?.auditStatus === 'PASS' && !criticalChanged.value)
const title = computed(() => isPending.value ? '商品审核详情' : !productId.value ? '新增商品' : intent.value === 'stock' ? '编辑 SKU 与库存' : '编辑商品')
const primaryLabel = computed(() => passed.value ? form.value?.marketEnable === 'UPPER' ? '下架' : '上架' : form.value?.auditStatus === 'REFUSE' ? '重新提交审核' : '提交审核')
const canPrimary = computed(() => !readonly.value && (!passed.value || form.value?.marketEnable === 'UPPER' || (qualification.value?.tradeReady && !form.value?.forceOffShelf && goodsStock(form.value!) > 0)))
const categoryIndex = computed(() => Math.max(0, categories.value.findIndex(category => category.id === form.value?.categoryId)))
const saveLabel = computed(() => form.value?.auditStatus === 'REFUSE' ? '保存修改' : passed.value ? '保存修改' : '保存草稿')
const methods: FulfillmentMethod[] = ['商户配送','社区自提','到店核销']
const back = () => uni.navigateBack()
const goSku = async () => {
  await nextTick()
  let navbarHeight = 56
  // #ifdef MP-WEIXIN
  const statusHeight = uni.getWindowInfo().statusBarHeight || 0
  const menu = uni.getMenuButtonBoundingClientRect()
  navbarHeight = menu.width > 0 && menu.top >= statusHeight
    ? statusHeight + Math.max(44, menu.height + (menu.top - statusHeight) * 2)
    : statusHeight + 48 + 56
  // #endif
  uni.createSelectorQuery().select('#sku-section').boundingClientRect().selectViewport().scrollOffset(() => {}).exec(results => {
    const section = results[0]
    const viewport = results[1]
    if (section && viewport) uni.pageScrollTo({ scrollTop:Math.max(0, section.top + viewport.scrollTop - navbarHeight - 12), duration:200 })
  })
}
const chooseImages = () => {
  if (readonly.value || !form.value) return
  const remaining = 4 - form.value.goodsGallery.length
  if (remaining <= 0) { actionMessage.value = '最多4张图片，请先移除不需要的图片'; actionFailed.value = true; return }
  uni.chooseImage({ count:remaining, sizeType:['compressed'], success: result => {
    form.value!.goodsGallery = [...new Set([...form.value!.goodsGallery, ...result.tempFilePaths])].slice(0, 4)
    if (!form.value!.goodsImage) form.value!.goodsImage = form.value!.goodsGallery[0]
  } })
}
const removeImage = (index: number) => {
  if (readonly.value || !form.value) return
  const removed = form.value.goodsGallery.splice(index, 1)[0]
  if (form.value.goodsImage === removed) form.value.goodsImage = form.value.goodsGallery[0] || ''
}
const setMainImage = (image: string) => { if (!readonly.value && form.value) form.value.goodsImage = image }
const toggleFulfillment = (method: FulfillmentMethod) => {
  if (readonly.value || !form.value) return
  form.value.deliveryMethods = form.value.deliveryMethods.includes(method) ? form.value.deliveryMethods.filter(value => value !== method) : [...form.value.deliveryMethods, method]
}
const setSaved = (result: SupplyGoods) => {
  form.value = result
  productId.value = result.id!
  original.value = JSON.parse(JSON.stringify(result))
  errors.value = {}
}
const persist = async (submit: boolean, action?: 'up' | 'down') => {
  if (!form.value || isSaving.value || readonly.value) return
  errors.value = validateGoods(form.value, submit || action === 'up')
  actionMessage.value = ''
  actionFailed.value = false
  if (Object.keys(errors.value).length) { actionMessage.value = '请修正标记的字段后继续'; actionFailed.value = true; if (Object.keys(errors.value).some(key => key.startsWith('sku'))) goSku(); return }
  isSaving.value = true
  try {
    const neededAudit = criticalChanged.value
    const result = submit ? await merchantProductService.submit(form.value) : await merchantProductService.save(form.value)
    setSaved(result)
    if (action) setSaved(await merchantProductService.changeSaleStatus(result.id!, action))
    actionMessage.value = submit ? '已提交平台审核，商品保持下架' : action ? action === 'up' ? '商品已上架' : '商品已下架' : neededAudit ? '修改已保存并下架，请重新提交审核' : '修改已保存'
    uni.showToast({ title:submit ? '已提交审核' : action ? action === 'up' ? '已上架' : '已下架' : '已保存', icon:'success' })
  } catch (error) { actionMessage.value = error instanceof Error ? error.message : '保存失败，请重试'; actionFailed.value = true }
  finally { isSaving.value = false }
}
const primary = () => passed.value ? persist(false, form.value?.marketEnable === 'UPPER' ? 'down' : 'up') : persist(true)
const refreshDemo = async () => { actionMessage.value = ''; await refresh() }
onLoad(async options => {
  productId.value = typeof options?.id === 'string' ? options.id : ''
  intent.value = typeof options?.intent === 'string' ? options.intent : ''
  await load()
  if (intent.value === 'stock' && form.value) goSku()
})
onShow(() => {
  if (!form.value) return
  merchantProductService.getQualification().then(value => { qualification.value = value }).catch(error => { actionMessage.value = error instanceof Error ? error.message : '经营资格刷新失败，请重试'; actionFailed.value = true })
})
</script>

<template>
  <AppPage :status="status" :state-message="errorMessage" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar :title="title" centered show-back /></template>
    <view v-if="form && qualification" class="stack editor-page">
      <view class="editor-state"><StatusTag :tone="form.draft ? 'disabled' : form.auditStatus === 'PASS' ? 'success' : form.auditStatus === 'REFUSE' ? 'error' : 'pending'">{{ auditLabel(form) }}</StatusTag><text>{{ form.marketEnable === 'UPPER' ? '销售中' : '已下架 / 未上架' }}</text><view class="sku-link" @click="goSku">编辑 SKU 与库存 ›</view></view>
      <view v-if="form.authMessage" class="notice notice--error"><text>{{ form.forceOffShelf ? '平台强制下架' : '审核驳回原因' }}</text><text>{{ form.authMessage }}</text></view>
      <view v-if="isPending" class="notice"><text>平台审核中，商品关键资料只读，不允许直接上架。</text></view>
      <view v-if="criticalChanged" class="notice"><text>关键资料已修改，保存后将下架并进入草稿；重新审核通过后才能上架。</text></view>
      <view v-if="!qualification.tradeReady" class="notice"><text>{{ qualification.baseBusinessReady ? '可维护商品及提交审核，暂不可正式上架' : '经营基础资格待完善，商品资料只读' }}</text><text>{{ qualification.tradeReasons.join('；') }}</text><view class="reason-link" @click="openSubPage('/pages/qualification/status/index')">查看经营资格 ›</view></view>
      <view v-if="actionMessage" class="notice" :class="{ 'notice--error':actionFailed, 'notice--success':!actionFailed }"><text>{{ actionMessage }}</text></view>

      <FormSection title="商品基本信息" description="普通实物商品；带 * 的字段为提交审核必填项">
        <FormField label="商品类目" required :error="errors.categoryId" :readonly="readonly"><picker :range="categories" range-key="name" :value="categoryIndex" :disabled="readonly" @change="form.categoryId = categories[Number($event.detail.value)].id"><view class="picker-row"><text>{{ categories[categoryIndex]?.name }}</text><text>{{ readonly ? '只读' : '更换 ›' }}</text></view></picker></FormField>
        <FormField label="商品名称" required :error="errors.goodsName" :readonly="readonly"><input v-model="form.goodsName" maxlength="60" :disabled="readonly" placeholder="请输入商品名称" aria-label="商品名称" /></FormField>
        <FormField label="商品卖点" required :error="errors.sellingPoint" :readonly="readonly"><textarea v-model="form.sellingPoint" maxlength="120" auto-height :disabled="readonly" placeholder="展示于商品列表的简要卖点" aria-label="商品卖点" /></FormField>
        <FormField label="主图 / 轮播图" required hint="最多4张，点击图片设为主图" :error="errors.goodsImage">
          <view class="image-row"><view v-for="(image, index) in form.goodsGallery" :key="image" class="image-tile" @click="setMainImage(image)"><image :src="image" mode="aspectFill" /><text>{{ image === form.goodsImage ? '主图' : '设为主图' }}</text><view v-if="!readonly" class="image-remove" :aria-label="'移除商品图片 ' + (index + 1)" @click.stop="removeImage(index)">×</view></view><view v-if="!readonly && form.goodsGallery.length < 4" class="image-add" @click="chooseImages"><AppIcon name="plus" :size="22" /><text>添加图片</text></view><text v-if="!form.goodsGallery.length && readonly">暂无图片</text></view>
        </FormField>
        <FormField label="商品单位" required :error="errors.unit" :readonly="readonly"><input v-model="form.unit" maxlength="12" :disabled="readonly" placeholder="如：份、盒、袋" aria-label="商品单位" /></FormField>
        <FormField label="商品详情" required :error="errors.detail" :readonly="readonly"><textarea v-model="form.detail" maxlength="3000" auto-height :disabled="readonly" placeholder="商品介绍、规格说明与保存建议" aria-label="商品详情" /></FormField>
      </FormSection>

      <view id="sku-section"><FormSection title="SKU 与库存" description="规格组合、编码、价格、成本、库存及重量"><SkuEditor v-model="form.skuList" :readonly="readonly" :errors="errors" /></FormSection></view>

      <FormSection title="支持的履约方式" description="按该商品实际支持的方式选择">
        <text v-if="errors.deliveryMethods" class="field-error">{{ errors.deliveryMethods }}</text>
        <view v-for="method in methods" :key="method" class="fulfillment-row" :aria-disabled="readonly" @click="toggleFulfillment(method)"><text class="checkbox" :class="{ checked:form.deliveryMethods.includes(method) }">{{ form.deliveryMethods.includes(method) ? '✓' : '' }}</text><text>{{ method }}</text></view>
        <FormField label="配送 / 自提说明" :readonly="readonly"><textarea v-model="form.deliveryNote" maxlength="300" auto-height :disabled="readonly" aria-label="配送自提说明" /></FormField>
        <FormField label="售后说明" :readonly="readonly"><textarea v-model="form.afterSaleNote" maxlength="500" auto-height :disabled="readonly" aria-label="售后说明" /></FormField>
      </FormSection>
      <FormSection title="所属店铺" description="系统关联，不在商品编辑中修改"><view class="context-row"><text>店铺</text><text>{{ qualification.storeName }}</text></view><view class="context-row"><text>经营基础资格</text><StatusTag :tone="qualification.baseBusinessReady ? 'success' : 'error'">{{ qualification.baseBusinessReady ? 'READY' : '待完善' }}</StatusTag></view><view class="context-row"><text>正式交易资格</text><StatusTag :tone="qualification.tradeReady ? 'success' : 'pending'">{{ qualification.tradeReady ? 'READY' : '待完善' }}</StatusTag></view></FormSection>
      <SupplyDemoPanel v-if="isPending && form.id" mode="goods" :goods-id="form.id" @changed="refreshDemo" />
    </view>
    <BottomActionBar v-if="form && qualification">
      <template v-if="readonly"><AppButton variant="secondary" @click="back">返回</AppButton><AppButton variant="quiet" @click="openSubPage('/pages/qualification/status/index')">查看经营资格</AppButton></template>
      <template v-else><AppButton variant="secondary" :loading="isSaving" @click="persist(false)">{{ saveLabel }}</AppButton><AppButton :loading="isSaving" :disabled="!canPrimary" @click="primary">{{ primaryLabel }}</AppButton></template>
    </BottomActionBar>
  </AppPage>
</template>

<style scoped lang="scss">
.editor-page { gap:$space-3; }
.editor-state { display:flex; flex-wrap:wrap; align-items:center; gap:$space-2; font-size:13px; color:$color-text-secondary; }
.sku-link { display:flex; min-height:44px; align-items:center; margin-left:auto; color:$color-primary; font-size:14px; }
.notice { padding:$space-3; border:1px solid rgba(199,106,34,.22); border-radius:$radius-md; background:$color-warning-light; color:$color-warning; font-size:14px; line-height:22px; }
.notice text { display:block; }
.notice--error { border-color:rgba(186,26,26,.2); background:$color-error-light; color:$color-error; }
.notice--success { border-color:rgba(46,114,86,.2); background:$color-success-light; color:$color-success; }
.reason-link { display:flex; min-height:44px; align-items:center; color:$color-primary; }
.picker-row { display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:$space-2; }
.picker-row text:last-child { color:$color-primary; }
.image-row { display:flex; flex-wrap:wrap; gap:$space-2; padding:$space-3 0; }
.image-tile,.image-add { position:relative; display:flex; width:84px; height:96px; align-items:center; justify-content:center; flex-direction:column; gap:$space-1; overflow:hidden; border-radius:$radius-md; background:$color-card-bg; }
.image-tile image { width:100%; height:100%; }
.image-tile > text { position:absolute; right:0; bottom:0; left:0; padding:4px; background:rgba(0,0,0,.54); color:#fff; text-align:center; font-size:12px; }
.image-remove { position:absolute; top:0; right:0; display:flex; width:44px; height:44px; align-items:center; justify-content:center; color:#fff; background:rgba(0,0,0,.4); font-size:22px; }
.image-add { border:1px dashed $color-border; color:$color-primary; font-size:13px; }
.fulfillment-row { display:flex; min-height:56px; align-items:center; gap:$space-3; border-bottom:1px solid $color-border; font-size:15px; }
.checkbox { display:flex; width:22px; height:22px; align-items:center; justify-content:center; border:1px solid $color-border; border-radius:$radius-sm; color:#fff; font-size:13px; }
.checked { border-color:$color-primary; background:$color-primary; }
.field-error { color:$color-error; font-size:13px; }
.context-row { display:flex; min-height:48px; align-items:center; justify-content:space-between; gap:$space-3; font-size:14px; }
.context-row text:first-child { color:$color-text-secondary; flex:none; }
.context-row text:last-child { text-align:right; }
</style>
