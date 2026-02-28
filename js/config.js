// API配置
const CONFIG = {
    // API配置
    api: {
        defaultKey: 'sk-zk216a4ba9d5fbea9b112ad497c455b9cc169a200773ad4f',
        defaultBaseURL: 'https://api.zhizengzeng.com/xai/v1',
        defaultModel: 'grok-4-1-fast-reasoning',
        defaultEmbeddingModel: 'grok-4-1-fast-reasoning',
        get key() { return localStorage.getItem('novel_api_key') || this.defaultKey; },
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
    },

    // 登录配置（SHA-256 哈希，运行时比对）
    auth: {
        // 预计算的哈希会在 app.js 中通过 Web Crypto API 验证
        usernameHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', // admin
        passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'  // admin123
    }
};
