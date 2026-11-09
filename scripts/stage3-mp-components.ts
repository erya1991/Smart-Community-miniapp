import fs from 'node:fs'
import path from 'node:path'
import {normalizePath,type Plugin} from 'vite'

/** uni MP requires component entry IDs inside UNI_INPUT_DIR. Load canonical SFCs through local virtual IDs. */
export function stage3MpComponents(appRoot:string,sharedRoot:string,enabled:boolean):Plugin|undefined{
 if(!enabled)return
 const local=normalizePath(path.join(appRoot,'src/__stage3_shared')),canonical=path.join(sharedRoot,'ui/components/stage3')
 const names=new Set(['OrderList.vue','OrderDetail.vue','Credential.vue','Verification.vue','Messages.vue','Workbench.vue'])
 return {name:'stage3-mp-component-entry',enforce:'pre',
  resolveId(source){const id=normalizePath(source);if(id.startsWith(local+'/')&&names.has(path.basename(id)))return id},
  load(id){const normalized=normalizePath(id);if(!normalized.startsWith(local+'/')||!names.has(path.basename(normalized)))return
   return fs.readFileSync(path.join(canonical,path.basename(normalized)),'utf8')
    .replaceAll("from '../../../business-common/","from '@shared/business-common/")
    .replace(/from '\.\.\/([A-Za-z0-9]+\.vue)'/g,"from '@/components/$1'")
  }}
}
