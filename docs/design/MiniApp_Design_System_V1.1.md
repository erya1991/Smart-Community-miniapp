# 大光路智慧社区小程序 Design System V1.1

> 适用终端：住户小程序、商户小程序
>
> 技术实现：Vue 3 + uni-app / 微信小程序
>
> 视觉版本：V1.1；文档清洗：2026-10-12（PREP-01/C-1）
>
> 参考资产：两批原始 Stitch 视觉资料；可用性以映射表为准，当前 17 张截图有效、1 项直接母版缺失。
>
> 本轮保留品牌、布局和视觉数值，不修改业务源码或原始设计资产。

# 1. 规范定位与使用优先级

本规范负责品牌色、字体、间距、圆角、组件外观、Resident/Merchant Profile 和通用移动交互，不定义业务对象、状态流转、审批角色、权限、交易规则或开发范围。

业务与当前阶段范围读取 [AGENTS.md](../../AGENTS.md) 指向的有效产品及批准方案。本文件中的业务页面和文案只作为 UI 示例，不能转化为字段、权限或状态机授权。

视觉权威顺序：

1. 本 Design System。
2. [微信小程序实现规范](MiniApp_WeChat_Implementation_Guidelines_V1.0.md)。
3. [Stitch 视觉还原规范](Stitch视觉还原规范.md)。
4. [母版映射表](Stitch视觉母版映射表.md) 中确认有效的截图和原始 DESIGN 参考。

项目品牌与主题存在差异时先报告，不借视觉整理改动源码。Stitch 的原始颜色、布局和演示业务不覆盖当前规范。

# 2. 品牌与两端 Profile

## 2.1 项目气质

整体气质：

> **现代、温暖、可信、生活化、克制、自然适老。**

地域感只用于建立南京秦淮、大光路老城社区的生活氛围，不用于制造古风、景区化或政务化界面。

禁止：

- 智慧城市大屏风；
- 政务蓝门户；
- 古风秦淮旅游风；
- 淘宝/美团式高密度促销；
- 赛博科技风；
- PC 管理后台缩小版。

## 2.2 住户端 Resident Profile

关键词：

> 生活感、服务感、亲切、易理解、低到中等信息密度、自然适老。

固定 Bottom Tab：

> **首页｜服务｜商城｜我的**

页面优先级：

```text
当前最重要任务
→ 高频生活入口
→ 业务状态
→ 辅助说明
```

## 2.3 商户端 Merchant Profile

关键词：

> 清晰、高效、任务导向、状态明确、少步骤、中等信息密度。

固定 Bottom Tab：

> **工作台｜经营｜订单｜我的**

页面优先级：

```text
当前状态
→ 待处理任务
→ 下一步操作
→ 核心业务信息
→ 辅助详情
```

两端必须使用同一主色、同一按钮体系、同一卡片及状态语义。

---
## 2.4 Merchant 页面双模式

商户端不是统一的高密度页面。

根据任务性质分为：

### A. Merchant Operational｜高频作业型

适用于：

- 工作台；
- 商品/服务经营列表；
- 订单列表；
- 售后任务列表；
- 高频审核/处理列表；
- 其他需要连续处理多个业务对象的页面。

目标：

> 在有限移动屏幕中，让商户快速识别状态、获取必要信息并执行下一步。

设计原则：

1. 信息密度优先于展示感；
2. 一个卡片原则上代表一个业务对象；
3. 少嵌套卡片；
4. 少大面积说明区；
5. 状态与主操作必须一眼可见；
6. 必要业务字段不能为了“简洁”而删除；
7. 次级说明可折叠、进入详情或降低视觉权重；
8. 优先减少纵向滚动距离；
9. 高频操作不得隐藏到多层菜单；
10. 视觉尺寸与触控热区分离。

### B. Merchant Process｜流程任务型

适用于：

- 商户入驻；
- 主体认证；
- 资质提交；
- 门店编辑；
- 商品新增/编辑；
- 经营资格详情；
- 订单详情；
- 核销；
- 售后处理。

