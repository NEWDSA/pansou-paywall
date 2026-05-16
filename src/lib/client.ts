import { NextRequest } from "next/server";

export function getClientId(req: NextRequest): string {
  const cid = req.headers.get("x-client-id")?.trim();
  if (!cid) throw Object.assign(new Error("missing x-client-id"), { status: 400 });
  if (cid.length > 64) throw Object.assign(new Error("invalid x-client-id"), { status: 400 });
  return cid;
}