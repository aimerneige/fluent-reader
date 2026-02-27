# Fluent Reader 依赖更新计划

> 调查时间：2026-02-27
> 项目当前共有 34 个已知安全漏洞（8 low, 7 moderate, 10 high, 9 critical）

---

## 🔴 P0 - 紧急（存在安全漏洞 / 已废弃，必须尽快处理）

### 已废弃或停止维护的包

| 包名 | 当前版本 | 最新版本 | 说明 |
|------|---------|---------|------|
| `redux-devtools` | ^3.5.0 | 3.7.0 (已废弃) | 已迁移至 `@redux-devtools/core`，需替换 |
| `nedb` | ^1.8.0 | 1.8.0 | 多年未更新，依赖含 critical 漏洞（`underscore` 等），建议替换为 `nedb-promises` 或其他方案 |
| `lovefield` | ^2.1.12 | 2.1.12 | Google 已停止维护，依赖含 critical 漏洞（`argparse`, `js-yaml`），建议替换 |
| `electron-react-devtools` | ^0.5.3 | 0.5.3 | 多年未更新，现代 Electron 已内置 React DevTools 支持，建议移除 |

### 存在高危安全漏洞的包

| 包名 | 当前版本 | 最新版本 | 漏洞等级 | 说明 |
|------|---------|---------|---------|------|
| `electron-builder` | ^23.0.3 | 26.8.1 | 🔴 high / critical | NSIS 安装器任意代码执行漏洞（CVE），需升级到 ^26 |
| `webpack` | ^5.89.0 | 5.98.0+ | 🔴 high | `buildHttp` 存在 SSRF 漏洞，可通过 `npm audit fix` 修复 |

---

## 🟠 P1 - 高优先级（主版本跨越大，影响面广）

### React 生态全家桶升级

> ⚠️ 这是一个联动升级项，以下包需要一起升级。React 16 → 19 是一次重大迁移，涉及大量 Breaking Changes。

| 包名 | 当前版本 | 最新版本 | 跨越主版本 |
|------|---------|---------|-----------|
| `react` | ^16.13.1 (实际 16.14.0) | 19.2.4 | 16 → 19 (跨 3 个大版本) |
| `react-dom` | ^16.13.1 (实际 16.14.0) | 19.2.4 | 16 → 19 (跨 3 个大版本) |
| `@types/react` | ^16.9.35 | 19.2.14 | 16 → 19 |
| `@types/react-dom` | ^16.9.8 | 19.2.3 | 16 → 19 |
| `@fluentui/react` | ^7.126.2 (实际 7.204.1) | 8.125.5 | 7 → 8 (Fluent UI v8 也需要 React 16.8+) |
| `react-redux` | ^7.2.0 | 9.2.0 | 7 → 9 |
| `qrcode.react` | ^1.0.0 | 4.2.0 | 1 → 4 |
| `react-intl-universal` | ^2.2.5 | 2.13.4 | 同主版本，但需配合 React 升级测试 |

### 状态管理升级

| 包名 | 当前版本 | 最新版本 | 说明 |
|------|---------|---------|------|
| `redux` | ^4.0.5 | 5.0.1 | Redux 5 有 Breaking Changes，建议同时考虑迁移到 Redux Toolkit |
| `redux-thunk` | ^2.3.0 | 3.1.0 | 随 Redux 5 一起升级 |
| `reselect` | ^4.0.0 | 5.1.1 | 随 Redux 一起升级 |

---

## 🟡 P2 - 中优先级（主版本升级，但影响面较小）

| 包名 | 当前版本 | 最新版本 | 说明 |
|------|---------|---------|------|
| `electron` | ^34.3.0 (实际 40.6.1) | 40.6.1 | 实际已超出 `wanted` 版本，应确认是否需要锁定到 ^34 或更新到 ^40 |
| `electron-store` | ^5.2.0 | 11.0.2 | 5 → 11，跨多个大版本，改为 ESM-only，需要适配 |
| `font-list` | ^1.4.2 (实际 1.6.0) | 2.0.2 | 1 → 2 |
| `node-polyfill-webpack-plugin` | ^2.0.1 (实际 4.1.0) | 4.1.0 | 实际已超出 `wanted`，应更新 `package.json` 声明 |

