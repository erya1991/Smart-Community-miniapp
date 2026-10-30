import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import test from 'node:test';import ts from 'typescript';import * as vue from 'vue';
const source=fs.readFileSync(new URL('../apps/resident-miniapp/src/features/mall/Stage2Confirm.vue',import.meta.url),'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
const bindings='status,error,choices,book,quote,submitted,original,chooseAddress,toggleTarget,applyAddress,applyTargets,calculate,submit';
const code=ts.transpileModule(source+`\nexport {${bindings}}`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText.replaceAll('import.meta.env.VITE_RESIDENT_API_BASE_URL',"'https://s2.test.invalid'");
async function fixture(){
 const owner=vue.ref('A:1'),storage=new Map(),calls={create:0,intent:0,createdAfterStorage:false,options:[]};let sequence=0;
 const addresses=[{id:'601',name:'S2_TEST甲',mobile:'13800000000',version:0,detail:'测试地址甲'},{id:'602',name:'S2_TEST乙',mobile:'13900000000',version:0,detail:'测试地址乙'}];
 const coverage={'1':['601','602'],'2':['602'],'3':['601']};
 const service={checkoutPresentation:async()=>[],checkoutItems:async()=>[{skuId:'401',quantity:1}],book:async()=>({version:1,defaultAddressId:'601',records:addresses}),
  options:async(items,selected=[])=>{calls.options.push(structuredClone(selected));return {stores:['1','2','3'].map(id=>({storeId:id,storeName:'S2_TEST店'+id,precheck:{reasonCodes:[],commonMethods:!selected.find(a=>a.storeId===id)||coverage[id].includes(selected.find(a=>a.storeId===id).addressId)?['MERCHANT_DELIVERY']:[],candidatePoints:{}}}))}},
  quote:async()=>({quoteId:'701',confirmationHash:'a'.repeat(64),amountCent:3003,orders:[]}),
  create:async body=>{calls.create++;calls.createdAfterStorage=[...storage.values()].some(v=>v.intentId===body.intentId);throw Error('写入回执未知')},
  intent:async()=>{calls.intent++;return {status:'VERIFYING',tradeId:null}},
 };
 const module={exports:{}},scope=vue.effectScope();scope.run(()=>vm.runInNewContext(code,{module,exports:module.exports,defineProps:()=>vue.reactive({options:{productId:'101',skuId:'401',quantity:'1'}}),uni:{getStorageSync:key=>storage.get(key),setStorageSync:(key,value)=>storage.set(key,structuredClone(value)),removeStorageSync:key=>storage.delete(key),navigateTo(){},redirectTo(){}},Map,Set,JSON,Error,Number,decodeURIComponent,require:id=>id==='vue'?vue:id.endsWith('/stage2-mall')?{stage2Mall:service}:id.endsWith('/stage2-http')?{stage2Owner:()=>owner.value,stage2OperationId:()=>`intent_${++sequence}`}:id.endsWith('/stage2-types')?{methodNames:{MERCHANT_DELIVERY:'商户配送'}}:{}}));
 for(let i=0;i<30&&module.exports.status.value==='loading';i++)await new Promise(resolve=>setImmediate(resolve));
 assert.equal(module.exports.status.value,'ready');return {page:module.exports,owner,storage,calls,scope};
}
test('address changes stay per Store; explicit target application checks every target and preserves default',async()=>{
 const f=await fixture();try{assert.ok(f.page.choices.value[1].addressIssue);await f.page.chooseAddress(0,{detail:{value:1}});assert.equal(f.page.choices.value[0].addressId,'602');assert.equal(f.page.choices.value[1].addressId,'601');assert.equal(f.page.choices.value[2].addressId,'601');f.page.choices.value[1].contact={name:'S2_TEST乙店联系人',mobile:'13800000000'};f.page.toggleTarget('2');await f.page.applyAddress(0);assert.equal(f.page.choices.value[1].addressId,'602');assert.equal(f.page.choices.value[2].addressId,'601');assert.equal(f.page.choices.value[1].addressIssue,'');assert.equal(f.page.choices.value[1].contact.name,'S2_TEST乙店联系人');assert.equal(f.page.book.value.defaultAddressId,'601');}finally{f.scope.stop()}
});
test('ambiguous submit saves the original intent before dispatch and repeated click only queries it',async()=>{
 const f=await fixture();try{await f.page.chooseAddress(1,{detail:{value:1}});for(const c of f.page.choices.value)c.contact={name:'S2_TEST联系人',mobile:'13800000000'};await f.page.calculate();assert.ok(f.page.quote.value);await f.page.submit();assert.equal(f.calls.create,1);assert.equal(f.calls.createdAfterStorage,true);assert.equal(f.page.submitted.value,true);const original=f.page.original.value.intentId;await f.page.submit();assert.equal(f.calls.create,1);assert.equal(f.calls.intent,1);assert.equal(f.page.original.value.intentId,original);}finally{f.scope.stop()}
});
test('identity change clears every private confirmation draft immediately',async()=>{
 const f=await fixture();try{f.page.choices.value[0].contact.name='S2_TEST私有联系人';f.owner.value='B:2';assert.equal(f.page.choices.value.length,0);assert.equal(f.page.book.value,undefined);assert.equal(f.page.quote.value,undefined);assert.match(f.page.error.value,/身份已变化/);}finally{f.scope.stop()}
});

test('payment countdown follows server time and monotonic elapsed time despite device clock plus or minus one day',async()=>{
 const paymentSource=fs.readFileSync(new URL('../apps/resident-miniapp/src/features/mall/Stage2Payment.vue',import.meta.url),'utf8').match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1];
 const paymentCode=ts.transpileModule(paymentSource+'\nexport {deadline,data,status}',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 let wall=Date.parse('2026-10-29T00:00:00Z'),mono=1000,tick;class DeviceDate extends Date{static now(){return wall}}
 const module={exports:{}},scope=vue.effectScope();const owner=vue.ref('A:1');
 scope.run(()=>vm.runInNewContext(paymentCode,{module,exports:module.exports,defineProps:()=>vue.reactive({options:{tradeId:'701'},visible:true}),performance:{now:()=>mono},Date:DeviceDate,Math,Error,setInterval:fn=>{tick=fn;return 1},clearInterval(){},uni:{},require:id=>id==='vue'?{...vue,onUnmounted(){}}:id.endsWith('/stage2-mall')?{stage2Mall:{summary:async()=>({tradeId:'701',serverTime:'2026-10-29T00:00:00Z',payDeadline:'2026-10-29T00:15:00Z',status:'WAIT_PAY',paymentStatus:'UNPAID',closeStatus:'NONE',orders:[],allowedActions:['PAY']})}}:id.endsWith('/stage2-http')?{stage2Owner:()=>owner.value}:{}}));
 try{await new Promise(resolve=>setImmediate(resolve));assert.equal(module.exports.deadline.value,900);wall-=86_400_000;mono+=5000;tick();assert.equal(module.exports.deadline.value,895);wall+=172_800_000;mono+=10000;tick();assert.equal(module.exports.deadline.value,885);owner.value='B:2';assert.equal(module.exports.data.value,undefined);}finally{scope.stop()}
});
