import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { parse } = require('@vue/compiler-sfc')
const { createSSRApp } = require('vue')
const { renderToString } = require('@vue/server-renderer')

// Render the actual template with the WeChat conditional blocks, without an API or session.
async function render(file, profileBasicOnly, authenticated) {
  const { descriptor } = parse(fs.readFileSync(new URL('../apps/resident-miniapp/src/pages/profile/' + file, import.meta.url), 'utf8'))
  const template = descriptor.template.content
    .replace(/<!-- #ifndef MP-WEIXIN -->[\s\S]*?<!-- #endif -->/g, '')
    .replace(/<!-- #ifdef H5 -->[\s\S]*?<!-- #endif -->/g, '')
  const profile = { nickname: '测试住户', avatar: '', phoneBound: false, version: 0 }
  const context = {
    profileBasicOnly, state: { authenticated, profile: authenticated ? profile : null, busy: false, loading: false, error: '', notice: '', linkRequired: false },
    avatarFailed: false, groups: [], showUnavailable: false, navigationError: false, isWechat: true,
    localTestLoginEnabled: false, stage2Enabled: true, residentTabItems: [],
    nickname: '测试住户', nicknameError: '', localNotice: '', outdated: false, dirty: true, version: 0,
  }
  const app = createSSRApp({ template, setup: () => context })
  app.config.compilerOptions.isCustomElement = tag => ['view', 'text', 'image'].includes(tag)
  for (const name of ['AppPage', 'AppNavbar', 'AppTabbar', 'BaseCard', 'FeatureUnavailable', 'SectionHeader', 'AppIcon', 'IconContainer', 'FormField'])
    app.component(name, { template: '<div><slot/><slot name="navbar"/></div>' })
  return renderToString(app)
}

test('company anonymous profile shows basic WeChat login without phone authorization', async () => {
  const html = await render('index.vue', true, false)
  assert.match(html, /profile-button--primary[^>]*>微信登录<\/button>/)
  assert.doesNotMatch(html, /getPhoneNumber|微信手机号快捷登录|绑定微信手机号/)
  assert.match(html, /无需绑定手机号/)
})

test('company authenticated profile keeps nickname edit and removes phone and avatar actions', async () => {
  const profile = await render('index.vue', true, true)
  assert.match(profile, /点击编辑昵称/)
  assert.doesNotMatch(profile, /getPhoneNumber|更换微信手机号|点击编辑昵称与头像/)
  const edit = await render('edit.vue', true, true)
  assert.match(edit, /保存昵称/)
  assert.match(edit, /当前测试版暂不支持更换头像/)
  assert.doesNotMatch(edit, /选择图片并保存头像/)
})

test('other builds retain existing optional phone and avatar actions', async () => {
  assert.match(await render('index.vue', false, false), /getPhoneNumber/)
  assert.match(await render('index.vue', false, true), /绑定微信手机号/)
  assert.match(await render('edit.vue', false, true), /选择图片并保存头像/)
})
