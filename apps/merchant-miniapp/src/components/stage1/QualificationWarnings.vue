<script setup lang="ts">
import StatusTag from '@/components/StatusTag.vue'
import {label} from '../../services/stage1'
import type {Data} from '../../services/stage1'
defineProps<{items?:Data[]}>()
</script>
<template><view v-if="items?.length" class="s1-qualification-warnings"><text class="s1-warning-title">资质效期提醒</text><view v-for="item in items" :key="item.id" class="s1-warning"><StatusTag :tone="item.warning==='EXPIRED'?'error':'pending'">{{label(item.warning)}}</StatusTag><text>{{label(item.type)}} · {{item.scope==='STORE'?'全店范围':'对应类目'}} · 截止 {{item.validThrough}}</text></view><text class="s1-warning-note">临近到期提醒不等于失效；续期审核通过前仍按当前有效版本判断。</text></view></template>
<style scoped lang="scss">.s1-qualification-warnings{display:flex;flex-direction:column;gap:$space-3}.s1-warning-title{font-weight:600;font-size:15px}.s1-warning{display:flex;flex-wrap:wrap;gap:$space-2;font-size:13px;line-height:1.7;overflow-wrap:anywhere}.s1-warning-note{font-size:12px;line-height:1.7;color:$color-text-secondary}</style>
