<script setup lang="ts">
import {ref} from 'vue'
import {onShow} from '@dcloudio/uni-app'
import Workbench from '@shared/ui/components/stage3/Workbench.vue'
import {stage3Api} from '../../services/stage3'
const refresh=ref(0);onShow(()=>refresh.value++)
function orders(filter:string){uni.redirectTo({url:'/pages/order/index?filter='+filter})}
function verify(){uni.navigateTo({url:'/pages/verification/index'})}
function messages(){uni.navigateTo({url:'/pages/messages/index'})}
</script>
<template><Workbench :api="stage3Api" :refresh-key="refresh" @orders="orders" @verify="verify" @messages="messages"/></template>
