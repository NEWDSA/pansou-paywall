import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();

    // 1) 记录回调原文（排障用）
    await pool.query(
      `INSERT INTO pay_events(order_no, channel, payload) VALUES(NULL,'wx',?)`,
      [raw]
    );

    // 2) TODO: 验签 + 解密（微信 V3 需用 AES-GCM 解密通知体）
    // const parsed = parseWechatNotify(raw, req.headers);
    // const { orderNo, amountFen, tradeState, transactionId } = parsed;

    // ---- 示例占位（上线前必须替换成真实解析逻辑）----
    // 上线前：可暂时注释掉下面这一段，直接在开发环境用 mock API 测试
    console.warn("[wx-notify] 微信回调占位，需上线前实现验签解密逻辑");
    return NextResponse.json({ code: "SUCCESS" });
    // -------------------------------------------------
  } catch (e: any) {
    console.error("[wx-notify]", e);
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}