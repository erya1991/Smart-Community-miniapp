import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../apps/resident-miniapp/src/services/stage2-mall.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function fixture(){
 let owner='memberA:1',operation=0,handler=async()=>({});const requests=[];
 class Stage2Error extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 const module={exports:{}};
 const dependencies={
  '../adapters/stage2-http':{stage2Owner:()=>owner,stage2OperationId:()=>`operation_${++operation}`,Stage2Error,stage2Request:async(method,path,body,params)=>{requests.push({method,path,body,params});return handler(method,path,body,params)}},
  './stage2-types':{methodNames:{MERCHANT_DELIVERY:'商户配送',EXPRESS:'普通物流',COMMUNITY_PICKUP:'社区自提',STORE_REDEMPTION:'到店核销'}},
  './stage2-assets':{productImageReference:(g,f)=>`stage2-asset:${g}:${f}`,stage2Asset:async ref=>ref},
 };
 vm.runInNewContext(code,{module,exports:module.exports,require:id=>{if(!dependencies[id])throw Error('Unmocked import '+id);return dependencies[id]},console,Map,Set,Number,Promise,Error});
 return {service:module.exports.stage2Mall,requests,Stage2Error,setOwner:value=>owner=value,setHandler:value=>handler=value};
}
const product={id:'101',storeId:'201',storeName:'S2_TEST店铺',categoryId:'301',categoryName:'测试分类',name:'S2_TEST商品',available:true,reasonCodes:[],methods:['MERCHANT_DELIVERY'],galleryFileIds:[],detailBlocks:[{type:'text',text:'<script>仅文字</script>'}],skus:[{id:'401',code:'sku-a',specifications:[],priceCent:1001,quantity:10,inventoryVersion:0}]};
const line={id:'501',skuId:'401',storeId:'201',quantity:2,version:0,unitPriceCent:1001,available:true,reasonCodes:[],product};
const book={version:7,defaultAddressId:'601',records:[{id:'601',name:'S2_TEST',mobile:'13800000000',provinceCode:'990000',cityCode:'990100',districtCode:'990101',region:'合成省市区',detail:'S2_TEST测试地址',alias:'家',version:3,isDefault:true}]};
test('selection belongs to one owner, exact Cart version and quoted unit price',async()=>{
 const f=fixture();let current=structuredClone(line);f.setHandler(async()=>({items:[current]}));
 assert.equal((await f.service.getCart()).groups[0].items[0].selected,false);
 await f.service.toggleCartItem('501',true);assert.equal((await f.service.getCart()).groups[0].items[0].selected,true);
 current={...current,version:1};assert.equal((await f.service.getCart()).groups[0].items[0].selected,false);
 await f.service.toggleCartItem('501',true);current={...current,unitPriceCent:1101};const changed=(await f.service.getCart()).groups[0].items[0];assert.equal(changed.selected,false);assert.match(changed.invalidReason,/价格已更新/);await f.service.toggleCartItem('501',true);assert.equal((await f.service.getCart()).groups[0].items[0].invalidReason,undefined);
 await f.service.toggleCartItem('501',true);f.setOwner('memberB:2');assert.equal((await f.service.getCart()).groups[0].items[0].selected,false);
});
test('consumed or changed selection cannot silently enter a fresh checkout',async()=>{
 const f=fixture();let current=structuredClone(line);f.setHandler(async()=>({items:[current]}));await f.service.getCart();await f.service.toggleCartItem('501',true);
 assert.equal((await f.service.checkoutItems({cartIds:['501']}))[0].expectedVersion,0);
 current={...current,version:1,quantity:1};await assert.rejects(f.service.checkoutItems({cartIds:['501']}),/重新选择/);
});
test('ambiguous Cart write keeps original operation id and does not replay automatically',async()=>{
 const f=fixture();let attempts=0;f.setHandler(async(method,path)=>{if(method==='GET')return product;if(path==='/cart/items'){attempts++;if(attempts===1)throw Error('lost acknowledgment');return {items:[line]}}});
 await assert.rejects(f.service.addCart('101','401',1001,1));assert.equal(attempts,1);
 await f.service.addCart('101','401',1001,1);const writes=f.requests.filter(r=>r.path==='/cart/items');assert.equal(writes.length,2);assert.equal(writes[0].body.operationId,writes[1].body.operationId);
 await f.service.addCart('101','401',1001,1);assert.notEqual(f.requests.at(-1).body.operationId,writes[0].body.operationId);
});
test('address edits carry original address and book versions, never Member or Store selectors',async()=>{
 const f=fixture();f.setHandler(async(method)=>method==='GET'?structuredClone(book):structuredClone(book));await f.service.getAddresses();await f.service.saveAddress({...book.records[0],label:'家'});
 const body=f.requests.at(-1).body;assert.equal(body.addressBookVersion,7);assert.equal(body.expectedVersion,3);assert.equal(body.provinceCode,'990000');assert.equal('memberId' in body,false);assert.equal('storeId' in body,false);
 f.setOwner('memberB:2');await assert.rejects(f.service.deleteAddress('601'),/刷新地址簿/);
});

