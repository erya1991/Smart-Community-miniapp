<script setup lang="ts">
import {ref} from 'vue'
import {onLoad,onShow,onHide} from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import Credential from '@shared/ui/components/stage3/Credential.vue'
import {stage3Api,stage3Enabled} from '../../../services/stage3'
const id=ref(''),refresh=ref(0),panel=ref<InstanceType<typeof Credential>>()
onLoad(options=>{id.value=typeof options?.id==='string'?options.id:''})
onShow(()=>refresh.value++);onHide(()=>panel.value?.clear())
</script>
<template><AppPage secondary><template #navbar><AppNavbar title="提货 / 核销凭证" show-back centered/></template><Credential v-if="stage3Enabled" ref="panel" :api="stage3Api" :order-id="id" :refresh-key="refresh"/><view v-else>当前尚未开放核销凭证。</view></AppPage></template>
