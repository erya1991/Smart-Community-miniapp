<script setup lang="ts">
import {ref} from 'vue'
import {onLoad,onShow} from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import FundsList from '@shared/ui/components/stage45/FundsList.vue'

import {stage45Api,stage45Enabled} from '@/services/stage45'
const query=ref<Record<string,string>>({}),refresh=ref(0)
onLoad(options=>{query.value=options||{}});onShow(()=>refresh.value++)
function open(id:string){uni.navigateTo({url:'/pages/funds/detail/index?id='+id})}
function created(id:string){uni.redirectTo({url:'/pages/evaluation/index?id='+id})}
</script>
<template><AppPage secondary><template #navbar><AppNavbar title="订单资金" centered show-back/></template><FundsList v-if="stage45Enabled" :api="stage45Api" :refresh-key="refresh" @open="open"/><view v-if="!stage45Enabled">此功能尚未开放。</view></AppPage></template>
