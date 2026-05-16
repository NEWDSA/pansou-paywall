"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface PayModalProps {
  open: boolean;
  orderNo: string | null;
  qrCodeContent: string | null;
  amount: number;
  onClose: () => void;
  onPaid: (resultId: number) => void;
}

type Tab = "wx" | "ali";
type OrderStatus = "pending" | "paid" | "closed";

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function PayModal({
  open,
  orderNo,
  qrCodeContent,
  amount,
  onClose,
  onPaid,
}: PayModalProps) {
  const [tab, setTab] = useState<Tab>("wx");
  const [qrCanvas, setQrCanvas] = useState<string>("");
  const [status, setStatus] = useState<OrderStatus>("pending");
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultIdRef = useRef<number>(0);

  // 轮询订单状态
  const startPoll = (on: string, rid: number) => {
    resultIdRef.current = rid;
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const clientId = localStorage.getItem("pansou_client_id") ?? "";
        const res = await fetch(`/api/pay/orders/${on}`, {
          headers: { "x-client-id": clientId },
        });
        const data = await res.json();
        if (data.status === "paid") {
          clearInterval(pollTimer.current!);
          setStatus("paid");
          onPaid(resultIdRef.current);
        } else if (data.status === "closed" || new Date(data.expireAt) < new Date()) {
          clearInterval(pollTimer.current!);
          setStatus("closed");
        }
      } catch {
        // ignore
      }
    }, 2000);
  };

  // 生成二维码图片
  useEffect(() => {
    if (!qrCodeContent) return;
    QRCode.toDataURL(qrCodeContent, { width: 200, margin: 2 }).then(setQrCanvas);
  }, [qrCodeContent]);

  // 打开时开始轮询
  useEffect(() => {
    if (!open || !orderNo) return;
    const rid = Number(new URLSearchParams(window.location.search).get("resultId") ?? 0);
    startPoll(orderNo, rid);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [open, orderNo]);

  const yuan = (amount / 100).toFixed(2);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗 */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* 关闭栏 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-0">
          <span className="text-base font-semibold text-gray-900">支付解锁</span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 已解锁 */}
        {status === "paid" ? (
          <div className="px-5 py-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-base font-medium text-gray-900">支付成功！</p>
            <p className="text-sm text-gray-500 mt-1">链接已解锁，可直接复制</p>
          </div>
        ) : (
          <>
            {/* Tab 切换 */}
            <div className="flex px-5 mt-3 gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setTab("wx")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  tab === "wx" ? "bg-white text-green-600 shadow-sm" : "text-gray-500"
                )}
              >
                微信支付
              </button>
              <button
                onClick={() => setTab("ali")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-all",
                  tab === "ali" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                )}
              >
                支付宝
              </button>
            </div>

            {/* 金额 */}
            <div className="px-5 pt-4 text-center">
              <span className="text-3xl font-bold text-gray-900">¥{yuan}</span>
              <p className="text-xs text-gray-400 mt-1">每条资源 ¥{yuan}，按次计费，即付即用</p>
            </div>

            {/* 二维码 */}
            <div className="flex justify-center px-5 py-5">
              {qrCanvas ? (
                <img src={qrCanvas} alt="支付二维码" className="rounded-xl border border-gray-100" />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-400">加载中…</span>
                </div>
              )}
            </div>

            {/* 提示 */}
            <div className="px-5 pb-5 text-center">
              <p className="text-xs text-gray-400">
                {tab === "wx" ? "打开微信扫一扫" : "打开支付宝扫一扫"} · 支付完成后自动解锁
              </p>
              <p className="text-xs text-gray-300 mt-1">订单号：{orderNo ?? "-"}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}