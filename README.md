# 号码标记查

面向中国大陆手机号的多平台「标记查询 + 官方申诉指引」全栈 Web 应用。帮助用户了解号码在腾讯手机管家、360 手机卫士、电话邦等来源的标记情况，并跳转至各平台**官方申诉页面**。

> **重要**：本产品仅提供信息查询与指引，**不能**也**不会**代用户取消标记；标记是否解除以各平台审核为准。

## 功能概览

- 邮箱 + 密码注册/登录（含演示账号）
- 提交手机号，异步多平台查询（正式对接 Jumdata 后通常 1–30 分钟；本地 mock 约 4–12 秒）
- 查询结果详情：各平台是否标记、类型摘要、官方申诉链接
- 查询历史、当月剩余配额
- 订阅套餐（免费 / 基础 ¥18 / 专业 ¥38，支持演示「模拟开通」）

## 技术栈

- **Next.js 16**（App Router）+ **TypeScript** + **Tailwind CSS** + **shadcn/ui**
- **SQLite**（`better-sqlite3`）单文件数据库
- **Jumdata 集成层**：`JumdataProvider` 接口 + `mock` / `live` 两种实现

## 快速开始

```bash
npm install
cp .env.example .env.local   # 可选，默认即为 mock 模式
npm run dev
```

浏览器打开 [http://127.0.0.1:43123](http://127.0.0.1:43123)

### 演示账号

| 邮箱 | 密码 |
|------|------|
| `demo@example.com` | `demo123456` |

免费版每月 **1 次**多平台查询。可在「套餐价格」页 **模拟开通** 基础版/专业版以体验更高配额。

## 环境变量

见 [`.env.example`](./.env.example)。常用项：

| 变量 | 说明 |
|------|------|
| `JUMDATA_MODE` | `mock`（默认）或 `live` |
| `JUMDATA_APP_ID` / `JUMDATA_APP_SECRET` | 聚美智数应用凭证（live 模式） |
| `CALLBACK_BASE_URL` | 异步结果回调公网根 URL（live 模式，需能访问 `/api/webhooks/jumdata`） |
| `JUMDATA_WEBHOOK_SECRET` | Webhook 请求头 `X-Jumdata-Signature` 验签密钥 |
| `SESSION_SECRET` | JWT 会话密钥 |
| `DATABASE_PATH` | SQLite 文件路径（默认 `./data/app.db`） |

## 架构说明

```
用户提交手机号 → POST /api/queries
    → JumdataProvider.submitMultiPlatformQuery()
    → 写入 query_jobs（pending/processing）并扣减当月配额
    → （异步）Jumdata 回调 POST /api/webhooks/jumdata
    → 写入 query_results，任务 completed
```

### 数据表

- `users` — 用户
- `subscriptions` — 当前套餐（free / basic / pro）与账期
- `usage_quota` — 按 `YYYY-MM` 统计已用查询次数
- `query_jobs` — 查询任务与外部 job id
- `query_results` — 各平台标记明细

### Mock vs Live

- **Mock**（`JUMDATA_MODE=mock`）：`src/lib/jumdata/mock.ts` 在短延迟后向本机 Webhook 投递模拟结果，无需 API Key。
- **Live**（`JUMDATA_MODE=live`）：`src/lib/jumdata/live.ts` 向 Jumdata 发起异步任务（URL/签名需按官方文档完善）；结果由平台 POST 到 `CALLBACK_BASE_URL/api/webhooks/jumdata`。

替换 live 实现时，保持 `JumdataProvider` 与 `applyJumdataCallback()` 不变即可。

## 套餐与配额

| 套餐 | 月费 | 年付（可选） | 每月查询次数 |
|------|------|--------------|--------------|
| 免费版 | ¥0 | — | 1 |
| 基础版 | ¥18 | ¥148 | 15 |
| 专业版 | ¥38 | ¥298 | 50 |

配额在自然月内用尽后：**等待下月重置**或**升级套餐**，不提供按次加油包。

## 官方申诉链接（结果页展示）

- 腾讯手机管家：https://yun.m.qq.com/shouguan/audit/
- 360 手机卫士：http://haomashensu.360.cn/
- 电话邦：https://www.dianhua.cn/appeal/

## 生产构建

```bash
npm run build
npm start -- -p 43123
```

## 许可

本项目为演示/产品原型代码，Jumdata 接口地址与字段以聚美智数官方文档为准。
