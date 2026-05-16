import { NextRequest, NextResponse } from "next/server";
import { isDemoMode } from "@/lib/config";
import { getClientId } from "@/lib/client";

// 演示模式：查询解锁状态（基于 localStorage 演示数据）
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const resultId = Number(id);
    if (!resultId) return NextResponse.json({ error: "bad id" }, { status: 400 });

    if (isDemoMode) {
      return NextResponse.json({ unlocked: false, demo: true });
    }

    const clientId = getClientId(req);

    // 动态导入 mysql2（避免客户端打包）
    const { pool } = await import("@/lib/db");
    const [u] = await (pool as any).query(
      `SELECT 1 FROM unlocks WHERE client_id=? AND result_id=? LIMIT 1`,
      [clientId, resultId]
    );

    return NextResponse.json({ unlocked: !!u.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}