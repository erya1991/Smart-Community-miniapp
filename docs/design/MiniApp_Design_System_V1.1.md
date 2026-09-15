# 大光路智慧社区小程序 Design System V1.1

> 适用项目：大光路智慧社区数字化运营平台 V1.0  
> 适用终端：住户小程序、商户小程序  
> 技术实现：微信小程序 / uni-app（优先适配 yudao-mall-uniapp）  
> 主要使用对象：产品、前端研发、测试、Codex 代码生成  
> 版本日期：2026-09-11  
> 视觉基线：第一批 8 张 Stitch 最终母版 + 第二批 10 张 Stitch 最终母版  
> 业务基线：  
> - 《01｜平台基础模型、商户入驻与合作关系产品需求详细设计 V1.2》  
> - 《02｜社区商城完整闭环产品需求详细设计 V1.0》  
> 版本定位：**面向 Codex / uni-app 的正式前端设计规范。不是 Stitch 的 DESIGN.md。**

---

# 1. 规范定位与使用优先级

## 1.1 目标

本规范用于解决“Codex 生成出来的两端小程序如何保持同一视觉语言、同一组件体系和同一移动端交互规则”。

它负责：

- 视觉 Design Token；
- 移动端布局和安全区；
- 公共组件及页面结构；
- Resident / Merchant 两端 Profile；
- 复杂表单、资格状态、订单、核销、售后等通用页面模式；
- uni-app 实现约束；
- Codex 生成边界。

它**不负责重新定义业务规则**。

## 1.2 读取优先级

Codex 或前端研发执行页面开发时，统一遵循：

```text
1. 最新产品详细设计 —— 决定业务对象、字段、状态、权限和流程
2. 页面实施清单 —— 决定本次需要实现哪些页面、当前开发状态和入口
3. 本 Design System V1.1 —— 决定视觉、组件和通用交互
4. Stitch 最终母版 —— 决定构图、信息层级和视觉参考
5. yudao-mall-uniapp / 现有公共组件 —— 决定技术复用
6. Codex 自主补全 —— 仅允许补实现细节
```

冲突处理：

> **业务服从 PRD；页面范围服从实施清单；视觉服从 Design System；Stitch 只作视觉母版，不覆盖 PRD。**

---

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

“经营”承载商品，后续 P2 继续承载服务经营，不改成“商品”。

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

# 7. 状态标签

| 类型 | 示例 | 样式 |
|---|---|---|
| Success | 已通过、经营正常、已完成 | 绿色浅底 + 深绿字 |
| Pending | 待审核、待备货、待分账 | 主色/暖色浅底 |
| Processing | 配送中、退款中、资金回退中 | 主色浅底 + 主色字 |
| Rejected/Error | 已驳回、支付失败 | 砖赭/红浅底 |
| Disabled | 已下架、无库存 | 灰底 + 中灰字 |

商品必须双状态：

```text
审核状态：草稿 / 待审核 / 已驳回 / 已通过
销售状态：未上架 / 销售中 / 已下架
```

禁止用一个“商品状态”覆盖两个维度。

---

# 8. 第一批已冻结组件

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

# 9. 第二批新增组件（V1.1）

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

规则：

- 购物车可以多商户；
- 一次结算只允许一个商户；
- 不生成跨商户总订单；
- 失效商品不可勾选结算；
- 商品下架、SKU 失效、库存不足使用统一 Invalid 状态。

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

支持：

- 商户配送；
- 社区自提；
- 到店核销。

规则：

- 只显示当前订单实际支持的方式；
- 每次订单只选择一种；
- 选择后动态显示地址 / 自提点 / 门店信息；
- 不硬编码所有商品都支持三种方式。

## 9.4 StepForm

用于商户入驻等分步骤移动表单。

结构：

```text
StepHeader
StepProgress
FormSection
StepFooter
```

规则：

- 支持保存草稿；
- 当前步骤可回退；
- 提交审核前统一完成校验；
- 待审核/已通过只读；
- 不用长 PC 表单一次铺满。

## 9.5 QualificationStatusCard

用于经营资格、合作状态等可解释资格页面。

结构：

```text
QualificationSummary
CheckItem[]
ReasonBlock
ActionLink[]
```

示例：

```text
业务经营资格：有效
主体状态 ✓
必要资质 ✓
合作协议 ✓
项目合作 ✓
经营授权 ✓
```

