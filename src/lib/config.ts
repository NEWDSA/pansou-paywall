// 客户端可安全读取的环境变量（无需 Node.js）
// 所有前端代码从此文件读取环境配置

// NEXT_PUBLIC_ 前缀的变量会被 Next.js 注入到客户端 bundle
export const isDemoMode = !(
  process.env.NEXT_PUBLIC_DB_CONFIGURED === "true"
);

export const DEMO_RESULTS = [
  { id: 1, title: "Python全栈开发教程（完整版）", panType: "百度网盘", size: "12.4 GB", updated: "2025-04-10", shareUrl: "https://pan.baidu.com/s/demo1", extractCode: "py12" },
  { id: 2, title: "考研数学全套视频课程", panType: "阿里云盘", size: "8.7 GB", updated: "2025-05-01", shareUrl: "https://www.aliyundrive.com/s/demo2", extractCode: null },
  { id: 3, title: "Adobe 2025 全家桶破解版", panType: "夸克网盘", size: "25.1 GB", updated: "2025-03-22", shareUrl: "https://pan.quark.cn/s/demo3", extractCode: "ab25" },
  { id: 4, title: "2025最新公务员上岸资料合集", panType: "百度网盘", size: "3.2 GB", updated: "2025-05-08", shareUrl: "https://pan.baidu.com/s/demo4", extractCode: "gw25" },
  { id: 5, title: "TED演讲合集（中英字幕 800部）", panType: "115网盘", size: "150 GB", updated: "2025-04-30", shareUrl: "https://115.com/s/demo5", extractCode: "ted80" },
  { id: 6, title: "小阿CTO架构师课程（含源码）", panType: "阿里云盘", size: "45.6 GB", updated: "2025-05-12", shareUrl: "https://www.aliyundrive.com/s/demo6", extractCode: "cto45" },
];