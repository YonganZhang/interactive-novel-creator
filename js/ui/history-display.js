// 历史显示 - 对话历史渲染和管理
class HistoryDisplay {
    constructor() {
        this.container = null;
    }

    // 初始化
    init() {
        this.container = document.getElementById('history-display');
    }

    // 添加消息
    addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message message-${role}`;

        // 处理内容格式
        if (role === 'assistant') {
            // AI消息可能包含markdown，简单处理换行
            messageDiv.innerHTML = this.formatContent(content);
        } else {
            messageDiv.textContent = content;
        }

        this.container.appendChild(messageDiv);
        this.scrollToBottom();

        return messageDiv;
    }

    // 更新消息内容（用于流式输出）
    updateMessage(element, content) {
        if (element.classList.contains('message-assistant')) {
            element.innerHTML = this.formatContent(content);
        } else {
            element.textContent = content;
        }
        this.scrollToBottom();
    }

    // 添加压缩标记
    addCompressedMarker(summary) {
        const marker = document.createElement('div');
        marker.className = 'message-compressed';
        marker.innerHTML = `
            <span>📦 之前的对话已压缩</span>
            <details style="margin-top: 8px;">
                <summary style="cursor: pointer;">查看摘要</summary>
                <p style="margin-top: 8px;">${summary}</p>
            </details>
        `;
        this.container.appendChild(marker);
        this.scrollToBottom();
    }

    // 格式化内容
    formatContent(content) {
        // 简单的markdown处理
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    }

    // 清空历史
    clear() {
        this.container.innerHTML = '';
    }

    // 滚动到底部
    scrollToBottom() {
        const chatContainer = this.container.parentElement;
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // 加载历史消息
    async loadHistory(sessionId, limit = 20) {
        try {
            const conversations = await storageManager.getRecentConversations(sessionId, limit);

            this.clear();

            // 检查是否有压缩摘要
            const summaries = await storageManager.getSummaries(sessionId);
            if (summaries.length > 0) {
                const latestSummary = summaries[summaries.length - 1];
                this.addCompressedMarker(latestSummary.summary);
            }

            // 渲染对话
            conversations.forEach(conv => {
                this.addMessage(conv.role, conv.content);
            });

        } catch (error) {
            console.error('加载历史失败:', error);
        }
    }

    // 导出为文本
    exportAsText() {
        const messages = this.container.querySelectorAll('.message');
        const text = Array.from(messages).map(msg => {
            const role = msg.classList.contains('message-user') ? '用户' : 'AI';
            return `${role}: ${msg.textContent}`;
        }).join('\n\n');

        return text;
    }

    // 导出为HTML
    exportAsHTML() {
        return this.container.innerHTML;
    }
}

// 导出单例
const historyDisplay = new HistoryDisplay();
