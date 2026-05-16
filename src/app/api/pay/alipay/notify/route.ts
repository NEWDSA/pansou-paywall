import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const payload: Record<string, string> = {};
    form.forEach((v, k) => { payload[k] = String(v); });

    await pool.query(
      `INSERT INTO pay_events(order_no, channel, payload) VALUES(NULL,'ali',?)`,
      [JSON.stringify(payload)]
    );

    // 1) TODO: 验签（alipay-sdk 验签）
    // const ok = alipay.verify(payload, headers);
    // if (!ok) throw new Error("verify failed");

    // ---- 示例占位（上线前必须替换成真实验签逻辑）----
    console.warn("[ali-notify] 支付宝回调占位，需上线前实现验签逻辑");
    return new NextResponse("success");
    // -------------------------------------------------
  } catch (e) {
    console.error("[ali-notify]", e);
    return new NextResponse("fail", { status: 500 });
  }
}