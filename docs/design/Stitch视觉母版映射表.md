# 大光路智慧社区小程序 Stitch 视觉母版与开发页面映射表

> 版本：V1.1
>
> 原视觉版本日期：2026-09-16；清洗与资产核查：2026-10-12（PREP-01/C-1）
>
> 作用：维护两批原有 18 个母版 ID 的视觉索引；当前 17 张截图有效，B2-_1 直接截图缺失。页面名称只作为 UI 类型示例，不定义产品范围或业务规则。
>
> 原则：**Stitch 决定视觉语言和页面类型参考，不决定业务字段和业务规则。R 模式强调视觉构图还原，O 模式强调视觉一致基础上的移动作业效率。**

---

# 1. Stitch 视觉资产索引

## 1.1 第一批（`stitch_ (4).zip`）

| 母版 ID | Stitch 文件夹 | 页面 | 页面类型 |
|---|---|---|---|
| B1-_1 | `docs/stitch/batch-1/_1/` | 商户新增商品 | 复杂移动表单 |
| B1-_2 | `docs/stitch/batch-1/_2/` | 住户商品详情 | 居民商品/服务详情 |
| B1-_3 | `docs/stitch/batch-1/_3/` | 商户工作台 | 任务型工作台 |
| B1-_4 | `docs/stitch/batch-1/_4/` | 商户订单详情 | 商户履约型详情 |
| B1-_5 | `docs/stitch/batch-1/_5/` | 住户商城首页 | 内容/商品频道 |
| B1-_6 | `docs/stitch/batch-1/_6/` | 商户商品管理 | 移动管理列表 |
| B1-_7 | `docs/stitch/batch-1/_7/` | 住户首页 | 综合门户 |
| B1-_8 | `docs/stitch/batch-1/_8/` | 住户服务页 | 分类导航大厅 |

## 1.2 第二批（`stitch_ (5).zip`）

| 母版 ID | Stitch 文件夹 | 页面 | 页面类型 |
|---|---|---|---|
| B2-_1 | —（无效截图已清理） | 商户售后详情与处理 | 高风险决策详情；直接截图缺失 |
| B2-_2 | `docs/stitch/batch-2/_2/` | 商户入驻申请 | 分步骤表单 |
| B2-_3 | `docs/stitch/batch-2/_3/` | 商户经营资格 | 资格/状态解释页 |
| B2-_4 | `docs/stitch/batch-2/_4/` | 商户订单核销 | 现场操作工具页 |
| B2-_5 | `docs/stitch/batch-2/_5/` | 住户售后申请 | 凭证型业务申请 |
| B2-_6 | `docs/stitch/batch-2/_6/` | 住户售后详情 | 状态时间线详情 |
| B2-_7 | `docs/stitch/batch-2/_7/` | 住户商城订单详情 | 居民交易/履约详情 |
| B2-_8 | `docs/stitch/batch-2/_8/` | 住户确认订单 | 交易确认页 |
| B2-_9 | `docs/stitch/batch-2/_9/` | 住户购物车 | 多商户分组选择页 |
| B2-_10 | `docs/stitch/batch-2/_10/` | 住户个人中心 | 个人业务聚合页 |

---

# 2. 母版读取方式

先读取经批准的产品与阶段范围，再按视觉顺序读取 Design System、微信实现规范、[Stitch 视觉还原规范](Stitch视觉还原规范.md)、本表中的有效截图与原始 DESIGN 参考。

每页确认 Level 和 Mode，只打开必要的 1 张主参考及最多 1 张辅助参考。原始资料中的字段、审批、状态和交易示例不能转化为业务授权。

## 2.0 本轮资产核查与缺失记录

原 18 个 screenshot 文件逐项完成 PNG 识别、完整性校验和像素解码：第一批 8 张有效，第二批 9 张有效。

