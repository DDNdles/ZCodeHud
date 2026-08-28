# Changelog

All notable changes to **ZCodeHUD** are documented here. This project adheres to
[Semantic Versioning](https://semver.org/) (`MAJOR.MINOR.PATCH`).

## [v1.0.1] - 2026-08-28

Maintenance release (no user-facing behavior change).

### Added
- 发布工程化：CHANGELOG.md、CI 自动构建工作流（`.github/workflows/build.yml`）、Bug / Feature 模板与 PR 模板。

### Fixed
- 构建脚本 `compile.mjs` 改为从 `src/ZCodeHud.cs` 读取源文件（此前仓库已整理源码目录但构建仍指向根目录，会导致本地与 CI 构建失败）。

[v1.0.1]: https://github.com/DDNdles/ZCodeHud/releases/tag/v1.0.1

## [v1.0.0] - 2026-08-28

First public, release-grade version.

### Added
- **透明常驻悬浮窗**（原生 WPF）：实时显示 ZCode / Claude 的 TPS、token 成本（USD / CNY）、缓存命中率与多会话指标。
- **零配置自启动**：首次启动自动向 ZCode 注册 `SessionStart` 钩子；之后 ZCode 每次启动 HUD 自动跟随。安装器幂等自愈、自动备份用户配置、缺失启动器时安全拒绝。
- **Node 后端采集器**：基于 `node:sqlite` 以只读方式读取 ZCode 数据库，计算 TPS / 成本 / 缓存命中，仅监听 `127.0.0.1`。
- **单实例互斥锁**：避免 ZCode 多次触发启动堆叠多个悬浮窗。
- **定价目录 + 自定义模型规则**：支持计划额度检测与告警阈值。
- **发布级安装包** `ZCodeHud-v1.0-windows-x64.zip`：解压即运行，含首次初始化。

### Notes
- 运行需求：Windows + .NET Framework 4（系统自带）以及 Node.js ≥ 22.5（后端采集器）。
- 当前 `ZCodeHud.exe` 未做代码签名，首次运行可能被 SmartScreen 提示“未知发布者”，属正常现象。

[v1.0.0]: https://github.com/DDNdles/ZCodeHud/releases/tag/v1.0.0