业务经营资格与正式交易资格必须分区展示，资金异常不得把主体/业务资格显示成审核失败。

## 9.6 StatusTimeline

用于订单、售后、履约进度。

规则：

- 只展示当前业务实际流程；
- Completed / Current / Pending 三种视觉层级；
- 普通用户文案使用业务语言，不显示后端枚举；
- 当前节点必须最醒目。

## 9.7 VerificationPanel

用于扫码/输码核销。

状态机：

```text
idle
→ scanning / manual-input
→ matched-confirm
→ success

任一步也可进入 error
```

错误至少覆盖：

- 凭证不存在；
- 已核销；
- 已失效；
- 当前订单不可核销；
- 非本门店；
- 无核销权限。

扫码识别后不得自动核销，必须先展示订单并人工确认。

## 9.8 EvidenceUploader

用于售后凭证、业务附件。

通用规则：

- 缩略图网格；
- 支持预览和删除；
- 上传中状态；
- 上传失败单项重试；
- 售后凭证按 PRD 最多 9 张；
- 不使用 Stitch Mock 数量覆盖 PRD。

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

当前商城规则：

- 问题说明最多 500 字；
- 图片最多 9 张；
- 售后类型由订单阶段控制；
- 不写死商户 24 小时处理；
- 不假设超时自动退款。

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

规则：

- 一期默认商户处理超时只提醒，不自动同意；
- 同意后进入“资金与退款处理流程”；
- 已分账场景可进入“资金回退处理中”；
- 不在页面执行或暴露微信分账 API。

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
- 后端必须二次校验。

固定底栏示例：

```text
保存草稿    提交审核
```

不得改成“立即发布 / 直接销售”。

---

# 11. 列表与详情模式

## 11.1 居民商品卡

仅默认保留：

- 图片；
- 商品名；
- 商户名；
- 价格；
- 1 个必要履约标签；
- 简单加购。

## 11.2 商户商品卡

至少：

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

订单详情只展示当前订单实际履约方式。

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
9. 不因为“适老”创造网格员代购、街道代办等未经 PRD 定义的业务。

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

# 15. 业务硬约束（来自当前 01 / 02 PRD）

## 15.1 审核角色

统一：

> 平台审核 / 平台审核人员

禁止视觉稿自行创造街道审核、网格审核、工作站审核。

## 15.2 商品流程

```text
创建商品
→ 保存草稿
→ 提交平台审核
→ 审核通过
→ 上架
```

## 15.3 一订单一商户

购物车可多商户，但一次结算只能一个商户，分别生成订单。

## 15.4 履约

一期商城：

- 商户配送；
- 社区自提；
- 到店核销。

## 15.5 两层资格

```text
业务经营资格
≠
正式交易资格
```

正式交易资格由业务资格、资金接入及必要交易条件共同决定。

## 15.6 售后

- 居民说明最多 500 字；
- 凭证图片最多 9 张；
- 商户处理超时可提醒，一期默认不自动同意；
- 页面只表达统一资金状态，不暴露微信内部渠道流程。

---

# 16. uni-app / Codex 实现规则

## 16.1 禁止直接复制 Stitch Web 代码

Stitch `code.html` 仅用于视觉参考。

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

## 16.2 样式 Token

建议落地 `uni.scss` 或统一 theme 文件：

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

## 16.3 推荐新增公共组件

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

# 17. Stitch 母版使用原则

Stitch 是页面构图参考，不是业务真源。

开发时：

- 首先使用《Stitch 视觉母版与开发页面映射表》确定母版；
- 没有对应 Stitch 页时，从最接近的“页面类型母版”派生；
- 字段、状态、按钮条件仍以 PRD 为准；
- Stitch 中出现而 PRD 未定义的 Mock 文案、业务字段、时效承诺、渠道名不得直接实现。

---

# 18. 版本冻结

V1.1 后，当前 01/02 开发不得随意改变：

- 主品牌色；
- 两端 Bottom Tab；
- 字体体系；
- 页面间距；
- 卡片圆角；
- 主按钮；
- 状态色语义；
- 表单基本模式；
- 订单/售后/资格页面信息层级。

P2–P5 新业务优先扩展现有组件，不建立第二套视觉系统。

后续只有在出现**新的通用页面模式**时，Design System 才升级版本。
