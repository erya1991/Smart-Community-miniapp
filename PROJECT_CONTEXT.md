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
- 最终最小修复已完成商户经营局部按钮/筛选尺寸与 44px 点击热区、资金摘要子项选择器、商户导航身份入口、商品卡加购热区、两端一级“我的”导航语义和商城中性文案调整；未修改全局主 CTA 规范或页面业务结构。
- Stitch `screen.png` 已逐页直读对照；住户首页、住户服务/商城/我的、商户工作台/经营/订单/我的共八张页面已在 390×844 H5 窄屏取得有效运行画面并完成首页回归核对。微信开发者工具/真机视觉验收仍由项目方完成。

## 阶段 01.7 商户 Compact Density

- 本轮仅调整商户端 `/pages/workbench/index`、`/pages/operation/index`、`/pages/order/index`；商户“我的”和住户端页面不改动，一级导航、路由和 Mock 契约不扩展。
- 商户一级高频页使用 `AppNavbar compact show-user`；`compact` 仅为可选样式，不传入时保留既有导航、头像和标题视觉。`MerchantInfoCard compact` 仅用于工作台，保留商户、门店、项目、经营状态和营业时段字段。
- 商户高频小按钮/筛选芯片视觉高度为 36px，外层点击区域至少 `$touch-target-min`（44px）；不得改动全局 `AppButton` 48px 主 CTA。
- 工作台优先展示待办、快捷操作和合并后的经营概览；经营页商品卡保留图片、名称、类目/说明、双状态、价格、库存和当前操作；订单卡保留订单号、状态、商品摘要、客户、数量、履约方式、下单时间、承诺时间和金额。未实现操作仍进入 `FeatureUnavailable`。
- 阶段 02 的真实商品、订单、履约、支付和接口能力仍未开发；当前均为端级 Mock 展示与正式页面壳层。
