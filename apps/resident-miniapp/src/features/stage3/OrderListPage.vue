<script setup lang="ts">
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'

import OrderList from '@shared/ui/components/stage3/OrderList.vue'
import {stage3Api} from '../../services/stage3'
defineProps<{query:Record<string,any>}>()
const refresh=ref(0);onShow(()=>refresh.value++)
function open(id:string){uni.navigateTo({url:'/pages/mall/order-detail/index?id='+encodeURIComponent(id)})}
</script>
<template><AppPage secondary><template #navbar><AppNavbar title="我的商城订单" show-back centered/></template><OrderList :api="stage3Api" :merchant="false" :initial-filter="query.filter" :refresh-key="refresh" @open="open"/></AppPage></template>
