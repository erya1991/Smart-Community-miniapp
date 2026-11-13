# 大光路智慧社区 P0 双小程序

公司 Linux TEST／Mock 环境接入两个真实微信小程序，见 [双端微信测试构建](docs/wechat-test-build.md)。服务端部署工具随后端仓提供；真实微信身份与资金 Mock 分别配置、分别验证。

## 1. 项目简介

本仓库维护大光路智慧社区的住户、商户两个独立微信小程序。项目进入正式全栈产品实施准备，商城使用 LiLiShop Backend 作为唯一业务内核，平台管理以 LiLiShop Manager 为基础。

现有页面、Service、Adapter 和 Mock 保留为实现与测试资产。正式接口接入和业务验收按批准的 Stage 计划执行。

## 2. 技术栈

当前根 `package.json` 使用 Vue 3.4.21、uni-app 3.0.0-5020420260813003、Vite 5.2.8、TypeScript ^4.9.4、Sass 和 vue-tsc。npm workspace 为 `apps/*`，依赖由根 package 和 lockfile 管理。

运行环境兼容性需要在后续环境检查和实际构建中核实，本次文档整理没有安装依赖或运行构建。

## 3. 工程结构

```text
apps/
├─ resident-miniapp/    # 住户 App Shell、页面、配置和构建入口
└─ merchant-miniapp/    # 商户 App Shell、页面、配置和构建入口
packages/
├─ theme/              # 共享 Design Token 与全局样式
├─ ui/                 # 共享组件和图标资源
├─ common/             # 通用类型、工具与 composable
└─ business-common/    # 共用业务适配与历史 Mock
scripts/               # 构建入口、静态检查和 Mock 场景脚本
docs/
├─ design/             # 当前视觉及微信交互规范
└─ stitch/             # 有效截图与原始 DESIGN 视觉参考
```

共享源码的主要维护位置是 `packages`。两端的主要相对引用和 Vite/TypeScript 别名指向共享源码；历史 `common` 与 `src/assets/components/composables/types/utils` 目前是 Git 跟踪的普通副本，不是实时 Junction，修改共享源码不会自动更新副本。

共享不等于合并两端导航、页面、AppID 或构建产物。引用与副本清理须另行授权并验证。

## 4. 安装与开发命令

在仓库根目录使用 PowerShell。以下为命令说明，本次整理没有执行：

```powershell
npm.cmd install --cache .npm-cache

npm.cmd run dev:resident:h5
npm.cmd run dev:merchant:h5
npm.cmd run dev:resident:mp-weixin
npm.cmd run dev:merchant:mp-weixin
```

开发脚本来自当前根 `package.json`，各 workspace 经 `scripts/run-uni.mjs` 启动。AppID、环境和微信主体配置需要在相应阶段核对，不能把启动或编译等同于微信发布。

## 5. 双小程序独立构建

```powershell
npm.cmd run build:resident:h5
npm.cmd run build:merchant:h5
npm.cmd run build:resident:mp-weixin
npm.cmd run build:merchant:mp-weixin
```

产物分别位于对应 App 的 `dist/build/h5` 或 `dist/build/mp-weixin`。两端各自导入微信开发者工具、配置主体、验证并发布。

当前已声明的检查命令：

```powershell
npm.cmd run type-check:resident
npm.cmd run type-check:merchant
npm.cmd run type-check
npm.cmd run check:boundaries
```

这些脚本存在不代表本次运行通过；构建、Mock、接口、视觉和真机结果需要分别记录。

## 6. 与 LiLiShop Backend 的关系

正式工作区中的 `lilishop-backend`、`lilishop-ui`、本仓库和 `project-ops` 保持四份独立 Git 历史，三个源码仓独立构建。双小程序以 Service → Adapter 边界适配 LiLiShop，不建立平行商品、订单或资金后端。

当前历史业务 Adapter 仍使用 Mock，尚不能据此宣称真实登录、权限、业务 API 或收付通资金闭环已接通。正式业务以服务端身份、Store 数据范围、金额和状态事实为准。

## 7. 文档入口

- [研发规范](AGENTS.md)
- [项目级研发规范](../project-ops/AGENTS.md)
- [产品基线身份清单](../project-ops/docs/product/PRODUCT_BASELINE_MANIFEST.md)
- [总体需求大纲 V1.0](../project-ops/docs/product/source/00_大光路智慧社区_P0商城闭环_总体需求大纲_V1.0.md)
- [正式开发总清单 V1.1](../project-ops/docs/product/current/01_大光路智慧社区_P0商城闭环_产品开发总清单_V1.1.md)
- [Design System V1.1](docs/design/MiniApp_Design_System_V1.1.md)
- [微信小程序实现规范 V1.0](docs/design/MiniApp_WeChat_Implementation_Guidelines_V1.0.md)
- [Stitch 视觉还原规范](docs/design/Stitch视觉还原规范.md)
- [Stitch 视觉母版映射表](docs/design/Stitch视觉母版映射表.md)

产品依据按总体大纲 V1.0 → 正式开发总清单 V1.1 → 当前批准的阶段设计与验收资料使用；V1.1 已为 APPROVED / CURRENT，历史 V1.0 总清单和 V1.1-DRAFT 仅供追溯。D:\工作 下原件和 source 快照保持只读，原件位置及 SHA 见产品基线身份清单。跨仓任务必须显式读取 project-ops/AGENTS.md 与本仓库 AGENTS；兄弟仓规范不会自动适用于本仓库。视觉资料、历史实现及 Mock 不替代正式业务依据。

## 8. 当前实施状态

当前为 PREP-01，尚未整体冻结，本次文档清理不代表 Stage 0 已开始，也不代表构建、数据库、真实接口或支付通过。

Stitch 截图原有 18 项，本轮确认 17 张有效；B2-_1 的无效截图已清理，其直接视觉参考缺失和候选回退见映射表。

两份 Stitch HTML 按已确认的保留例外，仅作为 `scripts/sync-stitch-catalog.mjs` 的图片来源维护输入，不具备业务需求、接口或状态规则的权威性，不属于旧业务 PRD；其余 16 份无依赖 HTML 已清理。本轮不为 HTML 清零修改脚本。五份残留历史业务文档已清理，PREP-01 保持 IN_PROGRESS。

本轮不提交或推送 Git，不修改正式产品原件，不自动开始业务开发或标记 PREP-01 PASS。
