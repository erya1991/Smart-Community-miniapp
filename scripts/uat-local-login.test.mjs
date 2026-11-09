import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const credentials={username:'synthetic_person',password:'synthetic-password',uuid:'synthetic-captcha-12345'};
const success=result=>({status:200,data:{success:true,code:200,result}});
function fixture(app,enabled=true,origin){
 const source=fs.readFileSync(new URL('../apps/'+app+'-miniapp/src/services/'+app+'-session.ts',import.meta.url),'utf8'),module={exports:{}};
 new Function('module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(module,module.exports);
 const calls=[],storage=new Map(),Class=module.exports[app==='resident'?'ResidentSessionClient':'MerchantSessionClient'],kind=app==='resident'?'RESIDENT':'APPLICANT',sid='a'.repeat(32),now=10000;
 const token=use=>kind==='RESIDENT'?'aaa.bbb.'+use:'s0o1.'+sid+'.'+use+'.'+'b'.repeat(43);
 const login=success({identity:kind,memberId:'101',role:null,source:'UAT_SYNTHETIC',session:{sid,accessToken:token('ACCESS'),refreshToken:token('REFRESH'),accessExpiresAt:20000,absoluteExpiresAt:1000000}});
 let handler=async input=>input.path.endsWith('/login')?login:success(app==='resident'?{memberId:'101',nickname:null,avatar:null,maskedMobile:null,phoneBound:false,version:0,updatedAt:null}:{identity:'APPLICANT',memberId:'101',access:'RESTRICTED',nextAction:'SHOW_APPLICATION_ENTRY'});
 const client=new Class({baseUrl:origin??'https://127.0.0.1:'+(app==='resident'?'19794':'19793')+'/api',localTestLoginEnabled:enabled,now:()=>now,storage:{get:k=>storage.get(k),set:(k,v)=>storage.set(k,v),remove:k=>storage.delete(k)},request:async input=>{calls.push(input);return handler(input)}});
 return{client,calls,storage,login,set:fn=>handler=fn};
}
for(const app of ['resident','merchant']){
 test(app+' local login disabled or foreign origin sends no credentials',async()=>{for(const f of [fixture(app,false),fixture(app,true,'https://foreign.invalid/api')]){await assert.rejects(f.client.localLogin(credentials),e=>e.code==='UAT_LOGIN_DISABLED');assert.equal(f.calls.length,0)}});
 test(app+' local login validates ordinary server session and retrieves own identity',async()=>{const f=fixture(app);const identity=await f.client.localLogin(credentials);assert.equal(identity.memberId,'101');assert.equal(f.calls.length,2);assert.deepEqual(f.calls[0].body,{username:credentials.username,password:credentials.password});assert.equal(f.calls[0].headers.uuid,credentials.uuid);assert.ok(f.calls[1].accessToken);assert.ok(!JSON.stringify([...f.storage.values()]).includes(credentials.password))});
 test(app+' local login refuses unmarked response and cannot restore old credentials',async()=>{const f=fixture(app);await f.client.localLogin(credentials);delete f.login.data.result.source;await assert.rejects(f.client.localLogin(credentials));assert.equal(f.client.authenticated,false);assert.equal(f.storage.size,0)});
 test(app+' late local login cannot resurrect session after logout',async()=>{const f=fixture(app);let finish;f.set(()=>new Promise(resolve=>finish=resolve));const pending=f.client.localLogin(credentials);await new Promise(r=>setImmediate(r));await f.client.logout();finish(f.login);await assert.rejects(pending,e=>e.code==='STALE_OPERATION');assert.equal(f.client.authenticated,false);assert.equal(f.storage.size,0)});
}