目标：

> 降低填写和决策负担，确保流程清晰、字段完整、错误可恢复。

保持正常移动端密度，不为了压缩空间牺牲：

- 字段可读性；
- 表单分组；
- 状态解释；
- 风险确认；
- Bottom Action；
- 错误反馈。

# 3. Design Tokens

## 3.1 色彩

| Token | 色值 | 用途 |
|---|---|---|
| `color-primary` | `#1B4D53` | 主按钮、Tab 激活、选中态、关键进度 |
| `color-primary-dark` | `#143B40` | 按下态 |
| `color-primary-light` | `#EAF2F3` | 主色浅底 |
| `color-accent` | `#C85A32` | 价格、重点提醒、驳回/需关注 |
| `color-accent-light` | `#FAEEE9` | 暖色浅底 |
| `color-success` | `#2E7256` | 正常、有效、成功、完成 |
| `color-success-light` | `#E8F2ED` | 成功浅底 |
| `color-warning` | `#C76A22` | 待处理、临期、提醒 |
| `color-warning-light` | `#FFF3E8` | 警告浅底 |
| `color-error` | `#BA1A1A` | 错误、高危、失败 |
| `color-error-light` | `#FDECEA` | 错误浅底 |
| `color-text-primary` | `#191C1E` | 主文本 |
| `color-text-secondary` | `#5F6769` | 次级文本 |
| `color-text-disabled` | `#8B9294` | 禁用和低优先级 |
| `color-page-bg` | `#F8F9FC` | 页面背景 |
| `color-card-bg` | `#FFFFFF` | 卡片/表单/底栏 |
| `color-group-bg` | `#F2F4F6` | 分组背景 |
| `color-warm-bg` | `#FAF8F5` | 居民端生活场景局部暖底 |
| `color-border` | `#E1E4E6` | 边框/分隔线 |
| `color-mask` | `rgba(25,28,30,0.40)` | 遮罩 |

约束：

- 核心 CTA、Tab 激活、主要选中态统一使用黛青；
- 商城价格可使用砖赭，但核心 CTA 仍优先主色；
- 状态必须同时有“颜色 + 中文文字”；
- 一个页面不同时使用超过 2 种高饱和强调色；
- 禁止用极浅灰字承载核心信息。

## 3.2 字体

系统字体栈：

```css
font-family: -apple-system, BlinkMacSystemFont, "PingFang SC",
  "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
```

| Token | 字号 | 行高 | 字重 | 用途 |
|---|---:|---:|---:|---|
| `text-page-title` | 22px | 30px | 700 | 一级标题 |
| `text-section-title` | 19px | 28px | 600/700 | 模块标题 |
| `text-card-title` | 17px | 26px | 600 | 卡片/商品/订单标题 |
| `text-body-lg` | 16px | 24px | 400/500 | 核心正文、表单值 |
| `text-body` | 15px | 24px | 400 | 正文 |
| `text-label` | 14px | 20px | 500 | 标签 |
| `text-meta` | 13px | 18px | 400/500 | 时间、次级元信息 |
| `text-price` | 20–24px | 28px | 700 | 价格、退款金额 |
| `text-number-lg` | 28–32px | 36px | 700 | 工作台数字 |

核心交互和列表正文原则上不得低于 15px。

## 3.3 间距

4px 基础网格：

```scss
$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-5: 20px;
$space-6: 24px;
$space-8: 32px;
```

页面：

- 左右边距 16px；
- 卡片内边距 16px；
- 卡片间距 12–16px；
- 大模块间距 20–24px；
- 页面底部必须预留 Bottom Tab / Bottom Action + safe-area。

## 3.4 圆角

| 类型 | 圆角 |
|---|---:|
| 小标签 | 6–8px |
| 输入框/普通按钮 | 10–12px |
| 普通卡片 | 12–14px |
| 大内容卡片 | 16px |
| Bottom Sheet | 20–24px |
| Pill/筛选 | 999px |

标准卡片：