B2-_1 原 screenshot 只有 28 字节，内容为 `<FIFE Image failed to fetch>`，不是图片，已按授权清理。其直接视觉参考为 NOT_VERIFIED；不能用历史 HTML 替代截图或声称直接视觉还原完成。

商户售后详情可考虑 B1-_4 的详情分组与 B2-_6 的时间线作为候选 L2/R 组合，只参考视觉结构，须在后续页面任务中确认。此建议不修改现有页面和业务字段。

两份原始 DESIGN 保持原文件内容，仅作低优先级视觉参考：

- [第一批 DESIGN](../stitch/batch-1/qinhuai_vernacular_modernity/DESIGN.md)
- [第二批 DESIGN](../stitch/batch-2/daguanglu_smart_community/DESIGN.md)

其他索引项的 `screen.png` 位于表列目录；目录均相对仓库根。可读取不等于页面视觉验收通过。

## 2.1 Stitch Level 与 Visual Mode

页面开发必须同时确认：

```text
Stitch Level
+
Visual Mode
```

### Stitch Level

#### L1｜直接对应母版

当前开发页面存在一张直接对应的 Stitch 母版。

要求：

- 必须打开对应 `screen.png`；
- 不依赖历史 HTML；
- 不得跳过对应母版直接凭经验开发。

#### L2｜同类型参考母版

没有一一对应母版，但已有相同或相近页面类型。

要求：

- 选择 1 张主参考母版；
- 最多增加 1 张辅助参考母版；
- 业务字段必须来自当前 PRD；
- 禁止把参考母版中的业务内容照搬到当前页面。

#### L3｜无合适母版

没有可合理映射的 Stitch 页面。

要求：

- 按 Design System + 微信小程序规范生成；
- 优先复用已经成熟的公共组件和页面模式；
- 不自行创造第二套视觉体系。

### Visual Mode

#### R｜Replica Mode｜视觉还原型

适用于：

- Resident 主要页面；
- Merchant 入驻、认证、表单、状态说明、详情、核销等流程型页面；
- 已经确认 Stitch 构图合理的页面。

R 模式下，Stitch `screen.png` 是主要视觉验收基准。

优先保持：

- 模块顺序；
- 页面构图；
- 卡片组合关系；
- 图片比例；
- 信息层级；
- 主要留白比例；
- Bottom Action / Bottom Tab 的位置关系。

允许因微信运行环境产生合理差异：

- status bar；
- 微信胶囊；
- safe-area；
- 字体实际渲染；
- 设备高度；
- uni-app 实现方式。

#### O｜Operational Mode｜作业效率型

适用于 Merchant 高频作业和管理列表：

- 工作台；
- 商品/服务经营列表；
- 订单列表；
- 售后任务列表；
- 门店、人员、资质等需要连续管理多个业务对象的列表页。

O 模式下，Stitch 继续作为以下内容的参考：

- 色彩；
- Typography；
- 图标；
- 卡片质感；
- 状态语义；
- 品牌语言；
- 信息层级。

但 **Stitch 不作为像素级几何结构约束**。

允许为了移动作业效率调整：

- 卡片高度；
- 字段排列；
- 信息密度；
- 操作区域；
- 模块组合；
- 页面留白。

必须满足：

1. PRD 必要字段完整；
2. 高频状态容易识别；
3. 高频主操作直接可见；
4. 不制造无意义大卡片和大面积空白；
5. 一个列表卡原则上对应一个主要业务对象；
6. 紧凑视觉控件仍保证至少 44px 有效点击热区；
7. 不因紧凑损害可读性；
8. 不创造 PRD 未定义的新业务规则。

> **Merchant 页面不等于全部使用 O。**
>
> 入驻、认证、编辑表单、状态说明、详情和高风险确认页面通常仍使用 R。

---

# 3. 住户端页面映射

