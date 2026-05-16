import { NextRequest, NextResponse } from "next/server";
import { pool, isDemoMode } from "@/lib/db";
import { getClientId } from "@/lib/client";
import { genOrderNo } from "@/lib/order";

const AMOUNT_FEN = 200;
const ORDER_EXPIRE_MS = 10 * 60 * 1000;

// 微信 Native 下单（TODO: 替换为真实 SDK 调用）
async function createWechatNativePay(_orderNo: string): Promise<string> {
  // TODO: 用 wechatpay-node-v3 调用微信 V3 Native 下单 API
  return "weixin://wxpay/bizpayurl?pr=placeholder";
}

// 支付宝当面付预下单（TODO: 替换为真实 SDK 调用）
async function createAlipayFaceToFacePay(_orderNo: string): Promise<string> {
  // TODO: 用 alipay-sdk 调用当面付 precreate
  return "https://qr.alipay.com/placeholder";
}

// 限流：1分钟最多创建 10 个订单（仅生产模式生效）
async function basicRateLimit(clientId: string) {
  if (isDemoMode) return;
  const rows = await (pool as any).query(
    `SELECT COUNT(*) as c FROM pay_orders
     WHERE client_id=? AND created_at > (NOW() - INTERVAL 1 MINUTE)`,
    [clientId]
  );
  if ((rows?.[0]?.c ?? 0) >= 10) {
    throw Object.assign(new Error("rate limit: too many requests"), { status: 429 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    await basicRateLimit(clientId);

    const body = await req.json();
    const resultId = Number(body?.resultId);
    const channel = (body?.channel === "wx" || body?.channel === "ali") ? body.channel : null;
    if (!resultId || !channel) {
      return NextResponse.json({ error: "bad params" }, { status: 400 });
    }

    // ---------------- 演示模式 ----------------
    if (isDemoMode) {
      const expireAt = new Date(Date.now() + ORDER_EXPIRE_MS);
      const orderNo = channel === "wx" ? genOrderNo("WX") : genOrderNo("ALI");
      const qrCodeContent =
        channel === "wx"
          ? await createWechatNativePay(orderNo)
          : await createAlipayFaceToFacePay(orderNo);

      return NextResponse.json({
        orderNo,
        amount: AMOUNT_FEN,
        qrCodeContent,
        expireAt,
        demo: true,
      });
    }

    // ---------------- 生产模式 ----------------
    // 1) 是否已解锁
    const unlocked = await (pool as any).query(
      `SELECT 1 FROM unlocks WHERE client_id=? AND result_id=? LIMIT 1`,
      [clientId, resultId]
    );
    if (unlocked.length) {
      return NextResponse.json({ unlocked: true, already: true });
    }

    // 2) 复用未过期 pending 订单
    const pending = await (pool as any).query(
      `SELECT order_no, amount, expire_at FROM pay_orders
       WHERE client_id=? AND result_id=? AND channel=? AND status='pending' AND expire_at>NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [clientId, resultId, channel]
    );
    if (pending.length) {
      return NextResponse.json({
        orderNo: pending[0].order_no,
        amount: pending[0].amount,
        expireAt: pending[0].expire_at,
        reuse: true,
      });
    }

    // 3) 创建新订单
    const expireAt = new Date(Date.now() + ORDER_EXPIRE_MS);
    const orderNo = channel === "wx" ? genOrderNo("WX") : genOrderNo("ALI");

    await (pool as any).query(
      `INSERT INTO pay_orders(order_no, client_id, result_id, channel, amount, status, expire_at)
       VALUES(?, ?, ?, ?, ?, 'pending', ?)`,
      [orderNo, clientId, resultId, channel, AMOUNT_FEN, expireAt]
    );

    // 4) 调支付生成二维码内容
    const qrCodeContent =
      channel === "wx"
        ? await createWechatNativePay(orderNo)
        : await createAlipayFaceToFacePay(orderNo);

    return NextResponse.json({
      orderNo,
      amount: AMOUNT_FEN,
      qrCodeContent,
      expireAt,
    });
  } catch (e: any) {
    const status = e?.status ?? 500;
    return NextResponse.json({ error: e?.message ?? "server error" }, { status });
  }
}