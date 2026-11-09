import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const compile=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
function moduleFor(source,resolver,uni={}){const m={exports:{}};new Function('require','module','exports','uni',compile(source))(resolver,m,m.exports,uni);return m.exports;}
function fixture(){let resolve,identity='member-A:revision-1';const state={authenticated:true,profile:null},response=new Promise(r=>{resolve=r}),client=moduleFor(fs.readFileSync(new URL('../packages/business-common/stage3/client.ts',import.meta.url),'utf8'),()=>{throw Error('Unexpected import')});
 const source=fs.readFileSync(new URL('../apps/resident-miniapp/src/services/stage3.ts',import.meta.url),'utf8').replaceAll('import.meta.env.VITE_STAGE3_ENABLED',"'true'").replaceAll('import.meta.env.VITE_RESIDENT_API_BASE_URL',"'https://stage45.invalid/api'");
 const service=moduleFor(source,id=>id.includes('stage3/client')?client:{residentBusinessOwner:()=>identity,residentBusinessRequest:()=>response,useResidentContext:()=>({state})},{getStorageSync(){},setStorageSync(){},removeStorageSync(){}});
 return{api:service.stage3Api,state,identity:v=>{identity=v},complete:()=>resolve({status:200,data:{success:true,code:'SUCCESS',result:{records:[],total:0,pageNumber:1,pageSize:20}}})};
}
test('normal profile loading completion keeps the same resident order request valid',async()=>{const f=fixture(),read=f.api.list({});f.state.profile={memberId:'member-A'};f.complete();assert.equal((await read).total,0);});
test('real member/session replacement rejects late private order response',async()=>{const f=fixture(),read=f.api.list({});f.identity('member-B:revision-2');f.state.profile={memberId:'member-B'};f.complete();await assert.rejects(read,e=>e.code==='STALE_OPERATION');});
test('logout revision rejects late private order response',async()=>{const f=fixture(),read=f.api.list({});f.identity('anonymous:revision-3');f.state.authenticated=false;f.complete();await assert.rejects(read,e=>e.code==='STALE_OPERATION');});