| 开发页面 | 首选母版 | 次选母版/组件 | Level | Mode | 映射说明 |
|---|---|---|---|---|---|
| 首页 | B1-_7 | B1-_5 | L1 | R | 综合入口、推荐模块 |
| 服务大厅 | B1-_8 | B1-_7 | L1 | R | 分类导航，不做信息流 |
| 商城首页 | B1-_5 | B1-_7 | L1 | R | 分类 + 双列商品 |
| 商城商品列表 | B1-_5 | ProductCard | L2 | R | 延续商城首页商品流 |
| 商品详情 | B1-_2 | — | L1 | R | SKU、履约、商户、购买栏 |
| 购物车 | B2-_9 | B1-_5 | L1 | R | 分组标题、勾选与摘要布局 |
| 收货地址列表 | B2-_10 | 通用 List | L2 | R | 个人资料类列表 |
| 地址新增/编辑 | B1-_1 | FormSection | L2 | R | 表单视觉，不复用商户业务字段 |
| 确认订单 | B2-_8 | AmountSummary | L1 | R | 履约选择 + 金额 |
| 支付结果 | ResultState | B2-_7 | L3 | R | 复用统一结果页体系 |
| 商城订单列表 | B2-_7 | B1-_5 卡片节奏 | L2 | R | 从详情状态语言派生列表 |
| 商城订单详情 | B2-_7 | StatusTimeline | L1 | R | 居民视角状态和下一步 |
| 申请售后 | B2-_5 | EvidenceUploader | L1 | R | 售后字段按 PRD |
| 售后详情/退款结果 | B2-_6 | StatusTimeline | L1 | R | 谁在处理 + 资金进度 |
| 商品评价 | B2-_5 | B1-_2 商品摘要 | L2 | R | 表单 + 凭证类 |
| 我的 | B2-_10 | — | L1 | R | 居民个人中心基准 |

---

# 4. 商户端页面映射

| 开发页面 | 首选母版 | 次选母版/组件 | Level | Mode | 映射说明 |
|---|---|---|---|---|---|
| 工作台 | B1-_3 | — | L1 | O | 高频待办与经营简报 |
| 经营首页 | B1-_6 | B1-_3 | L1 | O | 商品/服务频道容器 |
| 商品管理 | B1-_6 | — | L1 | O | 高频移动管理列表 |
| 我的 | B2-_10 | B2-_3 | L2 | R | 商户个人中心聚合入口 |
| 新增/编辑商品 | B1-_1 | — | L1 | R | 复杂移动表单 |
| SKU 与库存 | B1-_1 | SkuEditor | L2 | R | 规格表单，不使用 PC 表格 |
| 商品审核结果 | B1-_6 | QualificationStatus | L2 | R | 状态、原因、下一步 |
| 商城订单列表 | B1-_4 | B1-_6 | L2 | O | 高频订单处理列表 |
| 商城订单详情 | B1-_4 | StatusTimeline | L1 | R | 当前履约方式 + CTA |
| 商户配送 | B1-_4 | StatusTimeline | L2 | R | 履约步骤 |
| 自提/到店核销 | B2-_4 | — | L1 | R | 现场核销工具 |
| 售后列表 | B1-_6 | B2-_6 | L2 | O | 对象列表与状态摘要，不使用缺失 B2-_1 |
| 售后详情与处理 | B1-_4（候选） | B2-_6（候选） | L2（待确认） | R | B2-_1 直接截图缺失；候选仅参考详情和时间线布局 |
| 本店评价列表 | B1-_6 | — | L2 | O | 对象列表和文字/评分布局；动作由有效需求决定 |
| 入驻申请 | B2-_2 | — | L1 | R | StepForm，流程型页面 |
| 审核结果 | B2-_3 | ResultState | L2 | R | 状态解释、驳回原因、下一步 |
| 基本资料 | B1-_1 | BaseCard | L2 | R | 读写混合资料 |
| 门店列表 | B1-_6 | — | L2 | O | 高频管理列表 |
| 门店新增/编辑 | B1-_1 | — | L2 | R | 表单 |
| 商户人员列表 | B1-_6 | — | L2 | O | 人员管理列表 |
| 人员邀请/编辑 | B1-_1 | — | L2 | R | 人员表单 |
| 资质列表 | B2-_3 | B1-_6 | L2 | O | 状态管理列表 |
| 资质新增/更新 | B1-_1 | EvidenceUploader | L2 | R | 附件表单 |
| 合作状态 | B2-_3 | — | L2 | R | 状态说明和原因分组 |
| 经营资格 | B2-_3 | — | L1 | R | 摘要、检查项和原因区层级 |

