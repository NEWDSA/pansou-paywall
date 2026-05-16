import { NextRequest, NextResponse } from "next/server";
import { isDemoMode, DEMO_RESULTS } from "@/lib/config";
import { getClientId } from "@/lib/client";

// 演示模式：直接返回分享链接
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const resultId = Number(id);
    if (!resultId) return NextResponse.json({ error: "bad id" }, { status: 400 });

    if (isDemoMode) {
      const demo = DEMO_RESULTS.find((r) => r.id === resultId);
      if (!demo) return NextResponse.json({ error: "not found" }, { status: 404 });

      return NextResponse.json({
        shareUrl: demo.shareUrl,
        extractCode: demo.extractCode,
        title: demo.title,
        panType: demo.panType,
        demo: true,
      });
    }

    // 生产模式：从数据库查询（需要 clientId 校验）
    const clientId = getClientId(req);

    // 动态导入 mysql2（避免客户端打包）
    const { pool } = await import("@/lib/db");
    const [u] = await (pool as any).query(
      `SELECT 1 FROM unlocks WHERE client_id=? AND result_id=? LIMIT 1`,
      [clientId, resultId]
    );
    if (!u.length) {
      return NextResponse.json({ error: "payment required" }, { status: 402 });
    }

    const [r] = await (pool as any).query(
      `SELECT share_url, extract_code, title, pan_type FROM results WHERE id=? LIMIT 1`,
      [resultId]
    );
    if (!r.length) return NextResponse.json({ error: "not found" }, { status: 404 });

    return NextResponse.json({
      shareUrl: r[0].share_url,
      extractCode: r[0].extract_code,
      title: r[0].title,
      panType: r[0].pan_type,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}