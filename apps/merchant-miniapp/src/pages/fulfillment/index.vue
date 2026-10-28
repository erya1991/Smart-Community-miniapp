<script setup lang="ts">
import {ref} from 'vue';import {onLoad} from '@dcloudio/uni-app';import Stage1View from '../../components/stage1/Fulfillment.vue';const query=ref<Record<string,any>>({}),ready=ref(false);onLoad(options=>{query.value=options||{};ready.value=true})
</script>
<template><Stage1View v-if="ready" :query="query"/></template>
