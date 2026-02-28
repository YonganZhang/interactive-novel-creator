// 创作界面 - 主交互界面
class CreationInterface {
    constructor() {
        this.projectId = null;
        this.sessionId = null;
        this.elements = {};
        this.isGenerating = false;
    }

    // 初始化
    async init(projectId, sessionId) {
        this.projectId = projectId;
        this.sessionId = sessionId;

        // 获取DOM元素
        this.elements = {
            container: document.getElementById('main-app'),
            projectTitle: document.getElementById('project-title'),
            userInput: document.getElementById('user-input'),
            sendBtn: document.getElementById('send-btn'),
            historyDisplay: document.getElementById('history-display'),
            tokenUsage: document.getElementById('token-usage'),
            loading: document.getElementById('loading')
        };

        // 加载项目信息
        const project = await storageManager.getProject(projectId);
        this.elements.projectTitle.textContent = project.name;

        // 绑定事件
        this.elements.sendBtn.addEventListener('click', () => this.handleSend());
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });

        // 加载历史对话
        await this.loadHistory();

        // 显示界面
        this.show();

        // 更新token使用情况
        await this.updateTokenUsage();
    }

    // 处理发送
    async handleSend() {
        if (this.isGenerating) {
            return;
        }

        const userInput = this.elements.userInput.value.trim();
        if (!userInput) {
            return;
        }

        this.isGenerating = true;
        this.elements.sendBtn.disabled = true;
        this.elements.userInput.disabled = true;

        try {
            // 显示用户消息
            this.addMessage('user', userInput);

            // 清空输入框
            this.elements.userInput.value = '';

            // 保存用户消息
            await storageManager.createConversation({
                sessionId: this.sessionId,
                role: 'user',
                content: userInput
            });

            // 构建上下文
            this.showLoading('AI正在思考...');
            const context = await contextManager.buildContext(
                this.sessionId,
                this.projectId,
                userInput
            );

            // 调用API生成回复
            const aiMessageElement = this.addMessage('assistant', '');
            let fullResponse = '';

            await openAIClient.chatStream(
                context.messages,
                { temperature: 0.8, max_tokens: 800 },
                (chunk) => {
                    fullResponse += chunk;
                    this.updateMessage(aiMessageElement, fullResponse);
                }
            );

            // 保存AI回复
            await storageManager.createConversation({
                sessionId: this.sessionId,
                role: 'assistant',
                content: fullResponse
            });

            // 更新会话活跃时间
            await storageManager.updateSessionActivity(this.sessionId);

            // 更新token使用情况
            await this.updateTokenUsage();

        } catch (error) {
            console.error('生成回复失败:', error);
            this.addMessage('system', '抱歉，生成失败: ' + error.message);
        } finally {
            this.isGenerating = false;
            this.elements.sendBtn.disabled = false;
            this.elements.userInput.disabled = false;
            this.elements.userInput.focus();
            this.hideLoading();
        }
    }

    // 添加消息
    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role}`;
        messageDiv.textContent = content;

        this.elements.historyDisplay.appendChild(messageDiv);
        this.scrollToBottom();

        return messageDiv;
    }

    // 更新消息内容
    updateMessage(element, content) {
        element.textContent = content;
        this.scrollToBottom();
    }

    // 加载历史对话
    async loadHistory() {
        try {
            const conversations = await storageManager.getRecentConversations(
                this.sessionId,
                20
            );

            this.elements.historyDisplay.innerHTML = '';

            conversations.forEach(conv => {
                this.addMessage(conv.role, conv.content);
            });

        } catch (error) {
            console.error('加载历史失败:', error);
        }
    }

    // 更新token使用情况
    async updateTokenUsage() {
        try {
            const status = await contextManager.getContextStatus(
                this.sessionId,
                this.projectId
            );

            if (status) {
                const { tokenUsage } = status;
                this.elements.tokenUsage.textContent =
                    `Token: ${tokenUsage.total} / ${CONFIG.context.maxTokens} (${tokenUsage.percentage}%)`;

                // 如果接近阈值，改变颜色
                if (tokenUsage.percentage > 70) {
                    this.elements.tokenUsage.style.color = '#f59e0b';
                }
                if (tokenUsage.percentage > 85) {
                    this.elements.tokenUsage.style.color = '#ef4444';
                }
            }
        } catch (error) {
            console.error('更新token使用情况失败:', error);
        }
    }

    // 滚动到底部
    scrollToBottom() {
        const container = this.elements.historyDisplay.parentElement;
        container.scrollTop = container.scrollHeight;
    }

    // 显示加载状态
    showLoading(message = 'AI正在创作中...') {
        this.elements.loading.querySelector('p').textContent = message;
        this.elements.loading.style.display = 'flex';
    }

    // 隐藏加载状态
    hideLoading() {
        this.elements.loading.style.display = 'none';
    }

    // 显示界面
    show() {
        this.elements.container.style.display = 'flex';
    }

    // 隐藏界面
    hide() {
        this.elements.container.style.display = 'none';
    }

    // 清空对话
    async clearHistory() {
        if (!confirm('确定要清空对话历史吗？')) {
            return;
        }

        this.elements.historyDisplay.innerHTML = '';
        // 注意：这里不删除数据库中的对话，只是清空显示
        // 如果需要删除数据库记录，需要添加相应的方法
    }

    // 导出对话
    async exportConversation() {
        try {
            const conversations = await storageManager.getRecentConversations(
                this.sessionId,
                1000
            );

            const text = conversations.map(conv => {
                const role = conv.role === 'user' ? '用户' : 'AI';
                return `${role}: ${conv.content}`;
            }).join('\n\n');

            // 创建下载链接
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `story_${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error('导出失败:', error);
            alert('导出失败: ' + error.message);
        }
    }
}

// 导出单例
const creationInterface = new CreationInterface();
