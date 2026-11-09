<script setup lang="ts">
import {accessRequired} from '../../../../../packages/common/utils/commercePresentation'
import { computed, ref, watch } from 'vue'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import S2OrderSummary from './S2OrderSummary.vue'
import {shanghaiTime} from '../../../../../packages/common/utils/commercePresentation'
import Stage2Notice from './Stage2Notice.vue'
import { stage2Mall } from '../../services/stage2-mall'
import { stage2Owner, stage2OperationId } from '../../adapters/stage2-http'
import { methodNames, openingText, specificationText } from '../../services/stage2-types'
import type { S2Item, S2Choice, S2Quote, S2Book, S2StoreOptions, S2ItemPresentation } from '../../services/stage2-types'
import type { CheckoutRequest } from '../../../../../packages/common/types/mall'
const props = defineProps<{ options: Record<string, string | undefined> | null }>()
const owner = stage2Owner()
const status = ref<'loading' | 'ready' | 'error'>('loading'), error = ref(''), busy = ref(false)
const items = ref<S2Item[]>([]), stores = ref<S2StoreOptions[]>([]), choices = ref<S2Choice[]>([]), book = ref<S2Book>(), quote = ref<S2Quote>()
const preview = ref<S2ItemPresentation[]>([])
const applySource = ref(-1), applyTargets = ref<string[]>([])
const submitted = ref(false), original = ref<{ intentId: string; quoteId: string; confirmationHash: string }>()
const resendAvailable = ref(false)
let draftKey = '', sequence = 0, addressSequence = 0
const money = (n: number) => (n / 100).toFixed(2)
const delivery = (choice: S2Choice) => ['MERCHANT_DELIVERY', 'EXPRESS'].includes(choice.method)
const active = () => { if (owner !== stage2Owner()) throw new Error('登录身份已变化，请重新进入本人结算。') }
const manageAddresses = () => uni.navigateTo({url:'/pages/member/address/index'})
const dirty = () => { if (!submitted.value) quote.value = undefined }
const methodAvailable = (choice: S2Choice) => stores.value.find(s => s.storeId === choice.storeId)?.precheck.commonMethods.includes(choice.method) === true
const allComplete = computed(() => choices.value.length > 0 && choices.value.every((c) => !c.addressIssue && methodAvailable(c) && c.contact.name.trim().length >= 1 && c.contact.name.trim().length <= 30 && /^1\d{10}$/.test(c.contact.mobile) && (delivery(c) ? Boolean(c.addressId) : Boolean(c.pointId))))
async function load() {
  if (!props.options) return
  const current = ++sequence; status.value = 'loading'; error.value = ''
  try {
    active(); const options = props.options
    const input: CheckoutRequest = options.cartIds ? { cartIds: decodeURIComponent(options.cartIds).split(',').filter(Boolean) } : { productId: options.productId, skuId: options.skuId, quantity: Number(options.quantity || 1) }
    draftKey = `daguanglu:s2:intent:${import.meta.env.VITE_RESIDENT_API_BASE_URL}:${owner.split(':')[0]}:${JSON.stringify(input)}`
    const saved = uni.getStorageSync(draftKey)
    if (saved && typeof saved.intentId === 'string' && typeof saved.quoteId === 'string' && typeof saved.confirmationHash === 'string') { original.value = saved; submitted.value = true; status.value = 'ready'; await recover(); return }
    original.value = undefined; submitted.value = false; resendAvailable.value = false
    const selected = await stage2Mall.checkoutItems(input)
    const [optionsResult, addresses, presentation] = await Promise.all([stage2Mall.options(selected), stage2Mall.book(), stage2Mall.checkoutPresentation(input, selected)]); active(); if (current !== sequence) return
    preview.value = presentation; items.value = selected; stores.value = optionsResult.stores; book.value = addresses
    choices.value = stores.value.map((s) => ({ storeId: s.storeId, method: s.precheck.commonMethods[0], addressId: addresses.defaultAddressId || undefined, addressVersion: addresses.records.find((a) => a.id === addresses.defaultAddressId)?.version, contact: { name: '', mobile: '' }, remark: '' }))
    quote.value = undefined; await validateAddresses(); status.value = 'ready'
  } catch (e) { if (current === sequence) { error.value = e instanceof Error ? e.message : '加载失败，请重试'; status.value = 'error' } }
}
async function chooseMethod(index: number, event: { detail: { value: string | number } }) { const c = choices.value[index], methods = stores.value[index].precheck.commonMethods; c.method = methods[Number(event.detail.value)]; c.pointId = undefined; c.addressIssue = ''; dirty(); await validateAddresses() }
async function chooseAddress(index: number, event: { detail: { value: string | number } }) { const c = choices.value[index], a = book.value?.records[Number(event.detail.value)]; if (a) { c.addressId = a.id; c.addressVersion = a.version; if (!c.contact.name && !c.contact.mobile) c.contact = { name: a.name, mobile: a.mobile } } dirty(); await validateAddresses() }
async function validateAddresses() { const current = ++addressSequence, scope = stage2Owner(); try { const selected = choices.value.filter(c => delivery(c) && c.addressId && c.addressVersion !== undefined).map(c => ({ storeId: c.storeId, addressId: c.addressId!, addressVersion: c.addressVersion! })); const result = await stage2Mall.options(items.value, selected); if (current !== addressSequence || scope !== stage2Owner()) return; for(const c of choices.value){ const state = result.stores.find(s => s.storeId === c.storeId); c.addressIssue = delivery(c) && c.addressId && state && !state.precheck.commonMethods.includes(c.method) ? '该地址当前不支持本店所选履约，请更换地址或方式。' : '' } } catch(e) { if(current === addressSequence) error.value = e instanceof Error ? e.message : '地址校验未完成，请刷新后确认' } }
const targetChoices = (index: number) => choices.value.filter((c, target) => target !== index && delivery(c))
function toggleTarget(store: string) { applyTargets.value = applyTargets.value.includes(store) ? applyTargets.value.filter(id => id !== store) : [...applyTargets.value, store] }
async function applyAddress(index: number) { const source = choices.value[index]; if(!source.addressId || !applyTargets.value.length) return; for(const target of choices.value) if(applyTargets.value.includes(target.storeId) && delivery(target)){ target.addressId = source.addressId; target.addressVersion = source.addressVersion } applySource.value = -1; dirty(); await validateAddresses() }
function payload(): S2Choice[] { return choices.value.map((c) => ({ storeId: c.storeId, method: c.method, ...(delivery(c) ? { addressId: c.addressId, addressVersion: c.addressVersion } : { pointId: c.pointId }), contact: { name: c.contact.name.trim(), mobile: c.contact.mobile.trim() }, remark: c.remark.trim() })) }
async function execute(work: () => Promise<void>) { if (busy.value) return; busy.value = true; error.value = ''; try { active(); await work(); active() } catch (e) { error.value = e instanceof Error ? e.message : '操作未完成，请查询原交易' } finally { busy.value = false } }
const calculate = () => execute(async () => {
  if (!allComplete.value) throw new Error('请逐店选择履约方式、地址或点位，并填写联系人。')
  const context = draftKey, selected = items.value.map(item => ({ ...item })), choices = payload()
  const fingerprint = JSON.stringify([selected, choices])
  const result = await stage2Mall.quote(selected, choices)
  active()
  if (context === draftKey && fingerprint === JSON.stringify([items.value, payload()])) quote.value = result
})
async function accept(result: Awaited<ReturnType<typeof stage2Mall.create>>, context: string) {
  active(); if (context !== draftKey) return; resendAvailable.value = false
  if (result.tradeId) { uni.removeStorageSync(draftKey); uni.redirectTo({ url: `/pages/pay/result/index?tradeId=${result.tradeId}` }) }
  else if (result.status === 'FAILED') {
    const priorChoices = choices.value.map(c => ({ ...c, contact: { ...c.contact } }))
    uni.removeStorageSync(draftKey); original.value = undefined; submitted.value = false; quote.value = undefined
    await load(); active()
    if (context !== draftKey) return
    if (status.value === 'ready') {
      for (const choice of choices.value) {
        const prior = priorChoices.find(c => c.storeId === choice.storeId)
        if (!prior) continue
        choice.contact = prior.contact; choice.remark = prior.remark; choice.method = prior.method
        const address = book.value?.records.find(a => a.id === prior.addressId)
        choice.addressId = delivery(choice) ? address?.id : undefined
        choice.addressVersion = delivery(choice) ? address?.version : undefined
        const points = stores.value.find(s => s.storeId === choice.storeId)?.precheck.candidatePoints[choice.method] || []
        choice.pointId = !delivery(choice) && points.some(p => p.id === prior.pointId) ? prior.pointId : undefined
      }
      await validateAddresses(); active()
      error.value = '原提交已确认未创建交易。已保留本次填写，请核对最新商品、地址及履约后重新报价。'
    }
  } else { error.value = '创建结果仍在核实。请查询本次原意图或从待处理交易继续。' }
}
const submit = () => execute(async () => {
  if (submitted.value) { await recover(); return }
  if (!quote.value || !allComplete.value) throw new Error('请先获取并核对各店完整报价。')
  const body = { intentId: stage2OperationId('intent'), quoteId: quote.value.quoteId, confirmationHash: quote.value.confirmationHash }
  const context = draftKey
  // Persist BEFORE dispatch. Ambiguous writes are never replaced with a new purchase intent.
  uni.setStorageSync(draftKey, body); original.value = body; submitted.value = true
  await accept(await stage2Mall.create(body), context)
})
async function recover() {
  if (!original.value) return
  active(); resendAvailable.value = false
  const context = draftKey, intent = original.value.intentId
  try { await accept(await stage2Mall.intent(intent), context) }
  catch (e) {
    active()
    if (context !== draftKey || original.value?.intentId !== intent) return
    if ((e as { status?: number }).status !== 404) throw e
    resendAvailable.value = true
    error.value = '尚未查到原提交，原请求仍可能在途。可继续查询，或由您确认后重新发送同一个提交。'
  }
}
async function resend() {
  if (!resendAvailable.value || !original.value) return
  active(); resendAvailable.value = false
  const context = draftKey, body = original.value
  await accept(await stage2Mall.create(body), context)
}
watch(() => props.options, load, { immediate: true })
watch(stage2Owner, () => { sequence++; preview.value = []; items.value = []; stores.value = []; choices.value = []; book.value = undefined; quote.value = undefined; original.value = undefined; submitted.value = false; resendAvailable.value = false; status.value = 'error'; error.value = '登录身份已变化，请重新进入本人结算。' }, { flush: 'sync' })
</script>
<template>
  <AppPage v-if="accessRequired(error)" status="ready"><template #navbar><AppNavbar title="确认订单" centered show-back /></template><Stage2Notice :error="error"/></AppPage><AppPage v-else :status="status" :state-message="error" secondary with-bottom-action @retry="load">
    <template #navbar><AppNavbar title="确认订单" centered show-back /></template>
    <view class="stack s2-confirm"><Stage2Notice /><text v-if="error" class="s2-error">{{ error }}</text>
      <BaseCard v-if="submitted"><text>本次提交结果需核实，请继续查询原意图。</text><text class="secondary">{{ original?.intentId }}</text><AppButton :disabled="busy" @click="execute(recover)">查询原提交</AppButton><AppButton v-if="resendAvailable" variant="secondary" :disabled="busy" @click="execute(resend)">重新发送原提交</AppButton></BaseCard>
      <template v-else>
        <BaseCard v-for="(store, index) in stores" :key="store.storeId"><text class="store-name">{{ store.storeName }}</text><S2OrderSummary :items="preview.filter(p=>p.storeId===store.storeId)" :order="quote?.orders.find(o=>o.storeId===store.storeId)"/>
          <text v-if="store.precheck.reasonCodes.length" class="s2-error">{{store.precheck.commonMethods.length ? '该店商品或经营条件已变化，请返回购物车调整。' : '本店所选商品没有共同可用的履约方式；本次全部店铺尚未提交，请返回购物车调整。'}}</text>
          <picker :disabled="busy" :range="store.precheck.commonMethods.map(m => methodNames[m])" @change="chooseMethod(index, $event)"><view class="pick-row">履约方式：{{ methodNames[choices[index].method] || '无共同履约方式' }} ›</view></picker>
          <text v-if="!methodAvailable(choices[index])" class="s2-error">原履约方式当前不可用，请明确重新选择。</text>
          <template v-if="delivery(choices[index])"><picker :disabled="busy" :range="book?.records.map(a => a.name + ' ' + a.region + a.detail) || []" @change="chooseAddress(index, $event)"><view class="pick-row">收货地址：{{ book?.records.filter(a => a.id === choices[index].addressId).map(a=>a.name+' '+a.mobile+' · '+a.region+a.detail).join('') || '请选择本店地址' }} ›</view></picker><text v-if="choices[index].addressIssue" class="s2-error">{{ choices[index].addressIssue }}</text><button v-if="choices[index].addressId && targetChoices(index).length" class="text-button" @click="applySource = index; applyTargets = []">将本店地址应用到其他店</button><view v-if="applySource === index"><text class="secondary">明确选择要替换地址的配送/物流店铺；其他店保持原选择。</text><button v-for="target in targetChoices(index)" :key="target.storeId" class="text-button" @click="toggleTarget(target.storeId)">{{ applyTargets.includes(target.storeId) ? '✓' : '○' }} {{ stores.find(s => s.storeId === target.storeId)?.storeName }}</button><AppButton variant="secondary" :disabled="!applyTargets.length" @click="applyAddress(index)">确认应用并逐店校验</AppButton></view><button class="text-button" @click="manageAddresses">管理地址</button><button class="text-button" @click="load">返回后重新读取地址与条件</button></template>
          <picker v-else :disabled="busy" :range="store.precheck.candidatePoints[choices[index].method] || []" range-key="name" @change="choices[index].pointId = store.precheck.candidatePoints[choices[index].method]?.[Number($event.detail.value)]?.id; dirty()"><view class="pick-row">服务点：{{ store.precheck.candidatePoints[choices[index].method]?.find(p => p.id === choices[index].pointId)?.name || '请选择' }} ›</view></picker>
          <view v-for="point in (store.precheck.candidatePoints[choices[index].method] || []).filter(p => p.id === choices[index].pointId)" :key="point.id" class="secondary"><text>{{ point.address }}</text><text>联系电话：{{ point.phone }}</text><text>开放时间：{{ openingText(point.opening) }}</text><text>{{ point.instructions }}</text><text>开放时间为服务说明，不限制本次购买。</text></view>
          <text class="label">本店联系人（必填）</text><input v-model="choices[index].contact.name" :disabled="busy" maxlength="30" placeholder="姓名（1—30字）" @input="dirty" /><input v-model="choices[index].contact.mobile" :disabled="busy" maxlength="11" type="number" placeholder="11位手机号" @input="dirty" />
          <text v-if="choices[index].contact.mobile && !/^1\d{10}$/.test(choices[index].contact.mobile)" class="s2-error">本店联系人手机号需为11位。</text><text class="label">本店备注</text><textarea v-model="choices[index].remark" :disabled="busy" maxlength="200" placeholder="选填，最多200字" @input="dirty" />
          <text class="secondary">本店费用以服务端完整报价为准，配送/物流每店计一次，自提/核销免费。</text>
        </BaseCard>
        <AppButton variant="secondary" :disabled="busy || !allComplete" @click="calculate">读取完整报价</AppButton><text v-if="!allComplete" class="secondary">请完成每家店的履约、地址或点位及联系人。</text>
        <BaseCard v-if="quote"><text class="total">全部店铺合计 ¥{{ money(quote.amountCent) }}</text><text class="secondary">报价有效至 {{ shanghaiTime(quote.expiresAt) }}；条件变化需重新确认。</text></BaseCard>
      </template>
    </view>
    <BottomActionBar><view><text>{{ submitted ? '原提交核验中' : quote ? '合计 ¥' + money(quote.amountCent) : '请先读取完整报价' }}</text><text class="secondary">模拟交易 · 全部店铺整体提交</text></view><AppButton :disabled="busy || (!submitted && !quote)" :loading="busy" @click="submit">{{ submitted ? '查询原提交' : '确认并提交' }}</AppButton></BottomActionBar>
  </AppPage>
</template>
<style scoped lang="scss">.s2-confirm{gap:$space-3}.s2-error{display:block;color:$color-error;font-size:14px;line-height:22px}.store-name{display:block;font-size:18px;font-weight:600;line-height:28px}.pick-row{min-height:48px;padding:12px 0;border-bottom:1px solid $color-border;font-size:15px;line-height:24px;overflow-wrap:anywhere}.label{display:block;margin-top:12px;font-size:15px}.s2-confirm input{min-height:48px;margin-top:8px;padding:0 12px;background:$color-group-bg;border-radius:$radius-md;font-size:16px}.s2-confirm textarea{width:100%;min-height:72px;padding:8px;box-sizing:border-box;background:$color-group-bg;font-size:15px}.secondary{display:block;color:$color-text-secondary;font-size:13px;line-height:22px;overflow-wrap:anywhere}.text-button{min-height:44px;background:transparent;color:$color-primary;font-size:14px}.text-button::after{border:0}.quoted-store{display:flex;flex-direction:column;gap:8px;padding:12px 0;border-bottom:1px solid $color-border;font-size:14px;line-height:22px}.total{display:block;padding-top:12px;color:$color-accent;font-size:20px;font-weight:700}</style>
