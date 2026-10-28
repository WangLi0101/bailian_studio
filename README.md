# 百炼创作工坊 · Bailian Studio

基于 **Tauri 2 + React 19 + TypeScript + Tailwind CSS 4** 的桌面端 AI 创作工作台，接入阿里云百炼（DashScope）的文生图、文生视频与图生视频能力。Base URL 与 API Key 均在应用内配置，密钥只保存在本机。

![Tauri 2](https://img.shields.io/badge/Tauri-2-24C8DB)
![React 19](https://img.shields.io/badge/React-19-61DAFB)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8)

## 功能

- **图片创作**：Wan 2.2 / 2.5 / 2.1 文生图模型，比例预设、1–4 张批量生成、负向提示词、提示词智能优化。
- **视频创作**：文生视频与图生视频；按模型自动切换像素尺寸 / 清晰度档位与可选时长。
- **自定义模型**：在设置中添加百炼新上线或业务空间专属的模型 ID，可选图片 / 文生视频 / 图生视频，并配置尺寸、清晰度、时长与提示词上限。
- **作品库**：生成结果自动收藏，支持类型筛选、提示词搜索、下载、删除与详情预览；链接失效前及时下载。
- **图片转视频**：生成结果一键「用作视频首帧」，自动切换到图生视频模型。
- **桌面体验**：Material 3 风格界面、导航栏、深浅色主题、4 套强调色、无边框预览、进度环、Toast 通知。
- **本地持久化**：设置与作品库保存在 WebView `localStorage`；生成文件由 Rust 下载到系统「下载」目录。
- **Rust 代理**：所有 DashScope 请求通过 Rust `reqwest` 发出，避免 WebView 的 CORS 限制，API Key 不经过任何第三方服务器。

## 支持的模型

> 模型可用性与计费以[阿里云百炼控制台](https://bailian.console.aliyun.com/)为准，需先在控制台开通对应模型。

| 类型 | 模型 ID | 尺寸 / 分辨率 | 时长 |
| --- | --- | --- | --- |
| 文生图 | `wan2.2-t2i-flash` | 单边 512–1440 | — |
| 文生图 | `wan2.2-t2i-plus` | 单边 512–1440 | — |
| 文生图 | `wan2.5-t2i-preview` | 1280×1280 ～ 1440×1440 总像素，宽高比 1:4–4:1 | — |
| 文生图 | `wanx2.1-t2i-turbo` / `wanx2.1-t2i-plus` | 单边 512–1440 | — |
| 文生视频 | `wan2.2-t2v-plus` | 480P / 1080P | 5s |
| 文生视频 | `wan2.5-t2v-preview` | 480P / 720P / 1080P | 5 / 10s |
| 文生视频 | `wanx2.1-t2v-turbo` | 480P / 720P | 5s |
| 图生视频 | `wan2.2-i2v-plus` | 480P / 1080P | 5s |
| 图生视频 | `wan2.5-i2v-preview` | 480P / 720P / 1080P | 5 / 10s |
| 图生视频 | `wanx2.1-i2v-turbo` | 480P / 720P | 3 / 4 / 5s |

说明：

- 除内置模型外，可在「设置 → 自定义模型」中手动添加模型：填写控制台中的模型 ID，选择图片 / 视频类型；图片与文生视频可指定 `宽*高` 尺寸，图生视频可指定 `480P / 720P / 1080P` 清晰度，另可设置可选时长与提示词上限。留空时使用内置的常用参数。
- 自定义模型仅适用于百炼文生图（`text2image/image-synthesis`）与视频生成（`video-generation/video-synthesis`）异步接口，模型需已在控制台开通。
- 文生视频通过 `parameters.size` 传具体像素（如 `1280*720`）；图生视频通过 `parameters.resolution` 传档位（如 `720P`），画面比例跟随首帧图片。
- Wan 2.5 视频默认生成有声视频，可能产生额外费用。
- 生成结果 URL 由百炼提供，通常 **24 小时** 后失效，请及时下载保存。

## 环境要求

- Node.js ≥ 20、pnpm ≥ 9
- Rust stable（`rustup`）+ 系统构建依赖
- macOS / Windows / Linux（WebView2 随 Windows 10/11 提供）

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动桌面应用（首次会编译 Rust，耗时较长）
pnpm app:dev

# 仅启动前端预览（浏览器中受 CORS 限制，建议用桌面模式）
pnpm dev

# 构建前端
pnpm build

# 打包桌面安装包
pnpm app:build
```

首次启动后进入「设置」：

1. 选择 Base URL（北京站 `https://dashscope.aliyuncs.com` 或新加坡站 `https://dashscope-intl.aliyuncs.com`）。
2. 填入在百炼控制台创建的 API Key（`sk-` 开头）。
3. 点击「保存并测试连接」。

> 若使用业务空间专属域名（如 `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`），直接填入 Base URL 即可；密钥需与地域匹配。

## 项目结构

```
src/
  components/        通用 UI、导航、模型选择、进度、灯箱等
  context/           全局设置、主题、作品库、Toast
  hooks/             异步任务轮询、媒体操作
  lib/               API 客户端、模型目录、本地存储、工具函数
  pages/             图片创作 / 视频创作 / 作品库 / 设置
src-tauri/
  src/lib.rs         api_request 代理与 download_file 下载命令
  tauri.conf.json    窗口与打包配置
```

## 实现要点

- **异步任务**：创建任务时携带 `X-DashScope-Async: enable`，随后每 2.5s 轮询 `GET /api/v1/tasks/{task_id}`，状态流转为 `PENDING → RUNNING → SUCCEEDED / FAILED`。
- **多页保活**：四个页面保持挂载，切换时只隐藏，避免丢失提示词与正在轮询的任务状态。
- **参数适配**：模型尺寸、清晰度档位、时长与提示词长度上限均按官方文档在 `src/lib/models.ts` 中声明，界面随模型自动收敛到合法值。
- **下载**：Rust 端以 `response.bytes()` 读取后写入系统下载目录，自动处理重名与扩展名。

## 安全说明

- API Key 保存在本机 WebView 存储中，不会上传到除 DashScope 之外的任何地址，也不写入日志。
- 若设备多人共用，建议使用后点击「清除密钥」，或为应用单独创建一枚可随时吊销的 API Key。
- `api_request` 命令仅接受 `http/https` URL，并限制文件下载文件名中的路径分隔符，避免目录穿越。

## 常见问题

**提示 API Key 无效 / 403**
确认密钥归属地域与 Base URL 一致（北京站与新加坡站的密钥不通用），并已在百炼控制台开通对应模型。

**「模型不可用」或 `UnsupportedModel`**
模型可能未在当前地域开放，或账号未开通。可在设置中切换其他模型，或前往控制台确认。

**视频一直排队 / 超时**
高峰时段排队较久，属正常现象。应用最多轮询约 13 分钟；可点击「停止等待」，任务仍可能在云端继续生成，稍后到百炼控制台查看。

**下载失败**
生成链接有效期约 24 小时，过期后无法下载；请重新生成，或在详情弹窗中打开原始链接确认是否仍有效。

**浏览器预览下请求失败**
DashScope 不支持浏览器直连的 CORS 预检，请使用 `pnpm app:dev` 启动桌面应用。

## 许可

本项目仅用于学习与个人创作，模型与生成内容的使用需遵守[阿里云百炼服务条款](https://help.aliyun.com/zh/model-studio/)及相关法律法规。