---

## 🟢 P3 - 低优先级（小版本升级，风险低）

| 包名 | 当前版本 | 最新版本 | 说明 |
|------|---------|---------|------|
| `prettier` | 2.3.2 (实际 3.8.1) | 3.8.1 | 纯开发工具，不影响运行时，可安全升级 |
| `ts-loader` | ^7.0.4 (实际 9.5.4) | 9.5.4 | 实际已超出 `wanted`，应更新 `package.json` 声明 |
| `webpack-cli` | ^5.1.4 (实际 6.0.1) | 6.0.1 | 实际已超出 `wanted`，应更新 `package.json` 声明 |
| `js-md5` | ^0.7.3 | 0.8.3 | 小版本升级 |
| `rss-parser` | ^3.13.0 | 3.13.0 | 当前已是最新，无需更新 |
| `@types/lovefield` | ^2.1.3 | 2.1.3 | 当前已是最新（但 lovefield 本身需要替换） |
| `@types/marked` | ^5.0.2 | - | 需配合 `marked` 版本确认 |
| `@types/nedb` | ^1.8.9 | - | 若 nedb 被替换则移除 |

---

## 📝 需要注意的特殊情况

### `package.json` 版本声明与实际安装不一致

以下包的实际安装版本已超出 `package.json` 中 `wanted` 范围，建议对齐：

| 包名 | `package.json` 声明 | 实际安装 | wanted |
|------|-------------------|---------|--------|
| `electron` | ^34.3.0 | 40.6.1 | 34.5.8 |
| `electron-builder` | ^23.0.3 | 26.8.1 | 23.6.0 |
| `prettier` | 2.3.2 | 3.8.1 | 2.3.2 |
| `ts-loader` | ^7.0.4 | 9.5.4 | 7.0.5 |
| `webpack-cli` | ^5.1.4 | 6.0.1 | 5.1.4 |
| `node-polyfill-webpack-plugin` | ^2.0.1 | 4.1.0 | 2.0.1 |

> 这说明 `package-lock.json` 可能被手动修改过，或者在没有更新 `package.json` 的情况下直接安装了新版本。建议清理并对齐版本声明。

---

## 📋 建议的升级顺序

1. **第一阶段**：修复安全漏洞
   - [ ] 运行 `npm audit fix` 修复可自动修复的漏洞
   - [ ] 升级 `electron-builder` 到 ^26
   - [ ] 移除 `electron-react-devtools`（已过时）
   - [ ] 移除 `redux-devtools`，替换为 `@redux-devtools/core` 或使用浏览器扩展

2. **第二阶段**：替换废弃包
   - [ ] 评估 `nedb` 替代方案（如 `nedb-promises`、`better-sqlite3`、`lowdb`）
   - [ ] 评估 `lovefield` 替代方案（如 `sql.js`、`Dexie.js`）
   - [ ] 清理相关 `@types` 包

3. **第三阶段**：React 生态升级
   - [ ] React 16 → 18（先不直接跳到 19，降低风险）
   - [ ] 同步升级 `@fluentui/react` v7 → v8
   - [ ] 同步升级 `react-redux`, `qrcode.react`, `react-intl-universal`

4. **第四阶段**：状态管理升级
   - [ ] 升级 `redux` 到 v5（或迁移到 Redux Toolkit）
   - [ ] 同步升级 `redux-thunk`, `reselect`

5. **第五阶段**：工具链和小版本更新
   - [ ] 对齐 `package.json` 版本声明
   - [ ] 升级 `prettier`, `ts-loader`, `webpack-cli` 等
   - [ ] 升级 `electron-store`, `font-list`, `js-md5` 等

6. **第六阶段**（可选）：React 18 → 19
   - [ ] 评估是否需要进一步升级到 React 19
