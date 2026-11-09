<script setup lang="ts">
import {ref} from 'vue'
import {onShow,onHide} from '@dcloudio/uni-app'
import AppPage from '@/components/AppPage.vue'
import AppNavbar from '@/components/AppNavbar.vue'
import Verification from '@shared/ui/components/stage3/Verification.vue'
import {stage3Api} from '../../services/stage3'
defineProps<{query:Record<string,any>}>()
const refresh=ref(0),panel=ref<InstanceType<typeof Verification>>()
onShow(()=>refresh.value++);onHide(()=>panel.value?.clear())
</script>
<template><AppPage secondary><template #navbar><AppNavbar title="订单核销" show-back centered/></template><Verification ref="panel" :api="stage3Api" :refresh-key="refresh"/></AppPage></template>
