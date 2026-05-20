# TinyWiki - WPS AI 插件

一个基于 Vue 3 + Vite 开发的 WPS 插件，集成 AI 助手功能，提供智能文档勘误和结构化文档编辑能力。

## 功能特性

### 1. AI 助手
- 与 AI 进行自然语言对话
- 智能获取文档内容（选中内容优先，无选中则获取全文）
- 结构化文档编辑支持（插入、删除、替换操作）
- 操作预览和定位功能

### 2. AI 勘误
- 自动检测文档中的拼写错误、语法问题、格式问题和内容优化建议
- 支持长文档分块处理
- 在文档中直接添加批注
- 定位功能快速找到问题位置
- 批量添加批注

## 技术栈

- **前端框架**: Vue 3 (Composition API)
- **构建工具**: Vite
- **路由**: Vue Router 4
- **HTTP 客户端**: Axios
- **Markdown 解析**: marked
- **WPS 插件**: wpsjs, wps-jsapi-declare
- **代码规范**: ESLint + Prettier

## 项目结构

```
wiki-wps-plugin/
├── docs/                          # 项目文档
│   ├── 使用示例.md               # 结构化文档编辑功能使用示例
│   ├── 技术架构设计文档.md        # 技术架构设计文档
│   └── 结构化文档编辑功能设计文档.md
├── public/                        # 静态资源
│   ├── images/                   # 图标资源
│   └── ribbon.xml                # WPS 功能区配置
├── src/
│   ├── components/               # 组件
│   │   ├── AIChat.vue           # AI 聊天组件
│   │   ├── AIProofreadView.vue  # AI 勘误视图
│   │   ├── Dialog.vue           # 对话框组件
│   │   ├── DocumentOperationItem.vue  # 文档操作项组件
│   │   ├── DocumentOperationList.vue  # 文档操作列表组件
│   │   ├── Login.vue            # 登录组件
│   │   ├── Root.vue             # 根组件
│   │   ├── TaskPane.vue         # 任务窗格组件
│   │   ├── js/                  # JavaScript 工具
│   │   │   ├── dialog.js
│   │   │   ├── systemdemo.js
│   │   │   ├── taskpane.js
│   │   │   └── util.js
│   │   └── ribbon.js            # 功能区逻辑
│   ├── router/                  # 路由配置
│   │   └── index.js
│   ├── types/                   # 类型定义
│   │   └── documentOperation.js
│   ├── utils/                   # 工具函数
│   │   ├── documentContentHelper.js    # 文档内容获取
│   │   ├── documentOperationExecutor.js # 文档操作执行器
│   │   └── documentOperationParser.js   # 文档操作解析器
│   ├── views/                   # 视图组件
│   │   ├── AIChatView.vue       # AI 聊天视图
│   │   └── AIProofreadView.vue  # AI 勘误视图
│   ├── App.vue                  # 应用入口组件
│   ├── axios.js                 # Axios 配置
│   └── main.js                  # 应用入口
├── wps-addon-publish/           # 发布相关
├── manifest.xml                 # 插件清单
├── package.json                 # 项目配置
├── vite.config.js               # Vite 配置
└── README.md                    # 项目说明
```

## 快速开始

### 环境要求

- Node.js 16+
- WPS Office（支持插件开发）

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

开发服务器将在 `http://localhost:3889` 启动。

### 生产构建

```bash
npm run build
```

### 代码检查和格式化

```bash
# 代码检查并自动修复
npm run lint

# 代码格式化
npm run format
```

## 功能说明

### AI 勘误工作流程

1. 打开 WPS 文档
2. 点击功能区的「AI 勘误」按钮
3. 选择需要检查的项目（拼写、语法、格式、内容）
4. 点击「开始分析」
5. 查看分析结果，使用「定位」功能找到问题位置
6. 点击「添加批注」或「全部添加批注」在文档中添加改进建议

### 结构化文档编辑

AI 可以通过结构化的方式对文档进行编辑，支持以下操作类型：

- **insert**: 在指定位置插入新内容
- **delete**: 删除指定内容
- **replace**: 用新内容替换旧内容

操作指令格式：

```json
{
  "type": "replace|insert|delete",
  "position": {
    "paragraph": 1,
    "context": "上下文文本"
  },
  "oldContent": "原内容",
  "content": "新内容",
  "description": "操作描述"
}
```

详细使用说明请参考 [使用示例.md](./docs/使用示例.md)。

## WPS 插件配置

### 功能区按钮

插件在 WPS 功能区的「TinyWiki」选项卡中提供以下按钮：

- **AI 助手**: 打开 AI 聊天对话框
- **AI 勘误**: 打开 AI 勘误对话框

### 调试提示

按 F12 可以打开浏览器开发者工具进行调试。

## 技术架构

详细的技术架构设计请参考 [技术架构设计文档.md](./docs/技术架构设计文档.md)。

## 开发说明

### 主要组件

- **AIChatView**: AI 聊天主界面
- **AIProofreadView**: AI 勘误主界面
- **DocumentOperationList**: 文档操作列表
- **DocumentOperationItem**: 单个文档操作项

### 核心工具类

- **DocumentContentHelper**: 文档内容获取工具
- **DocumentOperationParser**: 解析 AI 回复中的结构化操作
- **DocumentOperationExecutor**: 执行文档操作

## 许可证

MIT License
