// API配置
const CONFIG = {
    // API配置（Key 由用户在界面输入，存 localStorage）
    api: {
        defaultBaseURL: 'https://api.zhizengzeng.com/xai/v1',
        defaultModel: 'grok-beta',
        defaultEmbeddingModel: 'grok-beta',
        get key() { return localStorage.getItem('novel_api_key') || ''; },
        get baseURL() { return localStorage.getItem('novel_api_base') || this.defaultBaseURL; },
        get model() { return localStorage.getItem('novel_api_model') || this.defaultModel; },
        get embeddingModel() { return localStorage.getItem('novel_embedding_model') || this.defaultEmbeddingModel; }
    },

    // 上下文管理配置
    context: {
        maxTokens: 8000,  // 最大token数
        compressionThreshold: 0.8,  // 80%触发压缩
        reservedTokens: {
            system: 500,
            worldSetting: 300,
            memories: 2000,
            buffer: 500
        }
    },

    // 记忆检索配置
    memory: {
        topK: 5,  // 检索top-5相关记忆
        similarityWeight: 0.5,
        importanceWeight: 0.3,
        freshnessWeight: 0.2,
        decayRate: 0.1  // 时间衰减率
    },

    // 数据库配置
    db: {
        name: 'NovelCreationDB',
        version: 1
    }
};
