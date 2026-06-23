# hexo-sourcecode

基于 Hexo + NexT 主题的个人博客源码项目。

## 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | >= 18 | Hexo 运行时，建议 LTS 版本 |
| pnpm | >= 10 | 包管理器（推荐），也可用 npm |
| Git | >= 2.x | 部署到 GitHub Pages 必须 |
| Python | 3.11.x | **非必须**，仅 node-gyp 编译原生模块时需要 |

---

## 一、安装 Node.js 和 pnpm

### 1. 安装 Node.js

前往 [Node.js 官网](https://nodejs.org/) 下载 LTS 版本（>= 18），安装完成后验证：

```powershell
node -v    # 应输出 v18.x.x 或更高
npm -v     # 应输出 9.x.x 或更高
```

### 2. 安装 pnpm

```powershell
npm install -g pnpm
pnpm -v    # 应输出 10.x.x 或更高
```

---

## 二、安装项目依赖

在项目根目录执行：

```powershell
pnpm install
```

> ⚠️ **pnpm 严格模式注意**：pnpm 默认不会将子依赖提升到顶层 `node_modules`，因此以下依赖需要**手动显式安装**，否则 NexT 主题脚本会报 `Cannot find module` 错误：
>
> ```powershell
> pnpm add css js-yaml
> ```
>
> 如果你使用的是 npm，则无需手动安装这两个包（npm 默认会提升依赖）。

---

## 三、依赖清单说明

### 核心依赖

| 包名 | 版本 | 用途 |
|---|---|---|
| `hexo` | ^7.0.0 | Hexo 博客框架核心 |
| `hexo-server` | ^3.0.0 | 本地预览服务器（`hexo s`） |

### 主题依赖

| 包名 | 版本 | 用途 |
|---|---|---|
| `hexo-theme-next` | ^8.27.0 | NexT 主题（Muse 方案，暗色模式） |
| `hexo-theme-landscape` | ^1.0.0 | Hexo 默认主题（备用） |

### 渲染器

| 包名 | 版本 | 用途 |
|---|---|---|
| `hexo-renderer-ejs` | ^2.0.0 | EJS 模板渲染（NexT 主题依赖） |
| `hexo-renderer-marked` | ^6.0.0 | Markdown 渲染为 HTML |
| `hexo-renderer-stylus` | ^3.0.0 | Stylus 样式渲染（自定义 `.styl` 文件） |

### 生成器

| 包名 | 版本 | 用途 |
|---|---|---|
| `hexo-generator-index` | ^3.0.0 | 生成首页文章列表 |
| `hexo-generator-archive` | ^2.0.0 | 生成归档页面 |
| `hexo-generator-category` | ^2.0.0 | 生成分类页面 |
| `hexo-generator-tag` | ^2.0.0 | 生成标签页面 |

### 部署插件（Git）

| 包名 | 版本 | 用途 |
|---|---|---|
| `hexo-deployer-git` | ^4.0.0 | 将生成的静态文件通过 Git 推送到远程仓库 |

> ⚠️ **重要**：Hexo 本身**不包含** Git 部署功能，必须单独安装此插件，否则执行 `hexo deploy` 会报错：
> ```
> ERROR Deployer not found: git
> ```
>
> 安装命令：
> ```powershell
> pnpm add hexo-deployer-git
> ```

### pnpm 严格模式补充依赖

| 包名 | 版本 | 用途 |
|---|---|---|
| `css` | ^3.0.0 | NexT 主题脚本依赖（pnpm 不会自动提升） |
| `js-yaml` | ^5.1.0 | NexT 主题脚本依赖（pnpm 不会自动提升） |
| `hexo-util` | ^4.0.0 | Hexo 工具函数（pnpm 环境下需显式安装） |

---

## 四、关于 Python

本项目是 **Node.js 项目**，不需要用 `pip` 安装任何依赖。

> ❌ **不要执行** `pip install hexo-util`，`hexo-util` 是 Node.js 包，不是 Python 包，会报 `No matching distribution found` 错误。

Python 的唯一用途：当 `hexo-util` 等原生 Node.js 模块需要 `node-gyp` 编译 C++ 扩展时，Python 作为构建工具被自动调用。确保 Python 3.11.x 已安装并配置好系统环境变量即可，**无需手动 pip install 任何东西**。

验证 Python 环境（可选）：

```powershell
python --version    # 应输出 Python 3.11.x
```

---

## 五、常用命令

```powershell
# 新建文章
hexo new "文章标题"

# 清除缓存 + 重新生成
hexo clean; hexo generate

# 启动本地预览（默认 http://localhost:4000）
hexo server

# 如果端口 4000 被占用，指定其他端口
hexo server -p 4001

# 部署到 GitHub Pages
hexo deploy

# 一键生成并部署
hexo clean; hexo generate; hexo deploy
```

---

## 六、部署配置

在 `_config.yml` 底部配置 Git 部署信息：

```yaml
deploy:
  type: git
  repository: git@github.com:lodineD/lodineD.github.io.git
  branch: main
```

部署前确保已配置好 Git SSH 密钥：

```powershell
# 检查 SSH 连接
ssh -T git@github.com

# 如果未配置，生成密钥
ssh-keygen -t ed25519 -C "your_email@example.com"
```

---

## 七、项目结构

```
├── source/
│   ├── _posts/       # 博客文章（Markdown）
│   ├── _data/        # NexT 主题自定义文件（样式、脚本注入）
│   │   ├── styles.styl      # 自定义暗色样式覆盖
│   │   └── body-end.njk     # 注入星空/音乐播放器脚本
│   ├── images/       # 图片资源（头像、favicon 等）
│   ├── js/           # 自定义脚本（星空背景、音乐播放器）
│   ├── music/        # 音乐文件
│   └── index.html    # 自定义首页（深色个人主页）
├── scaffolds/        # 文章模板
├── themes/           # 主题目录
├── _config.yml       # Hexo 主配置
├── _config.next.yml  # NexT 主题配置
└── package.json      # Node.js 依赖声明
```

---

## 八、主题风格

- 主题：NexT 8.x（Muse 方案）
- 暗色模式 + 星空背景动画
- 浮动音乐播放器
- 自定义首页（个人介绍 + 技能展示）
- 部署目标：`lodineD.github.io`（main 分支）
- 线上域名：`logicblog.cc`（Vercel 托管 + Cloudflare DNS）

---

## 九、常见问题

### Q: `hexo s` 报端口 4000 被占用？

```powershell
# 方法1：指定其他端口
hexo s -p 4001

# 方法2：关闭占用端口的进程
Get-Process -Name "node" | Stop-Process -Force
hexo s
```

### Q: `hexo d` 报 `Deployer not found: git`？

缺少部署插件，安装：

```powershell
pnpm add hexo-deployer-git
```

### Q: NexT 主题脚本报 `Cannot find module 'css'` 或 `'js-yaml'`？

pnpm 严格模式导致依赖未提升，手动安装：

```powershell
pnpm add css js-yaml
```

### Q: 用 pip 安装 hexo-util 报错？

`hexo-util` 是 Node.js 包，不是 Python 包，应该用：

```powershell
pnpm add hexo-util
```

### Q: `vercel login` 报 TLS 连接失败？

在中国大陆环境下需要先配置代理：

```powershell
$env:HTTPS_PROXY = "http://127.0.0.1:7890"
$env:HTTP_PROXY = "http://127.0.0.1:7890"
vercel login
```

---

## 十、Vercel 部署与域名配置

本项目使用 **Vercel** 作为托管平台，域名 `logicblog.cc` 通过 **Cloudflare** 进行 DNS 解析。

### 架构概览

```
GitHub (hexo-sourcecode)
    ↓ push 触发自动部署
Vercel (托管 + 构建)
    ↓
logicblog.cc (Cloudflare DNS → Vercel)
```

### 1. 安装 Vercel CLI

```powershell
npm install -g vercel
```

### 2. 登录 Vercel

> 中国大陆环境需要先配置代理，见上方常见问题。

```powershell
vercel login
```

### 3. 关联项目并部署

```powershell
# 首次部署（会引导你关联 GitHub 仓库）
vercel

# 后续部署到生产环境
vercel --prod
```

### 4. 绑定自定义域名 `logicblog.cc`

在 Vercel 控制台中：
1. 进入项目设置 → **Domains**
2. 添加域名 `logicblog.cc`
3. Vercel 会生成 DNS 记录（A 记录 / CNAME）

### 5. Cloudflare DNS 配置

在 Cloudflare 控制面板中为 `logicblog.cc` 添加以下 DNS 记录：

| 类型 | 名称 | 内容 | 代理状态 |
|---|---|---|---|
| CNAME | `@` | `cname.vercel-dns.com` | Proxied (橙色云朵) |
| CNAME | `www` | `cname.vercel-dns.com` | Proxied (橙色云朵) |

> **注意**：Cloudflare 的 CNAME 扁平化（CNAME Flattening）支持根域名直接 CNAME，无需使用 A 记录。

### 6. 验证部署

```powershell
# 检查域名是否正常
Invoke-WebRequest -Uri "https://logicblog.cc" -UseBasicParsing
```

访问 https://logicblog.cc 确认页面正常加载。
