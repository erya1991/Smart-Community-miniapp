<script setup lang="ts">
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import AppTabbar from '@/components/AppTabbar.vue'
import {merchantTabItems} from '@/config/navigation'
import OrderList from '@shared/ui/components/stage3/OrderList.vue'
import {stage3Api} from '../../services/stage3'
defineProps<{query:Record<string,any>}>()
const refresh=ref(0);onShow(()=>refresh.value++)
function open(id:string){uni.navigateTo({url:'/pages/order/detail/index?id='+encodeURIComponent(id)})}
</script>
<template><AppPage ><template #navbar><AppNavbar title="订单" compact show-user/></template><OrderList :api="stage3Api" :merchant="true" :initial-filter="query.filter" :refresh-key="refresh" @open="open"/><template #tabbar><AppTabbar :items="merchantTabItems" active-path="/pages/order/index"/></template></AppPage></template>
