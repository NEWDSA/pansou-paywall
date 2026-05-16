import { NextRequest, NextResponse } from "next/server";
import { pool, isDemoMode } from "@/lib/db";

// ⚠️ 仅开发/演示环境可用
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production" && !isDemoMode) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const orderNo = String(body?.orderNo ?? "").trim();
    if (!orderNo) return NextResponse.json({ error: "orderNo required" }, { status: 400 });

    if (isDemoMode) {
      // 演示模式：直接返回成功，前端切换 paid 状态即可
      return NextResponse.json({
        message: "演示模式：模拟支付成功",
        orderNo,
        demo: true,
      });
    }

    const [orders] = await pool.query(
      `SELECT order_no, client_id, result_id, amount, status FROM pay_orders WHERE order_no=? LIMIT 1`,
      [orderNo]
    ) as any[];

    if (!orders.length) return NextResponse.json({ error: "order not found" }, { status: 404 });

    const o = orders[0];
    if (o.status === "paid") {
      return NextResponse.json({ message: "already paid" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `UPDATE pay_orders SET status='paid', paid_at=NOW() WHERE order_no=? AND status='pending'`,
        [orderNo]
      );
      await conn.query(
        `INSERT IGNORE INTO unlocks(client_id, result_id, order_no) VALUES(?,?,?)`,
        [o.client_id, o.result_id, orderNo]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return NextResponse.json({ message: "mock paid success", orderNo });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}