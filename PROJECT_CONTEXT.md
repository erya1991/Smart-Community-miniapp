# 大光路智慧社区小程序项目上下文

## 应用边界

- 住户端与商户端是两个独立微信小程序，不得通过 `AppProfile`、登录角色或运行时条件切换一级 Tab。
- 住户端固定：`首页｜服务｜商城｜我的`；仅注册住户页面。
- 商户端固定：`工作台｜经营｜订单｜我的`；仅注册商户页面。
- 每端拥有自己的 `App.vue`、`main.ts`、`manifest.json`、`pages.json`、构建命令和 mp-weixin 产物。

## 共享与上下文

- 唯一 Theme、UI、类型、工具和通用 Mock 契约位于 `packages/`，不得复制第二套组件或 Token。
- Resident 上下文：`currentProject`、`currentMember`。
- Merchant 上下文：`currentProject`、`currentOperator`、`currentStore`、`currentMerchantStaff`。
- Project 不等于 Tenant；当前默认大光路项目只是 Mock 初始化值。
- Mock 必须走端级 Adapter；P2–P5 未定义业务仍只提供统一不可用反馈。

## 验收规则

- `npm.cmd run check:boundaries` 必须确认页面、导航、Adapter 与旧单 App 路由隔离。
- 分别构建两个 mp-weixin 产物；不可把单次编译等同于微信发布或真实接口验收。
- Stitch 页面继续以 `screen.png` 为视觉基准；本次架构调整不得损坏既有住户首页视觉。

## 阶段 01.6 当前状态

- 住户服务、商城、我的与商户工作台、经营、订单、我的已完成一级骨架视觉收口；住户首页保持冻结。
- 共享组件已统一页面背景、卡片轻层次、导航标题、标题栏与 `FeatureUnavailable` 反馈层；未开发入口不扩展业务能力。
- 商户订单与商户我的按 L2 母版组合实现，未新增阶段 02 路由或业务页面。
- 本轮最小修复已补齐两个 BaseCard 注册缺口、本地 Stitch 商品图片、公共导航安全区与无效返回保护、商户资质入口与资格摘要、统一不可用反馈和筛选计数；未扩展阶段 02 业务。
- Stitch `screen.png` 已逐页直读对照；住户首页、住户服务/商城/我的、商户工作台/经营/订单/我的共八张页面已在 390×844 H5 窄屏取得有效运行画面并完成首页回归核对。微信开发者工具/真机视觉验收仍由项目方完成。
