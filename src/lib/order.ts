import crypto from "crypto";

export function genOrderNo(prefix: "WX" | "ALI"): string {
  const d = new Date();
  const ymd =
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0") +
    String(d.getUTCHours()).padStart(2, "0") +
    String(d.getUTCMinutes()).padStart(2, "0") +
    String(d.getUTCSeconds()).padStart(2, "0");
  const rand = crypto.randomBytes(6).toString("hex");
  return `${prefix}${ymd}_${rand}`;
}