"use client";
import { useState, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

// 生成并持久化 clientId（不登录用户的匿名身份）
function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem("pansou_client_id");
  if (stored) return stored;
  const id = uuidv4();
  localStorage.setItem("pansou_client_id", id);
  return id;
}

export function useClientId() {
  const [clientId, setClientId] = useState<string>("");

  useEffect(() => {
    setClientId(getOrCreateClientId());
  }, []);

  return clientId;
}

// 通用请求封装：自动带上 x-client-id
export async function apiFetch<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const clientId = getOrCreateClientId();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": clientId,
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "network error" }));
    throw Object.assign(new Error(err?.error ?? "request failed"), {
      status: res.status,
    });
  }
  return res.json();
}