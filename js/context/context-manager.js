// 上下文管理器 - 核心上下文管理和自动压缩
class ContextManager {
    constructor() {
        this.config = CONFIG.context;
        this.storageManager = null;
        this.contextBuilder = null;
        this.summarizer = null;
        this.memoryRetriever = null;
        this.tokenCounter = null;
    }

    // 初始化
    async init() {
        this.storageManager = storageManager;
        this.contextBuilder = contextBuilder;
        this.summarizer = summarizer;
        this.memoryRetriever = memoryRetriever;
        this.tokenCounter = tokenCounter;
    }

    // 构建上下文（主方法）
    async buildContext(sessionId, projectId, userInput) {
        try {
            // 1. 加载项目世界观
            const project = await this.storageManager.getProject(projectId);
            if (!project) {
                throw new Error('项目不存在');
            }

            // 2. 检索相关记忆
            const relevantMemories = await this.memoryRetriever.retrieveRelevantMemories(
                projectId,
                userInput,
                this.config.reservedTokens.memories / 100 // 粗略估算记忆数量
            );

            // 3. 加载最近对话
            const recentConversations = await this.storageManager.getRecentConversations(sessionId, 10);

            // 4. 加载压缩历史
            const summaries = await this.storageManager.getSummaries(sessionId);
            const compressedSummary = this.contextBuilder.buildCompressedSummary(summaries);

            // 5. 组装上下文
            const messages = await this.contextBuilder.assembleContext({
                worldSetting: project.worldSetting,
                memories: relevantMemories,
                compressedSummary,
                recentConversations,
                userInput
            });

            // 6. 计算token使用
            const tokenUsage = this.calculateTokenUsage(messages);

            // 7. 检查是否需要压缩
            if (tokenUsage.total > this.config.maxTokens * this.config.compressionThreshold) {
                console.log('Token使用超过阈值，触发自动压缩...');
                await this.compressOldConversations(sessionId, recentConversations);
                // 递归重建上下文
                return await this.buildContext(sessionId, projectId, userInput);
            }

            // 8. 如果仍然超出限制，优化上下文
            const optimizedMessages = await this.contextBuilder.optimizeContext(
                messages,
                this.config.maxTokens - this.config.reservedTokens.buffer
            );

            return {
                messages: optimizedMessages,
                tokenUsage: this.calculateTokenUsage(optimizedMessages),
                memoriesUsed: relevantMemories.length
            };
        } catch (error) {
            console.error('构建上下文失败:', error);
            throw error;
        }
    }

    // 计算token使用情况
    calculateTokenUsage(messages) {
        const breakdown = {
            system: 0,
            conversations: 0,
            total: 0
        };

        messages.forEach((msg, index) => {
            const tokens = this.tokenCounter.countTokens(msg.content) + 4;
            if (index === 0) {
                breakdown.system = tokens;
            } else {
                breakdown.conversations += tokens;
            }
            breakdown.total += tokens;
        });

        breakdown.percentage = (breakdown.total / this.config.maxTokens * 100).toFixed(1);

        return breakdown;
    }

    // 压缩旧对话
    async compressOldConversations(sessionId, conversations) {
        if (conversations.length <= 3) {
            console.log('对话数量太少，无需压缩');
            return;
        }

        try {
            // 保留最近3条对话，压缩其余
            const toKeep = conversations.slice(-3);
            const toCompress = conversations.slice(0, -3);

            if (toCompress.length === 0) {
                return;
            }

            console.log(`压缩 ${toCompress.length} 条对话...`);

            // 生成摘要
            const summary = await this.summarizer.summarizeConversations(toCompress);

            // 保存摘要
            await this.storageManager.createSummary({
                sessionId,
                summary,
                originalIds: toCompress.map(c => c.id),
                createdAt: Date.now()
            });

            // 删除已压缩的对话（可选，或标记为已压缩）
            // 这里我们保留原始对话，只是不再加载它们
            console.log('压缩完成');
        } catch (error) {
            console.error('压缩对话失败:', error);
            throw error;
        }
    }

    // 获取上下文状态
    async getContextStatus(sessionId, projectId) {
        try {
            const recentConversations = await this.storageManager.getRecentConversations(sessionId, 10);
            const summaries = await this.storageManager.getSummaries(sessionId);

            // 估算当前token使用
            const messages = await this.contextBuilder.assembleContext({
                worldSetting: { genre: '', setting: '' }, // 简化估算
                memories: [],
                compressedSummary: this.contextBuilder.buildCompressedSummary(summaries),
                recentConversations,
                userInput: ''
            });

            const tokenUsage = this.calculateTokenUsage(messages);

            return {
                conversationCount: recentConversations.length,
                summaryCount: summaries.length,
                tokenUsage,
                needsCompression: tokenUsage.total > this.config.maxTokens * this.config.compressionThreshold
            };
        } catch (error) {
            console.error('获取上下文状态失败:', error);
            return null;
        }
    }

    // 手动触发压缩
    async manualCompress(sessionId) {
        try {
            const conversations = await this.storageManager.getRecentConversations(sessionId, 20);
            await this.compressOldConversations(sessionId, conversations);
            return true;
        } catch (error) {
            console.error('手动压缩失败:', error);
            return false;
        }
    }

    // 清理旧摘要（保留最近N个）
    async cleanupOldSummaries(sessionId, keepCount = 5) {
        try {
            const summaries = await this.storageManager.getSummaries(sessionId);
            if (summaries.length <= keepCount) {
                return;
            }

            // 按时间排序，删除最旧的
            summaries.sort((a, b) => b.createdAt - a.createdAt);
            const toDelete = summaries.slice(keepCount);

            for (const summary of toDelete) {
                await this.storageManager.deleteSummary(summary.id);
            }

            console.log(`清理了 ${toDelete.length} 个旧摘要`);
        } catch (error) {
            console.error('清理摘要失败:', error);
        }
    }
}

// 导出单例
const contextManager = new ContextManager();