```text
background: #FFFFFF
border: 1px solid #E1E4E6
border-radius: 14px
padding: 16px
shadow: 0 2px 8px rgba(27,77,83,0.04)
```

---
## 3.5 Merchant Operational Density

以下 Token 仅适用于 Merchant Operational 页面。

| 项目 | 建议值 |
|---|---|
| 页面模块间距 | 8–12px |
| 业务卡片间距 | 8–10px |
| 卡片 padding | 12px |
| 普通信息行 | 44–52px |
| Compact Action 视觉高度 | 32–36px |
| Compact Primary 视觉高度 | 36–40px |
| Filter Chip 视觉高度 | 32–36px |
| 实际最小点击热区 | ≥44×44px |
| 列表辅助文字 | 12–13px |
| 列表主文字 | 14–16px |
| 商户一级标题 | 18px / 600 |
| 一级页用户头像视觉尺寸 | 32px |
| 用户头像点击热区 | ≥44px |

注意：

视觉尺寸小于 44px 时，
必须使用 wrapper / hit-area 保证实际触控区域 ≥44px。

禁止为了满足触控尺寸，
把所有按钮、Chip、图标本身都绘制为 44–48px。
## Merchant Operational Card

一个卡片原则上对应一个业务对象：

- 一个商品；
- 一个订单；
- 一个售后；
- 一个待办。

卡片内部按以下优先级排列：

状态 / 标识
→
核心业务对象
→
必要业务字段
→
时效信息
→
主操作

禁止：

- 卡片内部继续嵌套完整 BaseCard；
- 一个状态单独占一大块 Banner；
- 一个辅助说明单独占一个大区域；
- 为对齐高度制造空白；
- 固定高度造成数据少时留白；
- 同一状态在卡片中重复表达多次。

长文本规则：

商品/订单标题：
最多 2 行。

普通辅助信息：
优先 1 行。

异常原因：
默认 1 行摘要，
详情进入详情页或展开查看。

# 4. 页面骨架与安全区

## 4.1 AppPage

所有页面应使用统一页面容器：

```text
AppPage
├─ AppNavbar（按页面需要）
├─ Scroll Content
│  └─ Section / Card / List
└─ AppTabbar 或 BottomActionBar
```

## 4.2 顶部安全区

自定义导航：

- 动态读取 `statusBarHeight`；
- 根据微信胶囊位置计算标题和右侧安全区；
- 不写死机型；
- 不让搜索、消息、标题压到胶囊区域。

## 4.3 底部安全区

固定底栏统一使用：

```css
padding-bottom: calc(var(--bottom-bar-height) + env(safe-area-inset-bottom));
```

不要用固定页面高度模拟安全区。

---

# 5. 导航

## 5.1 住户端

固定：

> 首页｜服务｜商城｜我的

不得调序、改名、增加一级 Tab。

## 5.2 商户端

固定：

> 工作台｜经营｜订单｜我的

一级导航沿用当前双端 App Shell；导航及页面范围调整按经批准的阶段方案执行。

## 5.3 二级页面

交易、表单、详情、售后、核销页面使用返回式导航，不强制显示 Bottom Tab。若显示，必须属于当前端，不得 Resident / Merchant 串端。

---

# 6. 按钮

## 6.1 PrimaryButton

```text
background: #1B4D53
text: #FFFFFF
height: 48px
radius: 12px
font: 16px / 600
pressed: #143B40
```

## 6.2 SecondaryButton

白底 + 主色边框/文字，高度 48px。

## 6.3 QuietButton

浅灰/浅主色底，高度 40–44px，用于编辑、查看、更多。

## 6.4 Danger / Reject

- 驳回、下架等“需关注”动作可使用砖赭；
- 真正删除、高危操作使用 Error 红；
- 卡片内不放 3 个以上同等强调按钮。

---
## 6.5 CompactAction

仅用于 Merchant Operational 高频列表操作。

适用：

- 编辑
- 下架
- 上架
- 查看
- 备货
- 配送
- 核销
- 筛选