---

# 5. 页面映射边界

上表只提供视觉类型和候选组合，不授权开发这些页面，也不定义字段、状态、审批角色或权限。页面和组件取舍以已批准的阶段范围为准，优先复用现有组件。

原始截图可能包含旧演示字段、图片占位或未批准动作，只参考构图与视觉层级。缺失的直接母版必须记录；不得通过伪造截图或搬用其他角色的业务内容填补。

# 6. 页面类型 → 公共组件

| 页面类型 | 必备公共组件 |
|---|---|
| 综合门户 | AppNavbar, QuickEntryGrid, SectionHeader, ProductCard, ServiceCard |
| 分类大厅 | SectionHeader, BaseCard, QuickEntryGrid |
| 商品/内容列表 | SearchBar, FilterChip, ProductCard, EmptyState |
| Merchant Operational 管理列表 | SearchBar, CompactFilterChip, StatusTag, CompactAction, EmptyState |
| 复杂表单 | FormSection, FormField, BottomActionBar, EvidenceUploader |
| 分步骤表单 | StepForm, StepProgress, FormSection |
| 资格解释 | QualificationStatusCard, QualificationCheckItem |
| 履约详情 | OrderStatusHeader, StatusTimeline, BottomActionBar |
| 确认交易 | FulfillmentChoiceCard, AmountSummary, BottomActionBar |
| 多商户选择 | MerchantGroupedCart, CartItem, GroupCheckoutBar |
| 售后申请 | AfterSaleApplyPanel, EvidenceUploader |
| 售后处理 | AfterSaleDecisionPanel, AmountSummary |
| 核销工具 | VerificationPanel, VerificationResult |
| 结果页 | ResultState |

---

# 7. 禁止错误映射

- 不因为页面“看起来像”就复制其业务字段；
- 商户表单母版可用于居民表单，但商户经营上下文字段不能带过去；
- 居民售后与商户售后必须使用不同角色视角；
- Resident 页面不得出现 Merchant Tab；
- Merchant 页面不得出现 Resident Tab；
- 资金/支付文案不得从 Stitch Mock 复制渠道实现；
- 地域视觉元素不产生产品未授权的角色或操作；
- 不得因为页面属于 Merchant 就全部套用 O 模式；
- 不得因为存在 L1 母版，就忽略 O 模式下的移动作业效率；
- 不得为了提高信息密度删除 PRD 必要字段；
- 不得为了达到 44px 触控规范，把所有视觉按钮强行绘制为 44–48px。

---

# 8. 视觉参考与后续核查

当前有 17 张有效截图和 1 项缺失直接母版。是否满足具体页面视觉需求，在相应任务中核实，不据此声明整体视觉冻结。

后续只有出现下列情况，才建议新增 Stitch 母版：

1. 已确认有效的参考无法覆盖新的交互类型；
2. 页面需要复杂地图/空间操作；
3. 页面需要全新的数据可视化模式；
4. 用户测试证明当前通用模式无法满足任务。

普通列表、详情、表单、缴费、订单、售后等页面直接从现有母版派生。

阶段开发完成后的最终 UI / UX 精修，不在本映射表中重新定义母版体系；统一在主要业务功能完成后，基于真实业务流、真实数据长度、真机和完整状态进行整体打磨。
