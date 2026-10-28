<script setup lang="ts">
import AppPage from '../AppPage.vue';import AppNavbar from '@/components/AppNavbar.vue';import AppTabbar from '@/components/AppTabbar.vue';import BaseCard from '@/components/BaseCard.vue';import {merchantTabItems} from '../../config/navigation'
</script>
<template><AppPage><template #navbar><AppNavbar title="订单" centered/></template><view class="s1-orders"><BaseCard><text class="s1-title">交易功能尚未开放</text><text>当前可完成入驻、资料、商品和履约准备。订单与收款将在交易阶段开放。</text></BaseCard></view><template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/order/index"/></template></AppPage></template>
<style scoped lang="scss">.s1-orders{padding:$space-4 $page-gutter;font-size:15px;line-height:1.8}.s1-title{display:block;font-size:20px;font-weight:700;margin-bottom:$space-3}</style>
