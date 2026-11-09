import fs from 'node:fs'
import path from 'node:path'
import {normalizePath,type Plugin} from 'vite'
/** Canonical Stage45 components get in-app virtual IDs for uni MP component registration. */
export function stage45MpComponents(appRoot:string,sharedRoot:string,enabled:boolean):Plugin|undefined{
 if(!enabled)return
 const local=normalizePath(path.join(appRoot,'src/__stage45_shared')),canonical=path.join(sharedRoot,'ui/components/stage45')
 const names=new Set(fs.readdirSync(canonical).filter(n=>n.endsWith('.vue')))
 return {name:'stage45-mp-component-entry',enforce:'pre',
 resolveId(source,importer){const parent=importer&&normalizePath(importer.split('?')[0]);const id=normalizePath(source.startsWith('./')&&parent?.startsWith(local+'/')?path.resolve(path.dirname(parent),source):source);if(id.startsWith(local+'/')&&names.has(path.basename(id)))return id},
 load(id){const normalized=normalizePath(id);if(!normalized.startsWith(local+'/')||!names.has(path.basename(normalized)))return
 return fs.readFileSync(path.join(canonical,path.basename(normalized)),'utf8')
 .replaceAll("from '../../../business-common/","from '@shared/business-common/")
 .replace(/from '\.\.\/([A-Za-z0-9]+\.vue)'/g,"from '@/components/$1'")
 .replaceAll("@import './stage45.scss'","@import '"+normalizePath(path.join(canonical,'stage45.scss'))+"'")
 }}
}