视觉高度：

32–36px

字体：

13–14px / 500–600

左右 padding：

12–16px

宽度：

默认按内容自适应，
禁止无必要固定宽度。

触控：

有效点击区域必须 ≥44px。

一个业务卡片建议：

- 1 个主操作；
- 0–2 个次操作。

禁止一行出现 3 个以上等强度主按钮。

# 7. 状态标签

| 类型 | 示例 | 样式 |
|---|---|---|
| Success | 已通过、经营正常、已完成 | 绿色浅底 + 深绿字 |
| Pending | 待审核、待备货、待分账 | 主色/暖色浅底 |
| Processing | 配送中、退款中、资金回退中 | 主色浅底 + 主色字 |
| Rejected/Error | 已驳回、支付失败 | 砖赭/红浅底 |
| Disabled | 已下架、无库存 | 灰底 + 中灰字 |

多个状态维度由业务接口提供时分别展示，避免标签视觉混淆；本规范不定义维度、取值或流转。示例词汇仅用于颜色和文字层级说明。

---

# 8. 公共组件视觉候选

建议公共组件：

```text
AppPage
AppNavbar
AppTabbar
SectionHeader
BaseCard
PrimaryButton
SecondaryButton
QuietButton
StatusTag
EmptyState
SearchBar
QuickEntryGrid
ProductCard
ServiceCard
MerchantInfoCard
OrderStatusHeader
BottomActionBar
FormSection
FormField
SkuEditor
FulfillmentSelector
```

---

# 9. 页面类型与交互模式（V1.1）

## 9.1 MerchantGroupedCart

用途：住户购物车。

结构：

```text
MerchantGroupedCart
├─ MerchantHeader
├─ CartItem[]
├─ InvalidItem[]（可选）
└─ GroupCheckoutBar
```

视觉与交互：

- 以分组标题、商品列表及失效提示区建立清晰层级。
- 选择、数量和错误反馈就近显示，底部摘要保持主次清楚。
- 分组与结算布局按有效需求和服务端契约实现，不在视觉层规定订单拆分或商户数量。

## 9.2 AmountSummary

用于确认订单、订单详情、售后。

推荐字段：

```text
商品金额
配送费（如有）
优惠（仅业务启用时）
实付金额 / 预计退款金额
```

金额区不自行解释“为什么免运费/补贴”，只展示业务计算结果。

## 9.3 FulfillmentChoiceCard

用于确认订单。

视觉与交互：

- 以可区分的选项卡展示接口提供的履约选项。
- 选中态使用品牌色和明确文案，不只依赖颜色。
- 条件输入区按已选项展开，地址或点位信息保持清晰分组。
- 具体方式、可选条件和选择粒度由有效产品及接口契约决定。

## 9.4 StepForm

用于商户入驻等分步骤移动表单。

结构：

```text
StepHeader
StepProgress
FormSection
StepFooter
```

视觉与交互：

- 当前步骤、进度与返回路径清楚，长表单按段组织。
- 主次操作集中在 StepFooter，字段错误就近反馈。
- 可编辑性、保存和提交条件由有效产品及服务端决定，不由视觉示例定义。

## 9.5 QualificationStatusCard

用于经营资格、合作状态等可解释资格页面。

结构：

```text
QualificationSummary
CheckItem[]
ReasonBlock
ActionLink[]
```

视觉示例：

```text
状态摘要
检查项与当前结果
不满足原因
可执行的下一步
```

检查项、结果与允许动作来自有效契约；本规范只约定分组、层级和可解释反馈。

## 9.6 StatusTimeline

用于订单、售后、履约进度。

规则：

- 只展示当前业务实际流程；
- Completed / Current / Pending 三种视觉层级；
- 普通用户文案使用业务语言，不显示后端枚举；
- 当前节点必须最醒目。

## 9.7 VerificationPanel

用于扫码/输码核销。

界面反馈：

