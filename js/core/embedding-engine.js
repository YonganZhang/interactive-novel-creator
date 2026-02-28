// Embedding引擎 - 生成和缓存文本向量
class EmbeddingEngine {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 500;
    }

    // 生成embedding（使用OpenAI客户端）
    async generate(text) {
        // 检查缓存
        const cacheKey = this._getCacheKey(text);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // 调用API生成embedding
            const embedding = await openAIClient.generateEmbedding(text);

            // 缓存结果
            this._addToCache(cacheKey, embedding);

            return embedding;
        } catch (error) {
            console.error('生成embedding失败:', error);
            // 如果API失败，返回简单的哈希向量（降级方案）
            return this._generateSimpleEmbedding(text);
        }
    }

    // 批量生成embedding
    async generateBatch(texts) {
        const results = [];
        for (const text of texts) {
            const embedding = await this.generate(text);
            results.push(embedding);
        }
        return results;
    }

    // 生成缓存键
    _getCacheKey(text) {
        // 使用文本的哈希作为缓存键
        let hash = 0;
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    // 添加到缓存
    _addToCache(key, value) {
        // 如果缓存已满，删除最旧的项
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    // 简单embedding生成（降级方案）
    _generateSimpleEmbedding(text) {
        // 生成一个384维的简单向量（基于文本特征）
        const dim = 384;
        const vector = new Array(dim).fill(0);

        // 使用字符码和位置生成伪随机向量
        for (let i = 0; i < text.length && i < dim; i++) {
            const charCode = text.charCodeAt(i);
            vector[i % dim] += Math.sin(charCode * (i + 1)) * 0.1;
        }

        // 归一化
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => val / (magnitude || 1));
    }

    // 清除缓存
    clearCache() {
        this.cache.clear();
    }
}

// 导出单例
const embeddingEngine = new EmbeddingEngine();
