import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),postcss=require('postcss'),selectorParser=require('postcss-selector-parser');
const {parse}=require('@vue/compiler-sfc'),{baseParse}=require('@vue/compiler-dom');
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const component=name=>parse(fs.readFileSync(path.join(repo,'apps/merchant-miniapp/src/components/stage1',name+'.vue'),'utf8')).descriptor;
function unsupportedSelectors(css){const bad=[];postcss.parse(css).walkRules(rule=>{selectorParser(ast=>{ast.walkUniversals(()=>bad.push(rule.selector));ast.walkPseudos(node=>{if(![':last-child',':first-child',':nth-child'].includes(node.value)||node.parent?.parent?.type==='pseudo')return;const previous=node.prev();if(!previous||previous.type==='combinator')bad.push(rule.selector);});}).processSync(rule.selector)});return bad;}
function withClass(ast,name){const nodes=[];function visit(node){if(node.type===1&&node.props.some(p=>p.type===6&&p.name==='class'&&p.value?.content.split(/\s+/).includes(name)))nodes.push(node);for(const child of node.children||[])visit(child)}visit(ast);return nodes;}
test('regression guard identifies the exact universal selectors rejected by WeChat',()=>{
 assert.deepEqual(unsupportedSelectors('.s1-steps>*.data-v-id{flex:1}.s1-actions>*,.s1-pages>button{flex:1}'),['.s1-steps>*.data-v-id','.s1-actions>*,.s1-pages>button']);
 assert.deepEqual(unsupportedSelectors('.s1-step{flex:1}.s1-action,.s1-pages>button{flex:1}'),[]);
 assert.deepEqual(unsupportedSelectors('.s1-tools.data-v-id>:last-child{width:auto}'),['.s1-tools.data-v-id>:last-child']);
 assert.deepEqual(unsupportedSelectors('.s1-create{width:auto}.item:last-child{color:red}'),[]);
 assert.deepEqual(unsupportedSelectors('.item:not(:last-child):after{color:red}'),[]);
});
test('actual application and products styles contain no universal selectors',()=>{
 for(const name of ['Application','Products'])for(const style of component(name).styles)assert.deepEqual(unsupportedSelectors(style.content),[],name);
});
test('actual action templates retain explicit flex hooks on every existing button',()=>{
 for(const [name,parent,hook,count] of [['Application','s1-steps','s1-step',2],['Products','s1-actions','s1-action',3]]){
  const ast=baseParse(component(name).template.content),containers=withClass(ast,parent);assert.equal(containers.length,1);
  const children=containers[0].children.filter(n=>n.type===1);assert.equal(children.length,count);
  for(const node of children){assert.equal(node.tag,'AppButton');assert.equal(withClass(node,hook)[0],node);assert.ok(node.props.some(p=>p.type===7&&p.name==='on'&&p.arg?.content==='click'));}
 }
 const create=withClass(baseParse(component('Products').template.content),'s1-create');assert.equal(create.length,1);assert.equal(create[0].tag,'AppButton');assert.ok(create[0].props.some(p=>p.type===7&&p.name==='if'&&p.exp?.content==="p.has('goods.write')"));
});
test('actual generated dual-WeChat WXSS has no universal-selector compile blocker',()=>{
 const build=process.env.DGL_WECHAT_STYLE_BUILD;assert.ok(build,'Set DGL_WECHAT_STYLE_BUILD to the independently generated dual build');
 const all=[];function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else if(p.endsWith('.wxss'))all.push(p)}}
 for(const app of ['merchant','resident'])visit(path.join(build,app,'mp-weixin'));assert.ok(all.length>=100);
 for(const file of all)assert.deepEqual(unsupportedSelectors(fs.readFileSync(file,'utf8')),[],path.relative(build,file));
});