- 扫码或手动输入区域、查询中反馈、结果摘要、确认区域和成功/失败反馈保持清楚层级。
- 查询失败时说明原因并提供重新输入或返回路径。
- 完成反馈、可执行动作及数据范围以接口为准；本节不定义核销业务状态机。

## 9.8 EvidenceUploader

用于售后凭证、业务附件。

通用规则：

- 缩略图网格；
- 支持预览和删除；
- 上传中状态；
- 上传失败单项重试；
- 文件数量、类型和大小上限按有效阶段方案传入，界面展示剩余额度；
- 不以视觉稿中的演示数量设定业务限制。

## 9.9 AfterSaleApplyPanel

用于居民售后申请。

信息顺序：

```text
售后商品
→ 售后类型
→ 数量 / 预计退款
→ 原因
→ 问题说明
→ 凭证
→ 提交
```

本节仅约定申请信息的展示顺序、输入分组和错误反馈；类型、数量、金额、字数及附件上限由有效产品与接口契约提供。

## 9.10 AfterSaleDecisionPanel

用于商户售后处理。

信息优先级：

```text
当前待处理
→ 居民申请
→ 商品与金额
→ 证据
→ 原订单
→ 资金状态
→ 同意 / 拒绝 / 平台处理
```

视觉与交互：

- 决策区显示接口提供的可执行动作，使用主次和风险视觉层级区分。
- 长原因和证据可展开，保留可读性与恢复路径。
- 审批角色、允许动作、结果与资金进度均读取有效业务事实，本规范不定义超时或退款规则。

## 9.11 ResultState

用于支付、核销、退款等结果。

结构：

```text
ResultIcon
ResultTitle
ResultDescription
ResultSummary
PrimaryAction
SecondaryAction(optional)
```

结果页必须说明：

- 是否成功；
- 对应业务单；
- 下一步可做什么。

---

# 10. 表单规范

- 标签必须可见；
- 输入高度 48–50px；
- 必填标识清楚；
- 选择器/类目/SKU 用 Bottom Sheet；
- 系统上下文只读；
- 长表单使用 FormSection；
- 提交按钮防重复点击；
- 校验错误尽量定位到字段；
- 校验提示与实际接口结果一致，不用界面反馈替代后端事实。

固定底栏示例：

```text
保存草稿    提交审核
```

示例仅展示主次按钮关系，具体文案、可编辑性和提交条件以有效需求为准。

---

# 11. 列表与详情模式

## 11.1 居民商品卡

视觉示例字段：

- 图片；
- 商品名；
- 商户名；
- 价格；
- 1 个必要履约标签；
- 简单加购。

## 11.2 商户商品卡

视觉示例字段：

- 商品图；
- 名称；
- 规格摘要；
- 审核状态；
- 销售状态；
- 价格；
- 库存；
- 当前允许操作。

## 11.3 订单详情

信息优先级：

```text
当前状态
下一步操作
履约进度
履约对象信息
商品
金额 / 资金状态
售后
订单元信息
```

详情按接口允许展示的信息组织；本节的顺序示例不规定业务字段、权限或流转。

## 11.4 售后详情

居民端优先回答：

```text
现在是什么状态
谁在处理
是否还要我操作
钱退到哪一步
```

商户端优先回答：

```text
居民申请什么
涉及多少钱
为什么申请
我现在要同意、拒绝还是平台处理
```

---

# 12. 页面状态

所有正式页面至少设计：

- loading；
- empty；
- error；
- no-permission；
- disabled / unavailable；
- business-limited；
- submitting / duplicate-submit。

页面不得只实现“有数据的正常态”。

---

# 13. 自然适老

1. 核心文字 ≥ 15px；
2. 主要点击区域 ≥ 44×44px；
3. 主按钮 48px；
4. 图标必须配文字；
5. 状态必须可直接读懂；
6. 空状态给出下一步；
7. 不依赖长按、隐藏手势；
8. 现场电话、地址、核销等高频动作提供明确入口；
9. 无障碍和适老设计只调整交互，不创造产品未授权的业务或角色。

---

# 14. 图片与在地化

可使用：

