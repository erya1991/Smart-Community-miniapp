import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {wechatTestConfig} from './wechat-test-build-config.mjs';

const [app,...extra]=process.argv.slice(2);
if(extra.length)throw new Error('用法: node scripts/build-wechat-test.mjs resident|merchant');
const config=wechatTestConfig(app,process.env),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project=path.join(root,'apps',app+'-miniapp'),output=path.join(root,'dist','wechat-test',app);
const cli=path.join(root,'node_modules','@dcloudio','vite-plugin-uni','bin','uni.js');
if(!fs.existsSync(cli))throw new Error('请先按 lockfile 安装依赖');
const env={...process.env,UNI_PLATFORM:'mp-weixin',UNI_INPUT_DIR:path.join(project,'src'),UNI_OUTPUT_DIR:output,
  VITE_STAGE1_ENABLED:'true',VITE_STAGE2_ENABLED:app==='resident'?'true':'false',VITE_STAGE3_ENABLED:'true',VITE_STAGE45_ENABLED:'true',VITE_UAT_TEST_LOGIN:'false',
  [config.apiName]:config.api};
const result=spawnSync(process.execPath,[cli,'build','-p','mp-weixin','--config',path.join(project,'vite.config.ts')],{cwd:project,env,stdio:'inherit'});
if(result.error)throw result.error;if(result.status!==0)process.exit(result.status??1);
const file=path.join(output,'project.config.json');
const settings=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
settings.appid=config.appId;settings.projectname=`DGL-${app}-wechat-test`;settings.setting={...settings.setting,urlCheck:true};
fs.writeFileSync(file,JSON.stringify(settings,null,2)+'\n');
console.log(`开发测试包已构建：${output}。请在微信开发者工具中检查域名、真实登录和设备访问；不能据构建成功判定联调通过。`);
