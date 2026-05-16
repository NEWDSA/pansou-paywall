# 盘搜按次付费系统

网盘资源搜索 + **2元/条 按次解锁** 分享链接，PC端扫码支付（微信 + 支付宝），匿名用户免登录。

## 技术栈

- **前端**：Next.js 15 (App Router) + React 18 + Tailwind CSS
- **后端**：Next.js Route Handlers + mysql2（原生 SQL）
- **数据库**：MySQL（InnoDB）
- **支付**：微信支付 V3（Native）/ 支付宝当面付（扫码）

## 核心流程

```
用户搜索 → 查看结果列表（无明文链接）
  ↓ 点"微信¥2"或"支付宝¥2"
后端创建订单 → 返回二维码内容
  ↓
前端展示支付弹窗 → 轮询订单状态
  ↓
用户扫码支付 → 支付平台回调 → 写入 unlock 记录
  ↓
前端轮询发现 paid → 自动弹出分享链接
```

## 项目结构

```
src/
  app/
    api/
      pay/
        orders/route.ts              POST  创建订单，返回二维码内容
        orders/[orderNo]/route.ts    GET   轮询订单状态
        wechat/notify/route.ts       POST  微信支付回调
        alipay/notify/route.ts       POST  支付宝回调
        mock/paid/route.ts           POST  ⚠️开发环境模拟支付（生产必须关闭）
      results/
        [id]/link/route.ts          GET   已解锁则返回分享链接
        [id]/unlock-status/route.ts GET   查询某条是否已解锁
  lib/
    db.ts                           mysql2 连接池
    client.ts                       从请求头读取 clientId
    order.ts                        生成唯一订单号
  hooks/
    useClient.ts                   前端 clientId 管理 + apiFetch 封装
  components/
    PayModal.tsx                   支付弹窗（二维码 + 轮询 + 成功展示）
  app/
    page.tsx                        首页（搜索 + 结果列表 + 支付入口）
sql/
  schema.sql                        MySQL 建表脚本（含示例数据）
.env.example                       环境变量配置示例
```

## 快速开始

### 1. 安装依赖

```bash
npm install
npm i uuid @types/uuid qrcode mysql2
```

### 2. 初始化数据库

```bash
mysql -u root -p < sql/schema.sql
```

### 3. 配置环境变量

```bash
cp .env.example .env.local
# 编辑 .env.local，填入数据库连接信息
```

### 4. 开发环境运行

```bash
npm run dev
```

打开 `http://localhost:3000`，点击任意结果的"微信¥2"或"支付宝¥2"弹出支付弹窗后，点击右下角的 **🧪 模拟支付成功** 按钮即可验证整条链路。

### 5. 上线前必做

1. **接入真实支付**：在 `.env.local` 填入微信/支付宝商户信息后，替换 `lib/createPay.ts` 中的 TODO 部分（微信 Native 下单 + 支付宝当面付 precreate）
2. **实现回调验签**：在 `app/api/pay/wechat/notify/route.ts` 和 `app/api/pay/alipay/notify/route.ts` 中补齐验签解密逻辑
3. **删除模拟接口**：确认 `app/api/pay/mock/paid/route.ts` 在生产环境已无法访问
4. **配置支付回调地址**：
   - 微信支付后台 → 商户平台 → 支付回调配置 → `https://你的域名/api/pay/wechat/notify`
   - 支付宝后台 → 沙箱/正式环境 → notify_url → `https://你的域名/api/pay/alipay/notify`

## 关键设计

| 项目 | 说明 |
|------|------|
| 计费 | **200分 = 2元**，金额固定写死，不从前端传输 |
| 匿名用户 | `localStorage.pansou_client_id`（UUID）作为身份标识 |
| 防刷 | `unlocks(client_id, result_id)` 唯一索引；订单 10 分钟过期；限流 |
| 幂等 | 回调/模拟支付均用唯一索引兜底，事务确保不重复解锁 |
| 支付弹窗 | 二维码 + Tab 切换（微信/支付宝）+ 轮询 + 成功后自动取链 |

## 常见问题

**Q：支付后换浏览器/清缓存已解锁记录丢失怎么办？**  
A：目前方案接受此限制。如需跨设备恢复，可后期增加"支付后显示兑换码"机制。

**Q：真实支付怎么接？**  
A：申请微信商户号 + 支付宝商家账号后，在 `.env.local` 配置密钥，替换代码中两处 TODO 即可。SDK 推荐：`wechatpay-node-v3`（微信）和 `alipay-sdk`（支付宝）。

**Q：Vercel 部署可以吗？**  
A：可以，但注意：① Vercel 函数有超时限制，回调处理尽量轻量；② 环境变量在 Vercel Project Settings 配置（密钥用 PEM 字符串）；③ 微信/支付宝回调地址必须公网可访问（Vercel 域名已备案即可）。