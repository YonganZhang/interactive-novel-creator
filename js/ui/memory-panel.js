// 记忆面板 - 显示和管理记忆
class MemoryPanel {
    constructor() {
        this.projectId = null;
        this.currentType = 'all';
        this.elements = {};
    }

    // 初始化
    init(projectId) {
        this.projectId = projectId;

        // 获取DOM元素
        this.elements = {
            panel: document.getElementById('memory-panel'),
            toggleBtn: document.getElementById('toggle-memory'),
            closeBtn: document.getElementById('close-memory'),
            memoryList: document.getElementById('memory-list'),
            addBtn: document.getElementById('add-memory'),
            tabs: document.querySelectorAll('.memory-tabs .tab')
        };

        // 绑定事件
        this.elements.toggleBtn.addEventListener('click', () => this.toggle());
        this.elements.closeBtn.addEventListener('click', () => this.hide());
        this.elements.addBtn.addEventListener('click', () => this.showAddDialog());

        // 绑定标签切换
        this.elements.tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.type);
            });
        });

        // 加载记忆
        this.loadMemories();
    }

    // 切换显示/隐藏
    toggle() {
        if (this.elements.panel.classList.contains('active')) {
            this.hide();
        } else {
            this.show();
        }
    }

    // 显示面板
    show() {
        this.elements.panel.classList.add('active');
        this.loadMemories();
    }

    // 隐藏面板
    hide() {
        this.elements.panel.classList.remove('active');
    }

    // 切换标签
    switchTab(type) {
        this.currentType = type;

        // 更新标签样式
        this.elements.tabs.forEach(tab => {
            if (tab.dataset.type === type) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });

        // 重新加载记忆
        this.loadMemories();
    }

    // 加载记忆列表
    async loadMemories() {
        try {
            let memories;

            if (this.currentType === 'all') {
                memories = await memoryManager.getProjectMemories(this.projectId);
            } else {
                memories = await memoryManager.getProjectMemories(
                    this.projectId,
                    this.currentType
                );
            }

            // 按重要性和最近访问时间排序
            memories.sort((a, b) => {
                const scoreA = a.metadata.importance + (a.metadata.accessCount * 0.1);
                const scoreB = b.metadata.importance + (b.metadata.accessCount * 0.1);
                return scoreB - scoreA;
            });

            this.renderMemories(memories);

        } catch (error) {
            console.error('加载记忆失败:', error);
        }
    }

    // 渲染记忆列表
    renderMemories(memories) {
        if (memories.length === 0) {
            this.elements.memoryList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
                    暂无记忆
                </div>
            `;
            return;
        }

        this.elements.memoryList.innerHTML = memories.map(memory => `
            <div class="memory-item" data-id="${memory.id}">
                <div class="memory-item-header">
                    <span class="memory-item-title">${memory.title}</span>
                    <span class="memory-item-type">${this.getTypeLabel(memory.type)}</span>
                </div>
                <div class="memory-item-preview">${this.truncate(memory.content, 80)}</div>
                <div class="memory-item-meta">
                    <span>重要性: ${memory.metadata.importance}/10</span>
                    <span>访问: ${memory.metadata.accessCount}次</span>
                </div>
            </div>
        `).join('');

        // 绑定点击事件
        this.elements.memoryList.querySelectorAll('.memory-item').forEach(item => {
            item.addEventListener('click', () => {
                this.showMemoryDetail(item.dataset.id);
            });
        });
    }

    // 获取类型标签
    getTypeLabel(type) {
        const labels = {
            'character': '角色',
            'location': '场景',
            'event': '事件',
            'item': '物品',
            'relationship': '关系',
            'rule': '规则',
            'plot': '剧情'
        };
        return labels[type] || type;
    }

    // 截断文本
    truncate(text, maxLength) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    // 显示记忆详情
    async showMemoryDetail(memoryId) {
        try {
            const memory = await memoryManager.getMemory(memoryId);
            if (!memory) {
                return;
            }

            const detail = `
                <div class="memory-detail-overlay" id="memory-detail">
                    <div class="memory-detail-content">
                        <div class="memory-detail-header">
                            <h3>${memory.title}</h3>
                            <button class="icon-btn" onclick="document.getElementById('memory-detail').remove()">✕</button>
                        </div>
                        <div class="memory-detail-body">
                            <p><strong>类型：</strong>${this.getTypeLabel(memory.type)}</p>
                            <p><strong>内容：</strong></p>
                            <p>${memory.content}</p>
                            <p><strong>重要性：</strong>${memory.metadata.importance}/10</p>
                            <p><strong>访问次数：</strong>${memory.metadata.accessCount}</p>
                            <p><strong>最后访问：</strong>${new Date(memory.metadata.lastAccessedAt).toLocaleString()}</p>
                        </div>
                        <div class="memory-detail-footer">
                            <button class="btn-secondary" onclick="memoryPanel.editMemory('${memoryId}')">编辑</button>
                            <button class="btn-secondary" onclick="memoryPanel.deleteMemory('${memoryId}')">删除</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', detail);

        } catch (error) {
            console.error('显示记忆详情失败:', error);
        }
    }

    // 显示添加对话框
    showAddDialog() {
        const dialog = `
            <div class="memory-detail-overlay" id="add-memory-dialog">
                <div class="memory-detail-content">
                    <div class="memory-detail-header">
                        <h3>添加记忆</h3>
                        <button class="icon-btn" onclick="document.getElementById('add-memory-dialog').remove()">✕</button>
                    </div>
                    <div class="memory-detail-body">
                        <div style="margin-bottom: 12px;">
                            <label>类型：</label>
                            <select id="new-memory-type" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px;">
                                <option value="character">角色</option>
                                <option value="location">场景</option>
                                <option value="event">事件</option>
                                <option value="item">物品</option>
                                <option value="relationship">关系</option>
                                <option value="rule">规则</option>
                                <option value="plot">剧情</option>
                            </select>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label>标题：</label>
                            <input type="text" id="new-memory-title" placeholder="记忆标题" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px;">
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label>内容：</label>
                            <textarea id="new-memory-content" placeholder="记忆内容" rows="6" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px;"></textarea>
                        </div>
                        <div style="margin-bottom: 12px;">
                            <label>重要性 (1-10)：</label>
                            <input type="number" id="new-memory-importance" value="5" min="1" max="10" style="width: 100%; padding: 8px; background: var(--bg-color); color: var(--text-color); border: 1px solid var(--border-color); border-radius: 8px;">
                        </div>
                    </div>
                    <div class="memory-detail-footer">
                        <button class="btn-primary" onclick="memoryPanel.saveNewMemory()">保存</button>
                        <button class="btn-secondary" onclick="document.getElementById('add-memory-dialog').remove()">取消</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', dialog);
    }

    // 保存新记忆
    async saveNewMemory() {
        const type = document.getElementById('new-memory-type').value;
        const title = document.getElementById('new-memory-title').value.trim();
        const content = document.getElementById('new-memory-content').value.trim();
        const importance = parseInt(document.getElementById('new-memory-importance').value);

        if (!title || !content) {
            alert('请填写标题和内容');
            return;
        }

        try {
            await memoryManager.createMemory(
                this.projectId,
                type,
                title,
                content,
                { importance }
            );

            // 关闭对话框
            document.getElementById('add-memory-dialog').remove();

            // 重新加载记忆列表
            await this.loadMemories();

            alert('记忆已添加');

        } catch (error) {
            console.error('保存记忆失败:', error);
            alert('保存失败: ' + error.message);
        }
    }

    // 编辑记忆
    async editMemory(memoryId) {
        // TODO: 实现编辑功能
        alert('编辑功能开发中...');
    }

    // 删除记忆
    async deleteMemory(memoryId) {
        if (!confirm('确定要删除这条记忆吗？')) {
            return;
        }

        try {
            await memoryManager.deleteMemory(memoryId);

            // 关闭详情对话框
            const detail = document.getElementById('memory-detail');
            if (detail) {
                detail.remove();
            }

            // 重新加载记忆列表
            await this.loadMemories();

            alert('记忆已删除');

        } catch (error) {
            console.error('删除记忆失败:', error);
            alert('删除失败: ' + error.message);
        }
    }
}

// 导出单例
const memoryPanel = new MemoryPanel();
