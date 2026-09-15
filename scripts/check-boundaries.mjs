import { existsSync, readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const pagesFor = (app) => JSON.parse(read(`apps/${app}/src/pages.json`)).pages.map((item) => `/${item.path}`)
const hasOnlyPages = (actual, expected) => actual.length === expected.length && expected.every((path) => actual.includes(path))

const residentPages = [
  '/pages/home/index',
  '/pages/service/index',
  '/pages/mall/index',
  '/pages/profile/index',
]
const merchantPages = [
  '/pages/workbench/index',
  '/pages/operation/index',
  '/pages/order/index',
  '/pages/profile/index',
]

const residentNavigation = read('apps/resident-miniapp/src/config/navigation.ts')
const merchantNavigation = read('apps/merchant-miniapp/src/config/navigation.ts')
const sharedTabbar = read('packages/ui/components/AppTabbar.vue')
const theme = read('packages/theme/uni.scss')
const residentAdapter = read('apps/resident-miniapp/src/adapters/mock.ts')
const merchantAdapter = read('apps/merchant-miniapp/src/adapters/mock.ts')
const legacySingleAppExists = existsSync(new URL('../src/pages.json', import.meta.url))

const assertions = [
  [hasOnlyPages(pagesFor('resident-miniapp'), residentPages), '住户 App 仅注册四个住户一级页面'],
  [hasOnlyPages(pagesFor('merchant-miniapp'), merchantPages), '商户 App 仅注册四个商户一级页面'],
  [residentNavigation.includes("label: '首页'") && residentNavigation.includes("label: '服务'") && residentNavigation.includes("label: '商城'") && residentNavigation.includes("label: '我的'") && !residentNavigation.includes('merchant'), '住户导航固定且无商户入口'],
  [merchantNavigation.includes("label: '工作台'") && merchantNavigation.includes("label: '经营'") && merchantNavigation.includes("label: '订单'") && merchantNavigation.includes("label: '我的'") && !merchantNavigation.includes('resident'), '商户导航固定且无住户入口'],
  [sharedTabbar.includes('items: NavItem[]') && !sharedTabbar.includes('AppProfile') && !sharedTabbar.includes('navigationByProfile'), 'Tabbar 仅渲染端级传入导航，不依赖角色切换'],
  [theme.includes('$color-primary: #1b4d53;'), 'Design System 主色仅在共享 Theme 中维护'],
  [theme.includes('$tabbar-height: 56px;') && theme.includes('$touch-target-min: 44px;'), '底栏与触控尺寸 Token 已落地'],
  [residentAdapter.includes('residentMockAdapter') && !residentAdapter.includes('merchant'), '住户 App 只接入住户 Mock Adapter'],
  [merchantAdapter.includes('merchantMockAdapter') && !merchantAdapter.includes('resident'), '商户 App 只接入商户 Mock Adapter'],
  [!legacySingleAppExists, '旧单 App pages.json 已移除'],
]

const failed = assertions.filter(([ok]) => !ok)
for (const [ok, label] of assertions) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`)
}
if (failed.length) process.exit(1)
