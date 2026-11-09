<script setup lang="ts">
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import {stage45Api,stage45Enabled} from '@/services/stage45'
import Stage45Messages from '@shared/ui/components/stage45/Messages.vue'
import Messages from '@shared/ui/components/stage3/Messages.vue'
import {stage3Api,stage3Enabled} from '../../services/stage3'
const refresh=ref(0);onShow(()=>refresh.value++)
function open(id:string){uni.navigateTo({url:'/pages/order/detail/index?id='+encodeURIComponent(id)})}
</script>
<template><AppPage secondary><template #navbar><AppNavbar title="商城消息" show-back centered/></template><Stage45Messages v-if="stage45Enabled" :api="stage45Api" :refresh-key="refresh" merchant /><Messages v-else-if="stage3Enabled" :api="stage3Api" :refresh-key="refresh" @open="open"/><view v-else>订单消息尚未开放。</view></AppPage></template>
