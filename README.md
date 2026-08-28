# ⚡ ZCode TPS Monitor HUD (桌面原生实时悬浮窗 + Web HUD + Coding Plan 额度监控)

一款专为 ZCode / Claude Code 设计的**独立桌面实时性能监控悬浮窗与设置中心（Floating HUD & Settings Center）**。

无需修改 ZCode 核心代码或破坏运行进程，通过轻量级**只读**异步监听 SQLite WAL 数据库（`readOnly: true` + `PRAGMA query_only`），在 Windows 桌面与浏览器中以高颜值悬浮条实时呈现 Token 生成速率、推理/思考 Token、缓存命中率、精确计费（美元+人民币）、多会话切换与 **Coding Plan 订阅额度（5h / 7d / 30d 滚动限额）自动核算**。

---

## ✨ 核心特性

- 🪟 **原生透明磨砂悬浮窗（ZCodeHud.exe，纯 WPF）**：自由拖拽、透明度调节、置顶、6 款主题。
- 🌐 **Web HUD（hud-server.mjs）**：浏览器访问 `http://127.0.0.1:38291/hud`，与 WPF 版同数据源、同设置文件；页签隐藏时自动暂停轮询。
- 📡 **后台数据采集器（poll-metrics.mjs）**：
  - **要求 Node.js ≥ 22.5**（内置 `node:sqlite` 模块；启动时有显式版本守卫，不满足时写入 `poller-error.log` 并在 WPF 端横幅提示）。
  - **单实例锁**：`poller.lock` 记录 PID 并每 5s 心跳刷新；重复启动自动退出，僵尸锁（心跳 >15s）自动接管。
  - **变更指纹跳过**：settings.json (mtime+size) + SQLite `PRAGMA data_version` 未变化时跳过全部重查询；模型计价与单条记录费用带缓存。
  - **TPS 守卫**：缺失/零时长的完成轮次不再除以 1ms 下限（历史 1000 倍爆炸已封堵），`avgTps` 只聚合有真实时长的完成轮次。
- ⚙️ **设置中心（WPF 弹窗 + Web 抽屉，双端共用 settings.json）**：
  - 会话切换（自动追踪最新活跃会话 / 指定会话）、6 款主题：🍎 AppleGlass、🌐 GoogleMaterial、⚡ CyberpunkNeon、🌿 NordicClean、📰 Newspaper、🌌 ObsidianPro。
  - 透明度 30%~100%、刷新频率 200ms/500ms/1000ms、置顶开关。
  - 10 项显示开关（TPS / 平均 TPS / 波形图 / 耗时·TTFT / 输入 / 输出 / 思维链 / 缓存命中率 / 单轮费用 / 会话统计）。
  - **双端写盘均为原子写（tmp + rename/Replace），Web POST 采用深合并**，WPF 与 Web 互不覆盖对方键；WPF 的额度开关与 Web 的 `planSettings.enabled` 双向对齐。
- 💰 **精准计费**：内置多厂商价格目录（`pricing-catalog.mjs`，冻结不可变），支持 UUID 前缀剥离、后缀/子串模糊匹配与用户自定义模型价（`customModels`）；自动折算美元与人民币（汇率可调）。
- 🚀 **Coding Plan 额度监控**（`plan-quota-detector.mjs`）：OpenCode Go（$12/5h、$30/7d、$60/30d 滚动窗口）、智谱 GLM Token 包、DeepSeek 余额、自定义计划；支持告警分级（normal / warning / critical）。

---

## 🚀 启动与使用

### 方式 1：双击一键启动（WPF 悬浮窗）
直接在 Windows 资源管理器中双击运行：
`C:\Users\30959\.claude\projects\bin\MC-mod\zcode-tps-hud\start-hud.bat`
（或 PowerShell 版 `start-hud.ps1`；首次运行若无 exe 会自动调用 `compile.mjs` 编译。）

### 方式 2：Node 一键启动（采集器 + WPF 悬浮窗）
```bash
node start-all.mjs
```

### 方式 3：Web HUD
```bash
node hud-server.mjs            # 默认会同时拉起 WPF 窗口
node hud-server.mjs --no-launch # 仅启动 Web 服务
```
然后浏览器打开 `http://127.0.0.1:38291/hud`。

### 方式 4：随 ZCode 自动启动（发布级，零配置 ✅）
程序内置**首次启动自动初始化**：任意用户解压后直接运行 `ZCodeHud.exe`，程序会自动：
- 探测当前用户的 ZCode 配置（`~/.zcode/cli/config.json`，无需同机预配置）；
- 自动注册 `SessionStart` 钩子——此后 ZCode 每次启动新会话（startup/resume/clear/compact）都会自动后台拉起 HUD；
- 自动定位当前用户的 ZCode 数据库（`~/.zcode/cli/db/db.sqlite`），自动追踪最新活跃会话；
- 幂等自愈：每次启动都会校准钩子路径（程序挪目录自动修复）、写前自动备份 `config.json.hud-bak`、绝不破坏已有配置（损坏时自动备份后重建钩子块）。

初始化失败时 HUD 内会显示警告横幅（如未检测到 Node.js ≥ 22.5）。如需手动修复绑定可运行 `node install-hook.mjs`。

### 端口/API 一览（仅监听 127.0.0.1）
| 端点 | 说明 |
| --- | --- |
| `GET /hud` | Web HUD 页面 |
| `GET /api/metrics` | 实时指标（读取 live-metrics.json，带 no-store） |
| `GET /api/settings` | 读取 settings.json |
| `POST /api/settings` | 深合并写入 settings.json（对象限长 1MB） |
| `POST /api/simulate` | 测试用模拟数据（空 body 恢复真实数据） |

### 重新编译 WPF 悬浮窗
```bash
node compile.mjs   # 调用 .NET Framework 4 csc.exe（C#5 语法兼容）
```

---

## 🎮 悬浮窗交互指南

1. **移动位置**：鼠标左键按住悬浮窗的任意空白区域即可平滑拖动。
2. **打开设置中心**：点击右上角 **⚙ 齿轮图标**，打开独立配置窗口（打开时会重新读取 settings.json，自动带出 Web 端的最新改动）。
3. **单轮费用 / 额度切换**：Web HUD 中点击费用徽章可在「单轮费用 / Coding Plan 额度」间切换，再点额度徽章展开各滚动周期明细。
4. **最小化 / 收起**：WPF 为窗口最小化；Web HUD 为折叠成一行（再次点开时自动尊重各项显示开关）。
5. **关闭退出**：点击右上角 **✕ 按钮** 即可退出（后台采集器不受影响）。

---

## 📁 关键文件

| 文件 | 说明 |
| --- | --- |
| `poll-metrics.mjs` | 后台采集器（只读 SQLite → live-metrics.json） |
| `pricing-catalog.mjs` / `plan-quota-detector.mjs` | 计价目录（冻结）与额度检测 |
| `hud-server.mjs` / `hud-web.html` | Web HUD 服务与前端 |
| `ZCodeHud.cs` + `compile.mjs` | WPF 悬浮窗源码与编译脚本 |
| `settings.json` / `live-metrics.json` | 共享设置与实时指标数据 |
| `poller.lock` / `poller-error.log` | 采集器单实例锁（心跳）与错误日志 |
