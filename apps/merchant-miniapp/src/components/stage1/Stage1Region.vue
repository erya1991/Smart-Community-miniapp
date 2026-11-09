<script setup lang="ts">
import {ref,watch} from 'vue'
import Stage1Field from './Stage1Field.vue'
import {stage1Service} from '../../services/stage1'
const props=defineProps<{modelValue:Record<string,any>;disabled?:boolean}>(),emit=defineEmits<{(e:'update:modelValue',value:Record<string,any>):void}>()
interface Region{id:string;code:string;name:string}
const provinces=ref<Region[]>([]),cities=ref<Region[]>([]),districts=ref<Region[]>([]),error=ref('');let sequence=0
const options=(rows:Region[])=>rows.map(r=>({value:r.code,label:r.name}))
async function load(){const ticket=++sequence;try{provinces.value=await stage1Service.read<Region[]>('/regions');const province=provinces.value.find(r=>r.code===props.modelValue.provinceCode);if(province){const value=await stage1Service.read<Region[]>('/regions',{parentId:province.id});if(ticket!==sequence)return;cities.value=value;const city=value.find(r=>r.code===props.modelValue.cityCode);if(city){const list=await stage1Service.read<Region[]>('/regions',{parentId:city.id});if(ticket===sequence)districts.value=list}}}catch(e){error.value=e instanceof Error?e.message:'地区读取失败'}}
async function province(code:string){const ticket=++sequence;emit('update:modelValue',{...props.modelValue,provinceCode:code,cityCode:null,districtCode:null});cities.value=[];districts.value=[];try{const row=provinces.value.find(r=>r.code===code);if(row){const value=await stage1Service.read<Region[]>('/regions',{parentId:row.id});if(ticket===sequence)cities.value=value}}catch(e){error.value=e instanceof Error?e.message:'地区读取失败'}}
async function city(code:string){const ticket=++sequence;emit('update:modelValue',{...props.modelValue,cityCode:code,districtCode:null});districts.value=[];try{const row=cities.value.find(r=>r.code===code);if(row){const value=await stage1Service.read<Region[]>('/regions',{parentId:row.id});if(ticket===sequence)districts.value=value}}catch(e){error.value=e instanceof Error?e.message:'地区读取失败'}}
watch(()=>[props.modelValue.provinceCode,props.modelValue.cityCode],load,{immediate:true})
</script>
<template><view class="s1-region"><text v-if="error">{{error}}</text><Stage1Field label="省" type="select" :options="options(provinces)" :model-value="modelValue.provinceCode" :disabled="disabled||!provinces.length" required @update:model-value="province"/><Stage1Field label="市" type="select" :options="options(cities)" :model-value="modelValue.cityCode" :disabled="disabled||!cities.length" required @update:model-value="city"/><Stage1Field label="区县" type="select" :options="options(districts)" :model-value="modelValue.districtCode" :disabled="disabled||!districts.length" required @update:model-value="emit('update:modelValue',{...modelValue,districtCode:$event})"/></view></template>
<style scoped lang="scss">.s1-region{display:flex;flex-direction:column;gap:$space-4}</style>
