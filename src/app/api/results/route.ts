import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const keyword = (req.nextUrl.searchParams.get("q") ?? "").trim();

    let rows: any[];
    if (!keyword) {
      [rows] = await (pool as any).query(
        `SELECT id, title, pan_type, share_url, extract_code, size, updated_at
         FROM results ORDER BY updated_at DESC LIMIT 50`
      );
    } else {
      [rows] = await (pool as any).query(
        `SELECT id, title, pan_type, share_url, extract_code, size, updated_at
         FROM results
         WHERE title LIKE ? OR pan_type LIKE ?
         ORDER BY updated_at DESC LIMIT 50`,
        [`%${keyword}%`, `%${keyword}%`]
      );
    }

    return NextResponse.json({
      results: rows.map((r: any) => ({
        id: r.id,
        title: r.title,
        panType: r.pan_type,
        size: r.size,
        updated: r.updated_at
          ? new Date(r.updated_at).toISOString().slice(0, 10)
          : null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}