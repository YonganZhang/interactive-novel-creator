# 部署指南

## 本地部署（推荐用于开发和测试）

### 方法1：使用Python HTTP服务器（最简单）

1. 确保已安装Python 3.x
2. 双击运行 `启动服务器.bat`
3. 浏览器访问 http://localhost:8080

### 方法2：使用Node.js http-server

```bash
# 安装http-server
npm install -g http-server

# 启动服务器
cd E:\Phone\小说
http-server -p 8080
```

### 方法3：使用VS Code Live Server

1. 安装VS Code扩展：Live Server
2. 右键点击 index.html
3. 选择 "Open with Live Server"

## 云端部署

### 部署到Vercel（推荐）

Vercel提供免费的静态网站托管，非常适合纯前端项目。

#### 步骤：

1. **准备Git仓库**
   ```bash
   cd E:\Phone\小说
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **推送到GitHub**
   - 在GitHub创建新仓库
   - 推送代码：
     ```bash
     git remote add origin https://github.com/你的用户名/仓库名.git
     git push -u origin main
     ```

3. **连接Vercel**
   - 访问 https://vercel.com
   - 使用GitHub账号登录
   - 点击 "New Project"
   - 选择你的GitHub仓库
   - 点击 "Deploy"

4. **配置环境变量（可选）**
   - 如果需要隐藏API Key，可以在Vercel设置环境变量
   - 但由于是纯前端项目，API Key会暴露在客户端
   - 建议使用API Key的域名限制功能

#### Vercel配置文件（可选）

创建 `vercel.json`：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.html",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### 部署到Netlify

1. **使用Netlify CLI**
   ```bash
   npm install -g netlify-cli
   cd E:\Phone\小说
   netlify deploy
   ```

2. **或使用拖放部署**
   - 访问 https://app.netlify.com/drop
   - 将整个项目文件夹拖放到页面上
   - 获得临时URL

3. **连接Git仓库**
   - 在Netlify控制台点击 "New site from Git"
   - 选择GitHub仓库
   - 配置构建设置（纯静态项目无需构建）
   - 点击 "Deploy site"

### 部署到GitHub Pages

1. **推送到GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/仓库名.git
   git push -u origin main
   ```

2. **启用GitHub Pages**
   - 进入仓库设置
   - 找到 "Pages" 选项
   - Source选择 "main" 分支
   - 保存

3. **访问**
   - URL: https://你的用户名.github.io/仓库名/

### 部署到Cloudflare Pages

1. **推送到Git仓库**（GitHub/GitLab）

2. **连接Cloudflare Pages**
   - 访问 https://pages.cloudflare.com
   - 点击 "Create a project"
   - 连接Git仓库
   - 配置构建设置：
     - Build command: 留空
     - Build output directory: /
   - 点击 "Save and Deploy"

## 移动端部署

### 方法1：PWA安装（推荐）

1. 在手机浏览器访问部署的URL
2. 点击浏览器菜单
3. 选择"添加到主屏幕"
4. 应用会像原生App一样运行

### 方法2：打包为原生App

使用Capacitor或Cordova将Web应用打包为原生App：

```bash
# 使用Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap add ios
npx cap sync
```

## 安全建议

### 1. API Key保护

**问题**：纯前端项目无法完全隐藏API Key

**解决方案**：

#### 方案A：使用后端代理（推荐）

创建一个简单的后端API代理：

```javascript
// server.js (Node.js + Express)
const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/api/chat', async (req, res) => {
  const response = await fetch('https://api.zhizengzeng.com/xai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });

  const data = await response.json();
  res.json(data);
});

app.listen(3000);
```

修改 `js/config.js`：
```javascript
api: {
    baseURL: '/api',  // 使用本地代理
    model: 'grok-beta'
}
```

#### 方案B：使用Vercel Serverless Functions

创建 `api/chat.js`：

```javascript
export default async function handler(req, res) {
  const response = await fetch('https://api.zhizengzeng.com/xai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(req.body)
  });

  const data = await response.json();
  res.json(data);
}
```

在Vercel设置环境变量 `API_KEY`。

#### 方案C：API Key域名限制

在API提供商后台设置：
- 只允许特定域名调用
- 设置请求频率限制
- 监控异常使用

### 2. CORS配置

如果使用后端代理，需要配置CORS：

```javascript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://你的域名.com');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
```

### 3. HTTPS强制

在生产环境强制使用HTTPS：

```javascript
// 在index.html的<head>中添加
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

## 性能优化

### 1. 启用Gzip压缩

在Vercel/Netlify会自动启用，本地服务器需要配置：

```python
# Python HTTP服务器不支持Gzip，建议使用nginx
```

### 2. 添加Service Worker（PWA）

创建 `sw.js`：

```javascript
const CACHE_NAME = 'novel-creator-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/app.js'
  // ... 其他文件
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
```

在 `index.html` 中注册：

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

### 3. 代码压缩

使用工具压缩JS和CSS：

```bash
npm install -g terser clean-css-cli

# 压缩JS
terser js/app.js -o js/app.min.js

# 压缩CSS
cleancss css/main.css -o css/main.min.css
```

## 监控和分析

### 1. 添加Google Analytics

在 `index.html` 的 `<head>` 中添加：

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### 2. 错误监控

使用Sentry监控错误：

```html
<script src="https://browser.sentry-cdn.com/7.x.x/bundle.min.js"></script>
<script>
  Sentry.init({
    dsn: 'YOUR_SENTRY_DSN',
    environment: 'production'
  });
</script>
```

## 备份和恢复

### 导出数据

在浏览器控制台执行：

```javascript
// 导出所有数据
const exportData = async () => {
  const db = await storageManager.ensureDB();
  const data = {};

  for (const storeName of ['projects', 'memories', 'conversations', 'sessions', 'summaries']) {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    data[storeName] = await new Promise(resolve => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
    });
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-${Date.now()}.json`;
  a.click();
};

exportData();
```

### 导入数据

```javascript
// 导入数据
const importData = async (jsonData) => {
  const data = JSON.parse(jsonData);
  const db = await storageManager.ensureDB();

  for (const [storeName, items] of Object.entries(data)) {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      await store.add(item);
    }
  }
};
```

## 故障排除

### 问题：部署后API调用失败

**原因**：CORS或API Key问题

**解决**：
1. 检查浏览器控制台错误
2. 确认API Key有效
3. 使用后端代理避免CORS

### 问题：IndexedDB数据丢失

**原因**：浏览器清理或隐私模式

**解决**：
1. 定期导出备份
2. 提示用户不要使用隐私模式
3. 考虑添加云端同步功能

### 问题：移动端性能差

**原因**：大量DOM操作或内存泄漏

**解决**：
1. 使用虚拟滚动
2. 限制历史消息显示数量
3. 定期清理缓存

## 更新和维护

### 版本更新

1. 修改代码
2. 更新版本号（在config.js中添加version字段）
3. 提交到Git
4. 推送到远程仓库
5. 部署平台自动更新

### 用户通知

在 `app.js` 中添加版本检查：

```javascript
const checkVersion = async () => {
  const response = await fetch('/version.json');
  const { version } = await response.json();
  const localVersion = localStorage.getItem('version');

  if (localVersion && localVersion !== version) {
    if (confirm('发现新版本，是否刷新页面？')) {
      location.reload(true);
    }
  }

  localStorage.setItem('version', version);
};
```

---

**部署完成后，记得测试所有功能！** ✅
