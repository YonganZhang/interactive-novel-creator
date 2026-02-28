// 记忆检索器 - 实现PowerMem的时间衰减算法
class MemoryRetriever {
    constructor() {
        this.memoryManager = null;
        this.config = CONFIG.memory;
    }

    // 初始化
    async init() {
        this.memoryManager = memoryManager;
    }

    // 检索相关记忆（核心方法）
    async retrieveRelevantMemories(projectId, userInput, topK = null) {
        topK = topK || this.config.topK;

        try {
            // 1. 生成查询embedding
            const queryEmbedding = await embeddingEngine.generate(userInput);

            // 2. 加载所有记忆
            const allMemories = await this.memoryManager.getProjectMemories(projectId);

            if (allMemories.length === 0) {
                return [];
            }

            // 3. 计算混合评分
            const scored = allMemories.map(memory => {
                // 相似度评分
                const similarity = this._calculateSimilarity(queryEmbedding, memory.embedding);

                // 重要性评分（归一化到0-1）
                const importance = memory.metadata.importance / 10;

                // 时间衰减评分
                const freshness = memory.metadata.getFreshness(this.config.decayRate);

                // 综合评分（PowerMem公式）
                const finalScore =
                    similarity * this.config.similarityWeight +
                    importance * this.config.importanceWeight +
                    freshness * this.config.freshnessWeight;

                return {
                    memory,
                    similarity,
                    importance,
                    freshness,
                    finalScore
                };
            });

            // 4. 排序并返回Top-K
            const topMemories = scored
                .sort((a, b) => b.finalScore - a.finalScore)
                .slice(0, topK);

            // 5. 标记这些记忆被访问
            const memoryIds = topMemories.map(item => item.memory.id);
            await this.memoryManager.markMultipleAccessed(memoryIds);

            // 6. 返回记忆对象和评分信息
            return topMemories.map(item => ({
                memory: item.memory,
                score: item.finalScore,
                breakdown: {
                    similarity: item.similarity,
                    importance: item.importance,
                    freshness: item.freshness
                }
            }));
        } catch (error) {
            console.error('检索记忆失败:', error);
            return [];
        }
    }

    // 按类型检索记忆
    async retrieveByType(projectId, type, topK = 5) {
        try {
            const memories = await this.memoryManager.getProjectMemories(projectId, type);

            // 按重要性和新鲜度排序
            const scored = memories.map(memory => {
                const importance = memory.metadata.importance / 10;
                const freshness = memory.metadata.getFreshness(this.config.decayRate);
                const score = importance * 0.6 + freshness * 0.4;

                return { memory, score };
            });

            return scored
                .sort((a, b) => b.score - a.score)
                .slice(0, topK)
                .map(item => item.memory);
        } catch (error) {
            console.error('按类型检索记忆失败:', error);
            return [];
        }
    }

    // 获取最近访问的记忆
    async getRecentlyAccessed(projectId, limit = 10) {
        try {
            const allMemories = await this.memoryManager.getProjectMemories(projectId);

            return allMemories
                .sort((a, b) => b.metadata.lastAccessedAt - a.metadata.lastAccessedAt)
                .slice(0, limit);
        } catch (error) {
            console.error('获取最近访问记忆失败:', error);
            return [];
        }
    }

    // 获取最重要的记忆
    async getMostImportant(projectId, limit = 10) {
        try {
            const allMemories = await this.memoryManager.getProjectMemories(projectId);

            return allMemories
                .sort((a, b) => b.metadata.importance - a.metadata.importance)
                .slice(0, limit);
        } catch (error) {
            console.error('获取最重要记忆失败:', error);
            return [];
        }
    }

    // 计算相似度（余弦相似度）
    _calculateSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        // 使用vector-math.js中的cosineSimilarity函数
        if (typeof cosineSimilarity !== 'undefined') {
            return cosineSimilarity(vecA, vecB);
        }

        // 降级实现
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }

    // 智能检索：结合语义相似度和类型过滤
    async smartRetrieve(projectId, userInput, options = {}) {
        const {
            types = null,           // 限制记忆类型
            minImportance = 0,      // 最低重要性
            maxAge = null,          // 最大年龄（天）
            topK = this.config.topK
        } = options;

        try {
            // 先检索相关记忆
            let results = await this.retrieveRelevantMemories(projectId, userInput, topK * 2);

            // 应用过滤器
            results = results.filter(item => {
                const memory = item.memory;

                // 类型过滤
                if (types && !types.includes(memory.type)) {
                    return false;
                }

                // 重要性过滤
                if (memory.metadata.importance < minImportance) {
                    return false;
                }

                // 年龄过滤
                if (maxAge) {
                    const ageInDays = (Date.now() - memory.metadata.createdAt) / (1000 * 60 * 60 * 24);
                    if (ageInDays > maxAge) {
                        return false;
                    }
                }

                return true;
            });

            // 返回Top-K
            return results.slice(0, topK);
        } catch (error) {
            console.error('智能检索失败:', error);
            return [];
        }
    }
}

// 导出单例
const memoryRetriever = new MemoryRetriever();
