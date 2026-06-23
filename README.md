# hexo-sourcecode

基于 Hexo + NexT 主题的个人博客源码项目。

## 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | >= 18 | Hexo 运行时 |
| pnpm | >= 10 | 包管理器（推荐），也可用 npm |
| Python | 3.11.15 | **非必须**，仅在某些 Hexo 插件需要 node-gyp 编译原生模块时使用 |

## 安装依赖

```bash
# 使用 pnpm（推荐）
pnpm install

# 或使用 npm
npm install
```

### 关于 Python 依赖

本项目是 Node.js 项目，**不需要用 pip 安装任何依赖**。Hexo 及其插件全部通过 pnpm/npm 管理。

> 注意：不要执行 `pip install hexo-util`，`hexo-util` 是 Node.js 包，不是 Python 包。

如果你的 Node.js 版本较新，某些原生模块（如 `hexo-util`）在编译时可能需要 Python 作为构建工具。此时确保已安装 Python 3.11.15 并配置好环境变量即可，**无需手动 pip install 任何东西**。pnpm 会自动调用 node-gyp 完成编译。

## 常用命令

```bash
# 新建文章
hexo new "文章标题"

# 生成本地预览
hexo clean && hexo generate

# 启动本地服务器（默认 http://localhost:4000）
hexo server

# 部署到 GitHub Pages
hexo deploy
```

## 项目结构

```
├── source/
│   ├── _posts/       # 博客文章（Markdown）
│   ├── _data/        # NexT 主题自定义文件（样式、脚本注入）
│   ├── images/       # 图片资源（头像、favicon 等）
│   ├── js/           # 自定义脚本（星空背景、音乐播放器）
│   ├── music/        # 音乐文件
│   └── index.html    # 自定义首页（深色个人主页）
├── themes/           # 主题目录
├── _config.yml       # Hexo 主配置
├── _config.next.yml  # NexT 主题配置
└── package.json
```

## 主题风格

- 主题：NexT 8.x（Muse 方案）
- 暗色模式 + 星空背景动画
- 浮动音乐播放器
- 自定义首页（个人介绍 + 技能展示）
- 部署目标：`lodineD.github.io`（main 分支）