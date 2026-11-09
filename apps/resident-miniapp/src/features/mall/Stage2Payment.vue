<script setup lang="ts">
import {openPage} from '../../utils/navigation'
import {accessRequired} from '../../../../../packages/common/utils/commercePresentation'
import { computed, onUnmounted, ref, watch } from 'vue'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import BottomActionBar from '@/components/BottomActionBar.vue'
import ResultState from '@/components/ResultState.vue'
import S2OrderSummary from './S2OrderSummary.vue'
import {shanghaiTime} from '../../../../../packages/common/utils/commercePresentation'
import Stage2Notice from './Stage2Notice.vue'
import { stage2Mall } from '../../services/stage2-mall'
import { stage2Owner } from '../../adapters/stage2-http'
import { methodNames, openingText, specificationText } from '../../services/stage2-types'
import type { S2Trade } from '../../services/stage2-types'
const props = defineProps<{ options: Record<string, string | undefined> | null; visible: boolean }>()
const clockNow = () => typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now()
const data = ref<S2Trade>(), error = ref(''), busy = ref(false), status = ref<'loading' | 'ready' | 'error'>('loading'), now = ref(clockNow())
let serverOffset = 0, sequence = 0, contextGeneration = 0, actionSequence = 0
const tradeId = computed(() => props.options?.tradeId || '')
const paid = computed(() => data.value?.status === 'PAID' && data.value.paymentStatus === 'SUCCEEDED' && !data.value.protection && typeof data.value.paidAt === 'string' && Number.isFinite(Date.parse(data.value.paidAt)) && data.value.paidAmountCent === data.value.amountCent)
const closed = computed(() => data.value?.status === 'CLOSED' && !data.value.protection)
const deadline = computed(() => data.value ? Math.max(0, Math.ceil((Date.parse(data.value.payDeadline) - now.value - serverOffset) / 1000)) : 0)
const title = computed(() => data.value?.protection === 'LATE_PAYMENT_AFTER_RELEASE' ? '收到晚到付款，需人工核实' : data.value?.protection === 'CHANNEL_RESULT_OUT_OF_SCOPE' ? '收到超出本期范围的结果，需人工核实' : paid.value ? '模拟支付成功' : closed.value ? '交易已关闭' : data.value?.paymentStatus === 'SUCCEEDED' ? '已收到付款结果，订单仍在核实' : data.value?.closeStatus !== 'NONE' ? '整体关闭确认中' : data.value?.status === 'WAIT_PAY' ? '等待模拟支付' : '支付结果核验中')
const description = computed(() => data.value?.protection === 'LATE_PAYMENT_AFTER_RELEASE' ? '原占用已释放后收到付款事实，尚不能作为普通购买成功。请保留原交易，勿再次付款。' : data.value?.protection === 'CHANNEL_RESULT_OUT_OF_SCOPE' ? '本笔结果已隔离，保留原付款及交易记录，需要人工核实。请查询原交易，勿再次付款。' : paid.value ? '完整付款与库存联动已由服务端确认。请保留交易编号。' : closed.value ? '服务端已确认安全关闭，并完成库存释放。' : data.value?.attention ? '服务端持续核验中，需要人工关注。请保留原交易编号，勿重复购买。' : data.value?.closeReason === 'RECONFIRM_REQUIRED' || data.value?.protection === 'RECONFIRM_REQUIRED' ? '交易条件已变化，正在安全关闭原交易。完成后请重新选择并确认。' : '退出当前页不代表取消。未决结果由后台持续查询；请勿重复支付或重新下单。')
const money = (n: number) => (n / 100).toFixed(2)
function accept(value: S2Trade) { const current = clockNow(); serverOffset = Date.parse(value.serverTime) - current; data.value = value; now.value = current; status.value = 'ready' }
async function load() { if (!props.options) return; const current = ++sequence, owner = stage2Owner(), target = tradeId.value; error.value = ''; try { if (!/^[1-9]\d{0,18}$/.test(target)) throw new Error('请从待处理交易进入原交易。'); const result = await stage2Mall.summary(target); if (current === sequence && owner === stage2Owner() && target === tradeId.value && result.tradeId === target) accept(result) } catch (e) { if (current === sequence && owner === stage2Owner() && target === tradeId.value) { data.value = undefined; status.value = 'error'; error.value = e instanceof Error ? e.message : '交易读取失败' } } }
async function act(work: (target: string, isCurrent: () => boolean) => Promise<{ trade: S2Trade }>) {
  if (busy.value || !props.options || !/^[1-9]\d{0,18}$/.test(tradeId.value)) return
  const owner = stage2Owner(), target = tradeId.value, context = contextGeneration, action = ++actionSequence
  const isCurrent = () => owner === stage2Owner() && target === tradeId.value && context === contextGeneration && action === actionSequence
  sequence++; busy.value = true; error.value = ''
  try { const result = await work(target, isCurrent); if (isCurrent() && result.trade.tradeId === target) { sequence++; accept(result.trade) } }
  catch (e) { if (isCurrent()) { error.value = e instanceof Error ? e.message : '结果尚未确认，请查询原交易'; await load() } }
  finally { if (isCurrent()) busy.value = false }
}
const refresh = () => act(target => stage2Mall.refresh(target))
const pay = () => act(async (target, isCurrent) => { const prepared = await stage2Mall.prepare(target); if (!isCurrent() || prepared.trade.tradeId !== target) return prepared; accept(prepared.trade); if (!prepared.launchReady || !prepared.trade.allowedActions.includes('PAY')) return prepared; return stage2Mall.launch(target) })
const cancel = () => { if (!data.value || busy.value || data.value.tradeId !== tradeId.value) return; const current = data.value, owner = stage2Owner(), context = contextGeneration; uni.showModal({ title: '取消整笔交易', content: `将取消本次全部店铺订单，共${current.orders.length}家店，合计¥${money(current.amountCent)}。最终结果需服务端核验。`, confirmText: '确认取消', success: ({ confirm }) => { if (confirm && owner === stage2Owner() && context === contextGeneration && current.tradeId === tradeId.value) void act(target => stage2Mall.cancel(target)) } }) }
const mall = () => openPage('/pages/mall/index')
const timer = setInterval(() => { now.value = Math.max(now.value, clockNow()); if (props.visible && data.value && !paid.value && !closed.value && !busy.value && (data.value.status !== 'WAIT_PAY' || deadline.value === 0)) void refresh() }, 5000)
onUnmounted(() => { contextGeneration++; actionSequence++; sequence++; clearInterval(timer) })
watch(() => props.options, () => { contextGeneration++; actionSequence++; sequence++; data.value = undefined; busy.value = false; error.value = ''; status.value = 'loading'; void load() }, { immediate: true, flush: 'sync' })
watch(() => props.visible, (visible) => { if (visible && data.value) void refresh() })
watch(stage2Owner, () => { contextGeneration++; actionSequence++; sequence++; data.value = undefined; busy.value = false; status.value = 'error'; error.value = '请重新登录后查询本次原交易。' }, { flush: 'sync' })
</script>
<template><AppPage v-if="accessRequired(error)" status="ready"><template #navbar><AppNavbar title="交易与支付结果" centered show-back /></template><Stage2Notice :error="error"/></AppPage><AppPage v-else :status="status" :state-message="error" secondary with-bottom-action @retry="load"><template #navbar><AppNavbar title="交易与支付结果" centered show-back /></template>
  <view class="stack s2-payment"><Stage2Notice /><text v-if="error" class="s2-error">{{ error }}</text><template v-if="data"><ResultState :tone="paid ? 'success' : closed ? 'error' : 'pending'" :title="title" :description="description" /><BaseCard><view v-for="change in data.closeDetails?.details?.changes || []" :key="change.storeId" class="s2-error">{{ data.orders.find(o => o.storeId === change.storeId)?.storeName || '本次店铺' }}：{{ change.fields.join('、') }}需重新确认。</view><text v-if="data.closeDetails?.details?.storeId" class="s2-error">{{ data.orders.find(o => o.storeId === data?.closeDetails?.details?.storeId)?.storeName || '本次店铺' }}的商品或履约条件已变化。</text><text class="amount">¥{{ money(data.amountCent) }}</text><text class="detail">模拟交易编号：{{ data.tradeId }}</text><text v-if="data.paidAt && data.paidAmountCent != null" class="detail">模拟实付：¥{{ money(data.paidAmountCent) }} · 付款时间：{{ shanghaiTime(data.paidAt) }}</text><text class="detail">最后核验：{{ data.lastVerifiedAt ? shanghaiTime(data.lastVerifiedAt) : '尚无最终核验' }}</text><text v-if="!paid && !closed" class="detail">剩余可付时间：{{ deadline }} 秒；截止后仍以服务端核验为准。</text></BaseCard><BaseCard v-for="order in data.orders" :key="order.storeId"><text class="store">{{ order.storeName }} · {{ methodNames[order.method] }}</text><S2OrderSummary :order="order" snapshot/></BaseCard></template></view>
  <BottomActionBar class="payment-actions"><AppButton variant="secondary" :disabled="busy" @click="refresh">查询原交易</AppButton><AppButton v-if="data?.allowedActions.includes('CANCEL')" variant="secondary" :disabled="busy" @click="cancel">取消整笔</AppButton><AppButton v-if="data?.allowedActions.includes('PAY') && deadline > 0" :disabled="busy" :loading="busy" @click="pay">模拟支付</AppButton><AppButton v-if="closed || paid" @click="mall">返回商城</AppButton></BottomActionBar>
</AppPage></template>
<style scoped lang="scss">.s2-payment{gap:$space-3}.s2-error{color:$color-error;font-size:14px;line-height:22px}.amount{display:block;color:$color-accent;font-size:28px;font-weight:700}.detail{display:block;margin-top:8px;color:$color-text-secondary;font-size:14px;line-height:23px;overflow-wrap:anywhere}.store{font-size:17px;font-weight:600;line-height:26px}.payment-actions :deep(.bottom-action__inner .app-button){flex:1;min-width:0;padding:0 8px;white-space:nowrap;font-size:15px}</style>
