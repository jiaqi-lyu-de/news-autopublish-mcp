# MCP Toutiao & News Server

> 🌐 [English](#english) | [中文](#中文)

---

<a name="english"></a>

## 🇬🇧 English

An MCP ([Model Context Protocol](https://modelcontextprotocol.io/)) server that automates a full end-to-end pipeline: **fetch real-time global breaking news → auto-publish to Toutiao** — all driven by an AI assistant like Claude.

### 🗞️ What is Toutiao?

[Toutiao (今日头条)](https://www.toutiao.com/) is China's largest AI-powered news and content platform, operated by ByteDance (the company behind TikTok). With over **300 million daily active users**, it is the dominant content distribution channel in China — roughly analogous to a combination of Google News and Medium. This project enables automated content publishing to Toutiao's creator platform via browser automation.

### 🔄 Core Workflow

```
Event Registry API  ──▶  get_breaking_news  ──▶  toutiao_publish_article  ──▶  Toutiao
  (global news)               (fetch)                   (auto-publish)          (platform)
```

Claude (or any MCP-compatible AI) orchestrates the entire pipeline: it fetches breaking news from a third-party news API, then automatically publishes the content to your Toutiao creator account — no manual copy-pasting required.

### ✨ Features

**Toutiao Automation**
- `toutiao_login` — Generate a QR code login and automatically monitor scan status; saves session cookies on success.
- `toutiao_check_status` — Check whether the current Toutiao session is still valid.
- `toutiao_logout` — Safely sign out and remove local credential files.
- `toutiao_publish_article` — Publish an article with a title, body, and optional cover image.

**News Fetching**
- `get_breaking_news` — Pull real-time global breaking news via the [Event Registry API](https://eventregistry.org/), providing the raw content for publishing.

**Technical Highlights**
- 🔐 **Cookie persistence** — Automatically manages `cookies.json` so you don't need to scan a QR code every session.
- 🛡️ **Privacy-first** — API keys and cookies are stored via environment variables and local files; never bundled with source code.
- 🤖 **Puppeteer-powered** — Simulates a real browser for reliable, stable automation against Toutiao's creator portal.

---

### 🚀 Quick Start

#### 1. Install Dependencies

Requires [Node.js](https://nodejs.org/).

```bash
npm install
```

#### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Open `.env` and add your API key:

```env
NEWS_API_KEY=your_event_registry_api_key
```

#### 3. Run & Debug

**Development mode (MCP Inspector):**
```bash
npm run inspect
```

**Integrate with Claude Desktop** — Add this to your `claude_desktop_config.json`:

> Typically found at `~/Library/Application Support/Claude/` (macOS)

```json
{
  "mcpServers": {
    "toutiao-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/toutiao-mcp/src/server.js"],
      "env": {
        "NEWS_API_KEY": "your_api_key"
      }
    }
  }
}
```

---

### 🛠️ Tool Reference

| Tool | Description | Parameters |
| :--- | :--- | :--- |
| `toutiao_login` | Generate a QR code and wait for scan | — |
| `toutiao_check_status` | Check Toutiao login status | — |
| `toutiao_logout` | Clear login credentials | — |
| `toutiao_publish_article` | Publish an article | `title`, `content`, `imagePath` |
| `get_breaking_news` | Fetch global breaking news | — |

---

### ⚠️ Notes

- **Chromium download** — Puppeteer will auto-download a Chromium binary on first run. Ensure you have a stable network connection.
- **QR code rendering** — `toutiao_login` returns a Base64-encoded QR code image that Claude can render directly for the user to scan.
- **Security** — `cookies.json` contains sensitive session tokens. It is included in `.gitignore` by default — never commit it to source control.

---

### 📄 License

[ISC License](./LICENSE)

---
---

<a name="中文"></a>

## 🇨🇳 中文

基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的功能型服务器，实现完整的端到端自动化流程：**获取全球突发新闻 → 自动发布到今日头条**，全程由 Claude 等 AI 助手驱动编排。

### 🔄 核心工作流

```
Event Registry API  ──▶  get_breaking_news  ──▶  toutiao_publish_article  ──▶  今日头条
    （新闻源）                （抓取资讯）               （自动发布）             （平台）
```

AI 助手负责编排整个流程：从第三方新闻 API 拉取突发资讯，再自动发布到您的头条创作者账号，无需手动复制粘贴。

### ✨ 功能特性

**今日头条自动化**
- `toutiao_login` — 获取登录二维码，后台自动监听扫码状态，登录成功后持久化保存 Cookie。
- `toutiao_check_status` — 实时检查当前头条登录会话是否仍然有效。
- `toutiao_logout` — 安全退出登录，并清除本地凭证文件。
- `toutiao_publish_article` — 自动化发布文章，支持标题、正文及本地封面图。

**全球资讯获取**
- `get_breaking_news` — 通过 [Event Registry API](https://eventregistry.org/) 实时拉取全球突发热点新闻，作为自动发布的内容来源。

**技术亮点**
- 🔐 **Cookie 持久化** — 自动管理 `cookies.json`，避免每次会话重复扫码。
- 🛡️ **隐私安全** — API Key 与 Cookie 均通过环境变量和本地文件管理，不随代码库分发。
- 🤖 **Puppeteer 驱动** — 模拟真实浏览器行为，确保在头条创作者平台上自动化操作的稳定性。

---

### 🚀 快速开始

#### 1. 安装依赖

请确保系统已安装 [Node.js](https://nodejs.org/)。

```bash
npm install
```

#### 2. 配置环境变量

```bash
cp .env.example .env
```

在 `.env` 文件中填入您的 API Key：

```env
NEWS_API_KEY=your_event_registry_api_key
```

#### 3. 启动与调试

**开发者模式（MCP Inspector）：**
```bash
npm run inspect
```

**集成到 Claude Desktop** — 将以下内容添加至 `claude_desktop_config.json`：

> 文件通常位于 `~/Library/Application Support/Claude/`（macOS）

```json
{
  "mcpServers": {
    "toutiao-mcp": {
      "command": "node",
      "args": ["/绝对路径/到/toutiao-mcp/src/server.js"],
      "env": {
        "NEWS_API_KEY": "your_api_key"
      }
    }
  }
}
```

---

### 🛠️ 工具详情

| 工具名称 | 描述 | 参数 |
| :--- | :--- | :--- |
| `toutiao_login` | 获取登录二维码并等待扫码 | 无 |
| `toutiao_check_status` | 检查头条登录状态 | 无 |
| `toutiao_logout` | 清除登录凭证 | 无 |
| `toutiao_publish_article` | 发布头条文章 | `title`, `content`, `imagePath` |
| `get_breaking_news` | 获取全球突发新闻 | 无 |

---

### ⚠️ 注意事项

- **Chromium 下载** — Puppeteer 在首次运行时会自动下载 Chromium 内核，请确保网络通畅。
- **二维码渲染** — `toutiao_login` 会返回 Base64 格式的二维码图片，AI 可直接渲染供用户扫描。
- **安全提示** — `cookies.json` 包含敏感登录令牌，已默认加入 `.gitignore`，**切勿提交至代码库**。

---

### 📄 开源协议

[ISC License](./LICENSE)