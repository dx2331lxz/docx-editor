# DocxEditor

一个功能完整的在线文档编辑器，支持 docx 导入/导出、AI 智能排版、多模态审美分析，可通过 Docker 独立部署。

## 功能特性

- **富文本编辑** — 基于 TipTap，支持标题/列表/表格/图片/脚注/书签/批注等
- **docx 导入/导出** — 完整保留字体、字号、行高、颜色、缩进、表格等排版信息
- **AI 智能排版** — 自然语言指令驱动多步排版（改风格、调字号、统一格式等）
- **多模态审美分析** — 截图后调用视觉模型评估排版美观度，给出改进建议
- **专业排版知识库** — 内置学术论文、党政公文、商务报告、合同、简历等规范
- **多轮对话上下文** — AI 编辑支持连续多轮指令，理解上下文意图
- **后端文档存储** — 文档存储在服务端，无需云账号，数据完全自主
- **配置中心** — API Key 和端点通过界面配置，存储在后端，前端不暴露

---

## 架构概览

```
docx-editor/
├── src/                        # 前端（React + TypeScript + TipTap）
│   ├── components/             # UI 组件（编辑器、工具栏、对话框等）
│   ├── lib/
│   │   ├── vibeEditingEngine.ts  # AI 编辑引擎（ReAct 循环）
│   │   ├── vibeEditingTools.ts   # AI 工具集（样式查询/截图/排版操作等）
│   │   └── typographyKnowledge.ts # 排版知识库
│   └── utils/
│       └── docxHandler.ts      # docx 导入/导出核心逻辑
├── server/                     # 后端（Node.js + Express）
│   ├── index.cjs               # 服务入口（端口 3011）
│   ├── routes/
│   │   ├── docs.cjs            # 文档 CRUD API
│   │   ├── config.cjs          # AI 配置读写 API
│   │   └── ai.cjs              # AI 请求代理（防止 Key 暴露）
│   └── data/                   # 数据目录（Docker volume 挂载）
│       ├── docs/               # 文档 JSON 文件
│       └── config.json         # AI 配置（endpoint/apiKey/model）
├── Dockerfile                  # 多阶段构建
└── docker-compose.yml
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/docs` | 列出所有文档 |
| GET | `/api/docs/:docId` | 读取文档内容 |
| POST | `/api/docs` | 保存文档 |
| DELETE | `/api/docs/:docId` | 删除文档 |
| GET | `/api/config` | 读取 AI 配置（Key 脱敏） |
| POST | `/api/config` | 保存 AI 配置 |
| POST | `/api/ai/chat` | AI 请求代理（透传 stream） |

---

## 部署

### 方式一：Docker（推荐）

```bash
# 克隆项目
git clone https://github.com/dx2331lxz/docx-editor.git
cd docx-editor

# 启动（首次会自动构建镜像）
docker-compose up -d

# 访问
open http://localhost:3011
```

数据目录 `./data` 会自动挂载为 Docker volume，文档和配置持久化保存。

**停止/重启：**
```bash
docker-compose down
docker-compose up -d
```

**更新到最新版本：**
```bash
git pull
docker-compose up -d --build
```

### 方式二：本地开发

**环境要求：** Node.js 20+

```bash
# 安装依赖
npm install

# 同时启动前端（Vite dev server）和后端
npm run dev:full

# 前端访问：http://localhost:5173
# 后端 API：http://localhost:3011
```

仅启动后端：
```bash
npm run server
```

仅启动前端（需后端已运行）：
```bash
npm run dev
```

---

## 配置 AI

首次使用需要配置 AI 模型：

1. 进入编辑器，点击菜单栏「工具」→「AI 设置...」
2. 填写：
   - **API 端点**：默认 `https://api.siliconflow.cn/v1/chat/completions`（兼容 OpenAI 格式）
   - **API Key**：你的模型服务 Key
   - **模型**：默认 `Pro/moonshotai/Kimi-K2.5`，可替换为任意兼容模型
3. 点击「保存」，配置写入 `server/data/config.json`

> Key 仅存储在服务端，前端不可见。

**推荐模型：**
- 通用编辑：`Pro/moonshotai/Kimi-K2.5`
- UI/前端类文档：`Qwen/Qwen2.5-VL-72B-Instruct`
- 备选：任意 OpenAI 兼容接口

---

## 使用 AI 编辑

1. 打开右侧「AI 编辑」面板
2. 选择模式：
   - **Ask**：提问（不修改文档）
   - **Edit**：精确编辑（针对选中内容）
   - **Agent**：全文智能排版（自动分析 → 截图 → 制定方案 → 执行）
3. 用自然语言描述需求，例如：
   - `"帮我改成学术论文格式"`
   - `"标题太小，按照三号字调整"`
   - `"整体风格改为商务报告，简洁大方"`
   - `"分析一下这份文档的排版问题"`

Agent 模式会自动执行：结构分析 → 样式查询 → 截图 → 多模态审美分析 → 制定编辑计划 → 逐步执行。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + TypeScript + Vite |
| 编辑器核心 | TipTap 3 |
| 样式 | Tailwind CSS |
| docx 处理 | docx.js + mammoth + JSZip |
| 后端 | Node.js + Express |
| 容器化 | Docker + docker-compose |
| AI 接口 | OpenAI 兼容 API（硅基流动/SiliconFlow） |
