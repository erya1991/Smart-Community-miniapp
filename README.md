# 大光路智慧社区小程序

Vue 3 + uni-app 工作区，包含两个独立构建、独立发布的微信小程序：住户端与商户端。当前全部展示数据均为 Mock，未接入真实登录、RuoYi-Vue-Pro 接口、权限、支付或微信发布。

## 结构

```text
apps/resident-miniapp/   # 首页｜服务｜商城｜我的
apps/merchant-miniapp/   # 工作台｜经营｜订单｜我的
packages/theme/          # 唯一 Design Token 与全局样式
packages/ui/             # 唯一公共组件与 SVG 图标
packages/common/         # 类型、Project 上下文工厂、工具、加载状态
packages/business-common/# 端级 Mock 适配器
```

两个 App 都通过本地链接引用 `packages` 的同一份源码；不以登录角色决定一级导航。住户首页摄影 Mock 仅在住户端静态资源中，商户端不会打包。

## 命令

```powershell
npm.cmd install --cache .npm-cache
npm.cmd run dev:resident:mp-weixin
npm.cmd run dev:merchant:mp-weixin
npm.cmd run build:resident:mp-weixin
npm.cmd run build:merchant:mp-weixin
npm.cmd run type-check
npm.cmd run check:boundaries
```

产物分别位于 `apps/resident-miniapp/dist/build/mp-weixin` 和 `apps/merchant-miniapp/dist/build/mp-weixin`。两份 `src/manifest.json` 的微信 AppID 仍为空，项目方配置后才能导入对应微信主体发布。

## 阶段 01.6 视觉收口

- 已按 Stitch 母版完成住户服务、商城、我的，以及商户工作台、经营、订单、我的的一级视觉骨架收口；住户首页继续作为冻结视觉基准。
- 公共层统一收口了页面背景、卡片边界/轻阴影、标题层级、商户导航头和 `FeatureUnavailable` 底部反馈；未开发入口不扩展业务，只在点击后进入统一不可用反馈。
- 商户订单采用 B1-_4 + B1-_6 的 L2 组合，商户我的采用 B2-_10 + B2-_3 的 L2 组合；没有进入阶段 02，也没有新增阶段 02 业务页面或路由。
- 直接 Stitch 对照已完成；住户端与商户端均已在 390×844 窄屏 H5 预览中取得八张有效运行画面（含住户首页回归），并核对商品图片、页面背景、底栏与公共导航。微信开发者工具/真机仍需项目方完成最终设备验收。
- 本轮最小修复已补齐两个 BaseCard 注册缺口、Stitch 商品图本地资源、公共导航安全区与无效返回保护、商户资质入口与资格摘要、入口反馈及筛选计数；没有新增阶段 02 业务。

## 已验证

- `npm.cmd run type-check:resident`、`npm.cmd run type-check:merchant` 通过；边界检查通过。
- 双端 mp-weixin 构建通过，且 `app.json` 页面清单互相隔离。
- 双端 H5 发布构建通过；`node scripts/check-visual-shell.mjs` 通过图片资源、计数、资格入口、组件注册和范围守卫检查。
- 已保留住户首页既有视觉页面、Mock 摄影资源与共享组件样式。

构建会输出 Sass legacy API / `@import` 弃用警告，不影响当前构建成功。
