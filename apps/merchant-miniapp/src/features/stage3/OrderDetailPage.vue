<script setup lang="ts">
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import OrderActions from '@shared/ui/components/stage45/OrderActions.vue'
import {stage45Api,stage45Enabled} from '@/services/stage45'
import OrderDetail from '@shared/ui/components/stage3/OrderDetail.vue'
import {stage3Api} from '../../services/stage3'
defineProps<{query:Record<string,any>}>()
const refresh=ref(0);onShow(()=>refresh.value++)
function credential(id:string){uni.navigateTo({url:'/pages/mall/credential/index?id='+encodeURIComponent(id)})}
function pay(){uni.navigateTo({url:'/pages/mall/pending/index'})}
</script>
<template><AppPage secondary><template #navbar><AppNavbar title="订单详情" show-back centered/></template><OrderDetail :api="stage3Api" :merchant="true" :order-id="query.id||''" :refresh-key="refresh" @credential="credential" @pay="pay"/><OrderActions v-if="stage45Enabled" :api="stage45Api" :order-id="query.id||''" :refresh-key="refresh" merchant/></AppPage></template>
