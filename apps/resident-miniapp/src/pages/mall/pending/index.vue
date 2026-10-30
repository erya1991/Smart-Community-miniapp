<script setup lang="ts">
import {accessRequired} from '../../../../../../packages/common/utils/commercePresentation'
import {moneyCent,shanghaiTime} from '../../../../../../packages/common/utils/commercePresentation'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppButton from '@/components/AppButton.vue'
import BaseCard from '@/components/BaseCard.vue'
import Stage2Notice from '@/features/mall/Stage2Notice.vue'
import { usePageResource } from '@/composables/usePageResource'
import { stage2Mall } from '@/services/stage2-mall'
import { stage2Owner, stage2Enabled } from '@/adapters/stage2-http'
import { openSubPage } from '@/utils/navigation'
import type { S2Pending } from '@/services/stage2-types'
const page = ref(1), actionError = ref(''), busy = ref(false)
const { status, data, errorMessage, load } = usePageResource(async () => { if (!stage2Enabled) throw new Error('当前未配置正式模拟交易环境。'); return stage2Mall.pending(page.value) })
const names: Record<string, string> = { WAIT_PAY: '待支付', PAY_CONFIRMING: '结果核验中', CLOSE_CONFIRMING: '整体关闭中', ACCEPTED: '提交结果待核实', VERIFYING: '创建结果核验中', PAID: '已收到付款结果', CLOSED: '关闭异常待核实' }
async function open(card: S2Pending) { if (busy.value) return; busy.value = true; actionError.value = ''; const owner = stage2Owner(); try { let trade = card.tradeId; if (!trade) { const intent = await stage2Mall.intent(card.intentId); trade = intent.tradeId || undefined; if (intent.status === 'FAILED') { actionError.value = '本次原提交已确认未创建交易。'; await load(); return } } if (owner !== stage2Owner()) return; if (trade) openSubPage(`/pages/pay/result/index?tradeId=${trade}`); else actionError.value = '原提交仍由后台核验，请稍后刷新此清单。' } catch (e) { actionError.value = e instanceof Error ? e.message : '查询未完成' } finally { busy.value = false } }
const turn = (n: number) => { page.value = n; load() }
onShow(load)
</script>
<template><AppPage v-if="stage2Enabled && accessRequired(errorMessage)" status="ready"><template #navbar><AppNavbar title="待处理交易" centered show-back /></template><Stage2Notice :error="errorMessage"/></AppPage><AppPage v-else :status="status" :state-message="errorMessage" secondary @retry="load"><template #navbar><AppNavbar title="待处理交易" centered show-back /></template><view class="stack pending"><Stage2Notice /><text v-if="actionError" class="error">{{ actionError }}</text><BaseCard v-for="card in data?.records" :key="card.key"><text class="title">{{ card.summary?.protection ? '交易异常，持续核验' : names[card.status] || '待核验' }}</text><text>{{card.summary?.orders.flatMap(o=>o.items).map(i=>i.name).slice(0,2).join('、') || '本次原提交'}}</text><text>{{ card.summary?.orders.map(o=>o.storeName).join('、') || '本次购买提交' }}</text><text class="secondary">原单标识：{{ card.tradeId || card.intentId }}</text><text>提交时间：{{ shanghaiTime(card.createdAt) }}</text><text v-if="card.summary">¥{{ moneyCent(card.summary.amountCent) }} · {{ card.summary.orders.length }}家店</text><text>最后核验：{{ card.summary?.lastVerifiedAt ? shanghaiTime(card.summary.lastVerifiedAt) : '尚无最终核验' }}</text><AppButton variant="secondary" :disabled="busy" @click="open(card)">{{card.tradeId?'查看原交易':'查询原提交'}}</AppButton></BaseCard><text v-if="data && !data.total">暂无待处理交易。</text><view v-if="data" class="paging"><AppButton variant="secondary" :disabled="page <= 1" @click="turn(page - 1)">上一页</AppButton><text>第{{ page }}页 · 共{{ data.total }}条</text><AppButton variant="secondary" :disabled="page * 20 >= data.total" @click="turn(page + 1)">下一页</AppButton></view></view></AppPage></template>
<style scoped lang="scss">.pending{gap:$space-3}.pending :deep(.base-card)>text{display:block;margin-bottom:8px;font-size:14px;line-height:23px;overflow-wrap:anywhere}.title{font-size:18px;font-weight:600}.error{color:$color-error}.paging{display:flex;align-items:center;gap:8px;font-size:13px}</style>
