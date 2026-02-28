// 应用主控制器
class App {
    constructor() {
        this.initialized = false;
    }

    // 初始化应用
    async init() {
        try {
            console.log('初始化应用...');

            // 0. 检查 API Key
            if (!CONFIG.api.key) {
                this.showApiKeyDialog();
                return;
            }

            // 1. 初始化数据库
            await storageManager.initDB();
            console.log('数据库初始化完成');

            // 2. 初始化OpenAI客户端
            window.openAIClient = new OpenAIClient();
            console.log('OpenAI客户端初始化完成');

            // 3. 初始化各个管理器
            await memoryManager.init();
            await memoryRetriever.init();
            await contextManager.init();
            await summarizer.init();
            console.log('管理器初始化完成');

            // 4. 初始化UI组件
            historyDisplay.init();
            console.log('UI组件初始化完成');

            // 5. 检查是否有现有项目
            const hasExistingProject = await this.checkExistingProject();

            if (hasExistingProject) {
                // 加载现有项目
                await this.loadExistingProject();
            } else {
                // 显示初始化向导
                initWizard.init();
            }

            this.initialized = true;
            console.log('应用初始化完成');

        } catch (error) {
            console.error('应用初始化失败:', error);
            alert('应用初始化失败: ' + error.message);
        }
    }

    // 检查是否有现有项目
    async checkExistingProject() {
        try {
            // 尝试获取最近的项目
            const db = await storageManager.ensureDB();
            const transaction = db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.getAll();

            return new Promise((resolve) => {
                request.onsuccess = () => {
                    resolve(request.result && request.result.length > 0);
                };
                request.onerror = () => {
                    resolve(false);
                };
            });
        } catch (error) {
            return false;
        }
    }

