import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/db";

// 演示模式轮询：直接返回 pending（模拟等待支付状态）
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ orderNo: string }> }
) {
  try {
    const { orderNo } = await ctx.params;

    if (isDemoMode) {
      return NextResponse.json({
        status: "pending",
        amount: 200,
        expireAt: new Date(Date.now() + 10 * 60 * 1000),
        paidAt: null,
        demo: true,
        message: "演示模式：点击右下角「模拟支付」即可",
      });
    }

    // 生产模式：从数据库查询
    const { pool } = await import("@/lib/db");
    const [rows] = await pool.query(
      `SELECT status, amount, expire_at, paid_at FROM pay_orders WHERE order_no=? LIMIT 1`,
      [orderNo]
    ) as any[];

    if (!rows.length) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    const r = rows[0];
    return NextResponse.json({
      status: r.status,
      amount: r.amount,
      expireAt: r.expire_at,
      paidAt: r.paid_at,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}