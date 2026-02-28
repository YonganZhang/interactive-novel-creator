// 记忆类型定义
const MemoryTypes = {
    CHARACTER: 'character',      // 角色
    LOCATION: 'location',        // 场景/地点
    EVENT: 'event',             // 事件
    ITEM: 'item',               // 物品
    RELATIONSHIP: 'relationship', // 关系
    RULE: 'rule',               // 世界规则
    PLOT: 'plot'                // 剧情线
};

// 记忆重要性等级
const ImportanceLevel = {
    CRITICAL: 10,    // 核心设定（主角、世界观）
    HIGH: 8,         // 重要角色、关键事件
    MEDIUM: 5,       // 次要角色、普通事件
    LOW: 3,          // 背景信息
    TRIVIAL: 1       // 琐碎细节
};

// 记忆元数据结构
class MemoryMetadata {
    constructor(options = {}) {
        this.importance = options.importance || ImportanceLevel.MEDIUM;
        this.tags = options.tags || [];
        this.relatedMemories = options.relatedMemories || [];
        this.accessCount = 0;
        this.lastAccessedAt = Date.now();
        this.createdAt = Date.now();
    }

    // 更新访问信息
    updateAccess() {
        this.accessCount++;
        this.lastAccessedAt = Date.now();
    }

    // 计算新鲜度（时间衰减）
    getFreshness(decayRate = 0.1) {
        const daysSinceAccess = (Date.now() - this.lastAccessedAt) / (1000 * 60 * 60 * 24);
        return Math.exp(-decayRate * daysSinceAccess);
    }
}

// 记忆对象
class Memory {
    constructor(data) {
        this.id = data.id || this._generateId();
        this.projectId = data.projectId;
        this.type = data.type;
        this.title = data.title;
        this.content = data.content;
        this.embedding = data.embedding || null;
        this.metadata = data.metadata instanceof MemoryMetadata
            ? data.metadata
            : new MemoryMetadata(data.metadata);
    }

    _generateId() {
        return 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // 转换为存储格式
    toStorageFormat() {
        return {
            id: this.id,
            projectId: this.projectId,
            type: this.type,
            title: this.title,
            content: this.content,
            embedding: this.embedding,
            metadata: {
                importance: this.metadata.importance,
                tags: this.metadata.tags,
                relatedMemories: this.metadata.relatedMemories,
                accessCount: this.metadata.accessCount,
                lastAccessedAt: this.metadata.lastAccessedAt,
                createdAt: this.metadata.createdAt
            }
        };
    }

    // 从存储格式创建
    static fromStorageFormat(data) {
        return new Memory(data);
    }
}
