# 双端微信测试构建

此说明涵盖住户、商户小程序的真实微信入口构建。配套服务使用后端仓 `deployment/uat-schema/DEPLOYMENT.md` 的独立 Linux TEST／Mock 部署路径；本次自动与隔离运行结果见同目录 `VALIDATION.md`。真实 AppID、服务端 AppSecret、公司网络及真机登录仍需在实际环境验证。

使用项目锁定的 Node 和依赖安装完成后，分别在项目根目录设置对应小程序的公开 AppID 和测试 API 地址，再执行对应命令。API 地址必须指向本次独立测试环境的 HTTPS 入口；不要使用示例地址或本机回环地址。

```sh
npm ci

export WX_TEST_APPID='wx...'
export VITE_RESIDENT_API_BASE_URL='https://测试服务地址/api'
npm run build:wechat-test:resident

export WX_TEST_APPID='wx...'
export VITE_MERCHANT_API_BASE_URL='https://测试服务地址/api'
npm run build:wechat-test:merchant
```

分别将 `dist/wechat-test/resident`、`dist/wechat-test/merchant` 导入微信开发者工具，核对两个项目各自的 AppID。小程序构建不需要 AppSecret，不要将 AppSecret、支付密钥或其他凭据放进环境变量中的 `VITE_` 项或前端工程；AppSecret 由后端受控配置。

此构建会开启对应商城接口、履约和售后页面，关闭本机密码测试登录，生成启用域名检查的项目配置。住户首次真实登录后应出现在后台“用户管理 → 住户账号”；商户首次登录先进入申请身份，审核及经营配置完成后才能操作店铺。后台、双端必须指向同一 run，不依赖预制 Token 或固定测试人员名单。

公司测试构建与服务器默认资料能力一致：住户点击“微信登录”，登录后可修改昵称；不显示手机号授权、绑定和头像上传操作。构建入口固定设置 `VITE_RESIDENT_PROFILE_BASIC_ONLY=true`，不受终端遗留值覆盖。手机号及头像服务仍由后端关闭，其他构建的原有功能保持不变。后续接通这些能力时需一起调整后端配置、此构建预设并完成实际验证。

开发者工具连接、手机访问、微信接口调用和合法域名等条件需要在公司实际网络和微信环境分别验证。构建完成不能证明真实登录或真机业务通过。资金模式仍为 Mock，不能加载真实支付凭据。