- 南京老城街巷；
- 梧桐与社区门店；
- 生鲜和生活服务；
- 普通居民生活场景。

禁止：

- 大片古建筑景区照；
- 灯笼/牌坊/卷轴等古风视觉；
- 政务会议、领导视察；
- 泛科技插画。

---



# 15. uni-app / Codex 实现规则

## 15.1 禁止直接复制 Stitch Web 代码

Stitch 输入使用有效截图及原始 DESIGN 参考，不把历史 HTML 当作页面实现模板。

禁止直接复制：

- Tailwind DOM；
- Google Fonts；
- Material Symbols Web 字体；
- H5 hover；
- 固定 viewport 高度；
- 桌面响应式规则。

必须转换为：

- Vue3 + uni-app；
- `view / text / image / scroll-view`；
- 项目现有 icon 能力；
- 小程序 safe-area；
- 可复用组件；
- 项目统一请求层 / store / composable。

## 15.2 样式 Token

共享样式的主要维护位置为 `packages/theme/uni.scss`。以下数值保留为视觉示意，不授权创建另一套 Token；旧示例别名与实际变量名的差异见本节说明。

```scss
$color-primary: #1B4D53;
$color-primary-dark: #143B40;
$color-primary-light: #EAF2F3;
$color-accent: #C85A32;
$color-accent-light: #FAEEE9;
$color-success: #2E7256;
$color-warning: #C76A22;
$color-error: #BA1A1A;

$text-primary: #191C1E;
$text-secondary: #5F6769;
$text-disabled: #8B9294;

$page-bg: #F8F9FC;
$card-bg: #FFFFFF;
$group-bg: #F2F4F6;
$border-color: #E1E4E6;

$radius-sm: 8px;
$radius-md: 12px;
$radius-card: 14px;
$radius-lg: 16px;
$radius-sheet: 24px;

$space-1: 4px;
$space-2: 8px;
$space-3: 12px;
$space-4: 16px;
$space-5: 20px;
$space-6: 24px;
$space-8: 32px;

$page-gutter: 16px;
$button-height: 48px;
$touch-target-min: 44px;
$tabbar-height: 56px;
```

视觉示例中的 `$text-primary/secondary/disabled` 对应源码 `$color-text-primary/secondary/disabled`；`$page-bg/card-bg/group-bg/border-color` 对应 `$color-page-bg/card-bg/group-bg/border`。数值相同，实际引用应复用源码变量，不新增别名。色表中的 `color-mask` 当前没有同名共享 Token；后续如需调整先报告，本轮不改源码。

## 15.3 推荐新增公共组件

V1.1 组件候选：

```text
MerchantGroupedCart
CartItem
GroupCheckoutBar
AmountSummary
FulfillmentChoiceCard
StepForm
StepProgress
QualificationStatusCard
QualificationCheckItem
StatusTimeline
VerificationPanel
VerificationResult
EvidenceUploader
AfterSaleApplyPanel
AfterSaleDecisionPanel
ResultState
```

优先复用已有组件，不要为每张页面重新建相似组件。

---

# 16. Stitch 母版使用原则

Stitch 是页面构图参考，不是业务真源。

开发时：

- 首先使用《Stitch 视觉母版与开发页面映射表》确定母版；
- 没有对应 Stitch 页时，从最接近的“页面类型母版”派生；
- 字段、状态、按钮条件仍以 PRD 为准；
- Stitch 中出现而 PRD 未定义的 Mock 文案、业务字段、时效承诺、渠道名不得直接实现。

---

# 17. 版本冻结

当前视觉基线的调整须有明确任务授权；默认沿用：

- 主品牌色；
- 两端 Bottom Tab；
- 字体体系；
- 页面间距；
- 卡片圆角；
- 主按钮；
- 状态色语义；
- 表单基本模式；
- 订单/售后/资格页面信息层级。

后续已授权页面优先扩展现有组件，不建立第二套视觉系统。

后续只有在出现**新的通用页面模式**时，Design System 才升级版本。