    // 加载现有项目
    async loadExistingProject() {
        try {
            // 获取最近的项目
            const db = await storageManager.ensureDB();
            const transaction = db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const index = store.index('createdAt');
            const request = index.openCursor(null, 'prev');

            request.onsuccess = async (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const project = cursor.value;

                    // 获取或创建会话
                    const sessions = await storageManager.getProjectSessions(project.id);
                    let sessionId;

                    if (sessions.length > 0) {
                        // 使用最近的会话
                        sessions.sort((a, b) =>
                            new Date(b.lastActiveAt) - new Date(a.lastActiveAt)
                        );
                        sessionId = sessions[0].id;
                    } else {
                        // 创建新会话
                        sessionId = await storageManager.createSession({
                            projectId: project.id
                        });
                    }

                    // 初始化创作界面
                    await creationInterface.init(project.id, sessionId);

                    // 初始化记忆面板
                    memoryPanel.init(project.id);
                }
            };

        } catch (error) {
            console.error('加载项目失败:', error);
            // 如果加载失败，显示初始化向导
            initWizard.init();
        }
    }

    // 创建新项目
    async createNewProject() {
        // 隐藏当前界面
        if (creationInterface.elements.container) {
            creationInterface.hide();
        }

        // 显示初始化向导
        initWizard.show();
    }

    // 切换项目
    async switchProject(projectId) {
        try {
            // 获取或创建会话
            const sessions = await storageManager.getProjectSessions(projectId);
            let sessionId;

            if (sessions.length > 0) {
                sessions.sort((a, b) =>
                    new Date(b.lastActiveAt) - new Date(a.lastActiveAt)
                );
                sessionId = sessions[0].id;
            } else {
                sessionId = await storageManager.createSession({
                    projectId
                });
            }

            // 重新初始化界面
            await creationInterface.init(projectId, sessionId);
            memoryPanel.init(projectId);

        } catch (error) {
            console.error('切换项目失败:', error);
            alert('切换项目失败: ' + error.message);
        }
    }

    // 显示 API Key 设置弹窗
    showApiKeyDialog() {
        const dialog = document.getElementById('api-key-dialog');
        const keyInput = document.getElementById('api-key-input');
        const baseInput = document.getElementById('api-base-input');
        const modelInput = document.getElementById('api-model-input');
        const saveBtn = document.getElementById('api-key-save');

        // 回填已有值
        keyInput.value = CONFIG.api.key;
        baseInput.value = localStorage.getItem('novel_api_base') || '';
        modelInput.value = localStorage.getItem('novel_api_model') || '';

        dialog.style.display = 'flex';
        keyInput.focus();

        const onSave = () => {
            const key = keyInput.value.trim();
            if (!key) { alert('请输入 API Key'); return; }
            localStorage.setItem('novel_api_key', key);
            const base = baseInput.value.trim();
            const model = modelInput.value.trim();
            if (base) localStorage.setItem('novel_api_base', base);
            if (model) localStorage.setItem('novel_api_model', model);
            dialog.style.display = 'none';
            saveBtn.removeEventListener('click', onSave);
            this.init(); // 重新初始化
        };
        saveBtn.addEventListener('click', onSave);
    }

    // 显示项目列表
    async showProjectList() {
        try {
            const db = await storageManager.ensureDB();
            const transaction = db.transaction(['projects'], 'readonly');
            const store = transaction.objectStore('projects');
            const request = store.getAll();

            request.onsuccess = () => {
                const projects = request.result;

                if (projects.length === 0) {
                    alert('暂无项目');
                    return;
                }

                // 创建项目列表对话框
                const dialog = `
                    <div class="memory-detail-overlay" id="project-list-dialog">
                        <div class="memory-detail-content">
                            <div class="memory-detail-header">
                                <h3>我的项目</h3>
                                <button class="icon-btn" onclick="document.getElementById('project-list-dialog').remove()">✕</button>
                            </div>
                            <div class="memory-detail-body">
                                ${projects.map(p => `
                                    <div class="memory-item" onclick="app.switchProject(${p.id}); document.getElementById('project-list-dialog').remove();">
                                        <div class="memory-item-title">${p.name}</div>
                                        <div class="memory-item-preview">创建于: ${new Date(p.createdAt).toLocaleString()}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="memory-detail-footer">
                                <button class="btn-primary" onclick="app.createNewProject(); document.getElementById('project-list-dialog').remove();">创建新项目</button>
                            </div>
                        </div>
                    </div>
                `;

                document.body.insertAdjacentHTML('beforeend', dialog);
            };

        } catch (error) {
            console.error('显示项目列表失败:', error);
            alert('显示项目列表失败: ' + error.message);
        }
    }
}

// 创建全局应用实例
const app = new App();

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// 添加菜单按钮事件
window.addEventListener('DOMContentLoaded', () => {
    const menuBtn = document.getElementById('menu-btn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            const menu = `
                <div class="memory-detail-overlay" id="main-menu">
                    <div class="memory-detail-content" style="max-width: 300px;">
                        <div class="memory-detail-header">
                            <h3>菜单</h3>
                            <button class="icon-btn" onclick="document.getElementById('main-menu').remove()">✕</button>
                        </div>
                        <div class="memory-detail-body">
                            <button class="btn-secondary" onclick="app.showProjectList(); document.getElementById('main-menu').remove();" style="margin-bottom: 8px;">切换项目</button>
                            <button class="btn-secondary" onclick="app.createNewProject(); document.getElementById('main-menu').remove();" style="margin-bottom: 8px;">创建新项目</button>
                            <button class="btn-secondary" onclick="creationInterface.exportConversation(); document.getElementById('main-menu').remove();" style="margin-bottom: 8px;">导出对话</button>
                            <button class="btn-secondary" onclick="contextManager.manualCompress(creationInterface.sessionId); document.getElementById('main-menu').remove();" style="margin-bottom: 8px;">手动压缩</button>
                            <button class="btn-secondary" onclick="app.showApiKeyDialog(); document.getElementById('main-menu').remove();" style="margin-bottom: 8px;">API 设置</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', menu);
        });
    }
});
