// API配置
const CONFIG = {
    // xAI Grok API配置
    api: {
        key: 'sk-zk216a4ba9d5fbea9b112ad497c455b9cc169a200773ad4f',
        baseURL: 'https://api.zhizengzeng.com/xai/v1',
        model: 'grok-beta',  // 使用grok-beta作为主模型
        embeddingModel: 'grok-beta'  // Grok也用于embedding
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
