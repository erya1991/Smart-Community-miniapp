<script setup lang="ts">
defineProps<{error?:string}>()
import { openPage, openSubPage } from '@/utils/navigation'
</script>
<template><view class="s2-notice"><template v-if="error"><text class="s2-access-title">{{ /无权/.test(error) ? '当前身份无权访问' : '请先登录' }}</text><text>{{ error }}</text><text>请从既有登录入口确认身份，再返回读取本人数据。</text></template><text v-else>模拟交易 · 以服务端结果为准</text><view><button @click="openSubPage('/pages/mall/pending/index')">待处理交易</button><button @click="openPage('/pages/profile/index')">登录与身份</button></view></view></template>
<style scoped lang="scss">.s2-access-title{display:block;font-size:20px;font-weight:600;margin-bottom:12px}.s2-notice>text{display:block}.s2-notice{padding:$space-3;border-radius:$radius-card;background:$color-primary-light;color:$color-primary;font-size:14px;line-height:22px}.s2-notice>view{display:flex;flex-wrap:wrap;gap:$space-2}.s2-notice button{min-height:44px;margin:0;padding:0 8px;background:transparent;color:$color-primary;font-size:15px}.s2-notice button::after{border:0}</style>