test('address delete confirmation freezes versions and cannot cross an identity change',async()=>{
 const f=fixture();let current=structuredClone(book);f.setHandler(async()=>structuredClone(current));await f.service.book();const remove=f.service.addressRemoval('601');current={...current,version:8,records:[{...current.records[0],version:4}]};await f.service.book();await remove();assert.equal(f.requests.at(-1).body.expectedVersion,3);assert.equal(f.requests.at(-1).body.addressBookVersion,7);
 const pending=f.service.addressRemoval('601');f.setOwner('B:2');const before=f.requests.length;await assert.rejects(pending(),/登录状态已变化/);assert.equal(f.requests.length,before);
});
test('frontend never chooses payment outcome, mode or a replacement combine identity',async()=>{
 const f=fixture();f.setHandler(async()=>({trade:{tradeId:'701'},launchReady:true}));await f.service.prepare('701');await f.service.launch('701');await f.service.cancel('701');
 for(const r of f.requests){assert.deepEqual(Object.keys(r.body),['operationId']);assert.match(r.path,/^\/trades\/701\/(payment\/(prepare|launch)|cancel)$/)}
});
test('catalog preserves server paging and cent-to-yuan boundary without frontend resorting',async()=>{
 const f=fixture();f.setHandler(async()=>({records:[product],total:77,page:2,pageSize:20}));const result=await f.service.products({keyword:'测试',sort:'price-desc'},2);assert.equal(result.records[0].price,10.01);assert.equal(result.total,77);assert.equal(f.requests[0].params.page,2);assert.equal(f.requests[0].params.sort,'PRICE_DESC');
});

test('home sections fail independently, hide old recommendations and retry only the requested section',async()=>{
 const f=fixture();f.setHandler(async(method,path)=>{if(path==='/goods')throw Error('private internal connection');if(path==='/catalog')return [{id:'301',name:'测试分类'}];if(path==='/cart')return {items:[line]};throw Error('Unexpected route')});
 const home=await f.service.getHome();assert.equal(home.categories.length,1);assert.equal(home.cartCount,2);assert.equal(home.products.length,0);assert.match(home.sectionErrors.products,/暂未加载/);assert.doesNotMatch(home.sectionErrors.products,/private internal/);assert.equal(home.sectionErrors.cart,undefined);
 const before=f.requests.length;f.setHandler(async()=>({records:[product],total:1,page:1,pageSize:20}));const recovered=await f.service.homeSection('products');assert.equal(recovered.products.length,1);assert.equal(f.requests.length,before+1);assert.equal(f.requests.at(-1).path,'/goods');
 f.setHandler(async()=>{throw new f.Stage2Error('SESSION_INVALID',403)});await assert.rejects(f.service.getHome(),/SESSION_INVALID/);
 const calls=f.requests.length;f.setOwner('anonymous:2');await assert.rejects(f.service.getHome(),/AUTH_REQUIRED/);assert.equal(f.requests.length,calls);
});
test('invalid lines are retained, unselected and removed only in the confirmed range',async()=>{
 const f=fixture();f.setHandler(async()=>({items:[{...line,available:false,reasonCodes:['OUT_OF_STOCK']}]}));const cart=await f.service.getCart();assert.equal(cart.groups.length,0);assert.equal(cart.invalidItems.length,1);await f.service.clearInvalidCart();assert.equal(f.requests.at(-1).body.items.length,1);assert.equal(f.requests.at(-1).body.items[0].id,'501');
});

test('partial stock needs an explicit versioned adjustment and remains unselected after recovery',async()=>{
 const f=fixture();let current={...line,available:false,reasonCodes:['OUT_OF_STOCK'],product:{...product,skus:[{...product.skus[0],quantity:1}]}};
 f.setHandler(async(method,path,body)=>{if(method==='PUT'){assert.equal(body.expectedVersion,0);assert.equal(body.quantity,1);current={...current,quantity:1,version:1,available:true,reasonCodes:[]}}return {items:[current]}});
 const before=await f.service.getCart();assert.equal(before.invalidItems[0].status,'stock-insufficient');assert.equal(before.invalidItems[0].quantity,2);assert.match(before.invalidItems[0].invalidReason,/仅可购买1件/);assert.equal(f.requests.filter(r=>r.method!=='GET').length,0);
 await f.service.updateCartQuantity('501',1);const after=await f.service.getCart();assert.equal(after.invalidItems.length,0);assert.equal(after.groups[0].items[0].quantity,1);assert.equal(after.groups[0].items[0].selected,false);
 current={...current,available:false,reasonCodes:['SKU_DISABLED','OUT_OF_STOCK']};assert.equal((await f.service.getCart()).invalidItems[0].status,'sku-invalid');
});
test('PageResource ignores late successes and late errors from an older identity',async()=>{
 const vue=require('vue');let owner=vue.ref('A'),oldResolve,oldReject;
 const pageSource=fs.readFileSync(new URL('../packages/common/composables/usePageResource.ts',import.meta.url),'utf8'),module={exports:{}};
 vm.runInNewContext(ts.transpileModule(pageSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{module,exports:module.exports,require:id=>id==='vue'?vue:undefined,Array,Error});
 const resource=module.exports;resource.configurePageResourceScope(()=>owner.value);
 const scope=vue.effectScope();let page;
 scope.run(()=>page=resource.usePageResource(()=>new Promise((resolve,reject)=>{oldResolve=resolve;oldReject=reject})));
 const pending=page.load();owner.value='B';oldResolve({private:'A'});await pending;assert.equal(page.data.value,null);
 const second=page.load();owner.value='C';oldReject(Error('private error A'));await second;assert.doesNotMatch(page.errorMessage.value,/private error/);assert.equal(page.data.value,null);scope.stop();
});

test('absent catalog/region selectors are omitted rather than serialized as invalid IDs',async()=>{const f=fixture();f.setHandler(async(method,path)=>path==='/goods'?{records:[],total:0,page:1,pageSize:20}:[]);await f.service.products({});await f.service.regions();assert.equal(Object.hasOwn(f.requests[0].params,'categoryId'),false);assert.equal(Object.hasOwn(f.requests[1].params,'parentId'),false);await f.service.regions('9007199254740993');assert.equal(f.requests[2].params.parentId,'9007199254740993');});
