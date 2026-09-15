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

## 已验证

- 双端 TypeScript/Vue 类型检查通过；边界检查通过。
- 双端 mp-weixin 构建通过，且 `app.json` 页面清单互相隔离。
- 已保留住户首页既有视觉页面、Mock 摄影资源与共享组件样式。

构建会输出 Sass legacy API / `@import` 弃用警告，不影响当前构建成功。
