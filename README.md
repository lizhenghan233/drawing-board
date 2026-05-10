# 多人实时绘图白板 - 前端

本项目是多人实时绘图白板的前端部分，基于 Vue 3 + TypeScript + Vite + Pinia + Vue Router + WebSocket 构建。实现了用户认证、房间管理、画板绘制（通过角色 C 的正式画板组件）、实时聊天及 WebSocket 通信框架。

## 技术栈

- **Vue 3** (Composition API)
- **TypeScript** (类型安全)
- **Vite** (构建工具)
- **Pinia** (状态管理)
- **Vue Router** (路由)
- **WebSocket** (实时通信)
- **json-server** (模拟后端 REST API)

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/lizhenghan233/drawing-board.git
cd drawing-board
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:5173

4. 启动模拟后端（json-server）
   另开一个终端：

```bash
npm run mock
访问 http://localhost:3001 查看数据。
```

5. 启动本地 WebSocket 测试服务器(未完成,等待后端完成后直接验证)
   如果需要测试 WebSocket 功能（聊天、绘图广播），可以运行项目根目录下的 server.js（需先安装 ws 库）：

```bash
npm install ws
node server.js
```

环境变量
在项目根目录创建 .env.development 文件：

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:8080/ws
```

生产环境可创建 .env.production 并修改相应地址。

项目结构

```text
src/
├── api/                # API 调用封装
│   ├── request.ts      # 统一请求函数
│   ├── user.ts         # 用户相关 API
│   └── room.ts         # 房间相关 API
├── assets/             # 静态资源
├── components/         # 公共组件
│   ├── DrawingCanvas.vue  # 正式画板组件（角色 C）
│   └── ToastMessage.vue   # 全局 Toast 提示
├── composables/        # 组合式函数
│   ├── use-chat.ts        # 聊天逻辑
│   ├── use-toast.ts       # Toast 逻辑
│   └── use-websocket.ts   # WebSocket 连接管理
├── router/             # 路由配置
│   └── index.ts        # 路由守卫、404 重定向
├── services/           # 服务类
│   └── websocket.ts    # WebSocket 客户端（含自动重连）
├── stores/             # Pinia 状态管理
│   ├── userStore.ts    # 用户状态（含持久化）
│   └── roomStore.ts    # 房间状态
├── types/              # TypeScript 类型定义
│   ├── user.ts
│   ├── room.ts
│   ├── drawing.ts
│   ├── chat.ts
│   └── index.ts
├── views/              # 页面组件
│   ├── LoginView.vue   # 登录页
│   ├── RoomsView.vue   # 房间列表页
│   └── BoardView.vue   # 白板页（集成画板与聊天）
├── App.vue
├── main.ts
└── vite-env.d.ts       # Vite 环境变量类型声明
```

核心功能
用户认证：登录、Token 存储、页面刷新后自动恢复用户信息、路由守卫（未登录禁止访问需要认证的页面）

房间管理：创建房间、加入房间、房间列表展示

白板绘制：正式画板组件支持多种工具（画笔、矩形、圆形、文本），颜色/线宽调节，撤销/重做，清屏，实时同步

实时聊天：发送/接收消息，显示发送者真实用户名，时间戳，自动滚动

WebSocket 通信：连接管理、心跳保活、自动重连（指数退避，最多10次）

Toast 提示：全局成功/错误/信息提示

团队协作规范
分支管理
main 分支为稳定版本，所有功能通过 Pull Request 合并。

每个角色在自己的分支上开发：feature/auth、feature/canvas、feature/websocket 等。

代码风格
使用 ESLint + Prettier 统一格式。

提交前运行 npm run lint 检查。

提交信息规范
推荐使用语义化提交信息，例如：

text
feat: 添加登录功能
fix: 修复未登录可访问房间漏洞
refactor: 重构 API 请求封装
docs: 更新 README

已知问题与待办
路由守卫已修复，未登录无法访问 /rooms 和 /board

聊天显示真实用户名（已修复显示“我”的问题）

用户状态持久化（刷新页面不会丢失登录信息）

WebSocket 自动重连机制

画板快照保存与加载（计划中）

成员列表实时更新（需后端支持）

Docker 一键部署（计划中）

贡献指南
克隆项目并切换到自己的分支：git checkout -b feature/your-feature

进行修改并测试

提交前运行 npm run lint 确保代码规范

推送到远程仓库并创建 Pull Request 到 main 分支
