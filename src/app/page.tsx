"use client";
import { useState, useEffect } from "react";
import { isDemoMode } from "@/lib/config";

function getDemoUnlockedSet(): Set<number> {
  try {
    const raw = localStorage.getItem("pansou_demo_unlocked");
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveDemoUnlocked(set: Set<number>) {
  localStorage.setItem("pansou_demo_unlocked", JSON.stringify([...set]));
}

interface ResultItem {
  id: number;
  title: string;
  panType: string;
  size: string | null;
  updated: string | null;
  shareUrl?: string;
  extractCode?: string | null;
}

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [unlockedSet, setUnlockedSet] = useState<Set<number>>(() => getDemoUnlockedSet());

  // 支付弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [qrContent, setQrContent] = useState<string | null>(null);
  const [payResultId, setPayResultId] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"wx" | "ali">("wx");
  const [isDemo, setIsDemo] = useState(false);
  const [linkData, setLinkData] = useState<{ shareUrl: string; extractCode: string | null } | null>(null);
  const [showLinkResult, setShowLinkResult] = useState(false);
  const [loading, setLoading] = useState(false);

  // 搜索
  const handleSearch = async (e?: React.FormEvent, kw?: string) => {
    if (e) e.preventDefault();
    const q = (kw ?? keyword).trim();
    setLoading(true);
    try {
      const res = await fetch(`/api/results${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDemoMode) handleSearch();
  }, []);

  // 点"查看链接"
  const handleViewLink = async (result: ResultItem, tab: "wx" | "ali") => {
    const clientId = localStorage.getItem("pansou_client_id") ?? "";
    setActiveTab(tab);
    setPayResultId(result.id);
    setShowLinkResult(false);
    setLinkData(null);

    try {
      const data = await fetch("/api/pay/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-client-id": clientId },
        body: JSON.stringify({ resultId: result.id, channel: tab }),
      }).then((r) => r.json());

      if (data.unlocked) {
        const link = await fetch(`/api/results/${result.id}/link`, {
          headers: { "x-client-id": clientId },
        }).then((r) => r.json());
        setLinkData({ shareUrl: link.shareUrl, extractCode: link.extractCode });
        setShowLinkResult(true);
        return;
      }

      setOrderNo(data.orderNo ?? null);
      setQrContent(data.qrCodeContent ?? null);
      setIsDemo(!!data.demo);
      setModalOpen(true);
    } catch (e: any) {
      alert(`创建订单失败：${e?.message}`);
    }
  };

  // 模拟支付成功（演示模式）
  const handleMockPay = async () => {
    if (!orderNo) return;
    try {
      await fetch("/api/pay/mock/paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo }),
      });

      const next = new Set(unlockedSet);
      next.add(payResultId);
      setUnlockedSet(next);
      saveDemoUnlocked(next);

      const clientId = localStorage.getItem("pansou_client_id") ?? "";
      const link = await fetch(`/api/results/${payResultId}/link`, {
        headers: { "x-client-id": clientId },
      }).then((r) => r.json());
      setLinkData({ shareUrl: link.shareUrl, extractCode: link.extractCode });
      setShowLinkResult(true);
      setModalOpen(false);
    } catch (e: any) {
      alert(`模拟支付失败：${e?.message}`);
    }
  };

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => alert("链接已复制到剪贴板"));
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 bg-white border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold text-gray-900 tracking-tight">盘搜</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">网盘资源 · 按次付费</span>
            {isDemoMode && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">演示模式</span>
            )}
          </div>
        </div>
      </header>

      {/* 搜索区 */}
      <section className="bg-white border-b border-zinc-200">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">搜资源 · 2元解锁</h1>
          <p className="text-sm text-gray-500 mb-6">每次支付 ¥2.00 即可查看一条资源的分享链接</p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              className="flex-1 h-11 px-4 rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              placeholder="搜索网盘资源..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <button
              type="submit"
              className="h-11 px-6 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all"
            >
              搜索
            </button>
          </form>
        </div>
      </section>

      {/* 结果列表 */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">加载中...</div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            {results.map((r) => {
              const unlocked = unlockedSet.has(r.id);
              return (
                <div key={r.id} className="bg-white rounded-xl border border-zinc-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                      <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                        <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{r.panType}</span>
                        {r.size && <span>{r.size}</span>}
                        {r.updated && <span>{r.updated}</span>}
                      </div>
                    </div>
                    {unlocked ? (
                      <button
                        onClick={() => {
                          const raw = `${r.shareUrl}${r.extractCode ? "  提取码: " + r.extractCode : ""}`;
                          copyLink(raw);
                        }}
                        className="shrink-0 text-xs text-green-600 border border-green-200 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        ✅ 已解锁 · 复制
                      </button>
                    ) : (
                      <div className="shrink-0 flex gap-1.5">
                        <button
                          onClick={() => handleViewLink(r, "wx")}
                          className="text-xs text-green-600 border border-green-100 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                        >
                          微信 ¥2
                        </button>
                        <button
                          onClick={() => handleViewLink(r, "ali")}
                          className="text-xs text-blue-600 border border-blue-100 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          支付宝 ¥2
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400 text-sm">输入关键词开始搜索</div>
        )}
      </main>

      {/* 支付弹窗 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <span className="text-base font-semibold text-gray-900">支付解锁</span>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex px-5 mt-3 gap-1 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setActiveTab("wx")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "wx" ? "bg-white text-green-600 shadow-sm" : "text-gray-500"
                }`}
              >
                微信支付
              </button>
              <button
                onClick={() => setActiveTab("ali")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  activeTab === "ali" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                }`}
              >
                支付宝
              </button>
            </div>
            <div className="px-5 pt-4 text-center">
              <span className="text-3xl font-bold text-gray-900">¥2.00</span>
              <p className="text-xs text-gray-400 mt-1">每条资源 ¥2.00，按次计费，即付即用</p>
            </div>
            <div className="flex justify-center px-5 py-5">
              <div className="w-[200px] h-[200px] flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-100 gap-2">
                {activeTab === "wx" ? (
                  <>
                    <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-green-500 text-white text-2xl font-bold">W</div>
                    <span className="text-xs text-green-600 font-medium">微信扫码支付</span>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 flex items-center justify-center rounded-xl bg-blue-500 text-white text-2xl font-bold">A</div>
                    <span className="text-xs text-blue-600 font-medium">支付宝扫码支付</span>
                  </>
                )}
                <span className="text-xs text-gray-400 mt-1">订单号：{orderNo?.slice(-12) ?? "-"}</span>
              </div>
            </div>
            <div className="px-5 pb-5 text-center">
              <p className="text-xs text-gray-400">
                {activeTab === "wx" ? "打开微信扫一扫" : "打开支付宝扫一扫"} · 支付完成后自动解锁
              </p>
            </div>
            {isDemo && (
              <div className="px-5 pb-5">
                <button
                  onClick={handleMockPay}
                  className="w-full bg-yellow-400 text-yellow-900 text-sm font-bold py-3 rounded-xl hover:bg-yellow-300 active:scale-95 transition-all shadow-sm"
                >
                  🧪 模拟支付成功（演示用）
                </button>
                <p className="text-center text-xs text-gray-400 mt-2">上线后替换为真实微信/支付宝二维码</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 解锁结果弹窗 */}
      {showLinkResult && linkData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLinkResult(false)} />
          <div className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5 pb-0">
              <span className="text-base font-semibold text-green-600">✅ 支付成功</span>
              <button onClick={() => setShowLinkResult(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-6">
              <p className="text-xs text-gray-400 mb-4">以下为该资源的分享链接，复制后直接打开即可</p>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-400 mb-1">分享链接</p>
                  <div className="flex gap-2">
                    <input readOnly value={linkData.shareUrl} className="flex-1 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2 truncate" />
                    <button onClick={() => copyLink(linkData.shareUrl)} className="shrink-0 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">复制</button>
                  </div>
                </div>
                {linkData.extractCode && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">提取码</p>
                    <div className="flex gap-2">
                      <input readOnly value={linkData.extractCode} className="flex-1 text-sm text-gray-800 bg-white border border-gray-200 rounded-lg px-3 py-2" />
                      <button onClick={() => copyLink(linkData.extractCode ?? "")} className="shrink-0 text-xs bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors">复制</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}