// 记忆管理器 - 负责记忆的CRUD操作
class MemoryManager {
    constructor() {
        this.storageManager = null;
        this.embeddingEngine = null;
    }

    // 初始化
    async init() {
        this.storageManager = storageManager;
        this.embeddingEngine = embeddingEngine;
    }

    // 创建记忆
    async createMemory(projectId, type, title, content, metadata = {}) {
        try {
            // 生成embedding
            const embedding = await this.embeddingEngine.generate(content);

            // 创建记忆对象
            const memory = new Memory({
                projectId,
                type,
                title,
                content,
                embedding,
                metadata
            });

            // 保存到数据库
            await this.storageManager.createMemory(memory.toStorageFormat());

            return memory;
        } catch (error) {
            console.error('创建记忆失败:', error);
            throw error;
        }
    }

    // 获取记忆
    async getMemory(memoryId) {
        try {
            const data = await this.storageManager.getMemory(memoryId);
            return data ? Memory.fromStorageFormat(data) : null;
        } catch (error) {
            console.error('获取记忆失败:', error);
            throw error;
        }
    }

    // 获取项目的所有记忆
    async getProjectMemories(projectId, type = null) {
        try {
            const data = await this.storageManager.getMemories(projectId, type);
            return data.map(item => Memory.fromStorageFormat(item));
        } catch (error) {
            console.error('获取项目记忆失败:', error);
            throw error;
        }
    }

    // 更新记忆
    async updateMemory(memoryId, updates) {
        try {
            // 如果更新了内容，重新生成embedding
            if (updates.content) {
                updates.embedding = await this.embeddingEngine.generate(updates.content);
            }

            await this.storageManager.updateMemory(memoryId, updates);
        } catch (error) {
            console.error('更新记忆失败:', error);
            throw error;
        }
    }

    // 删除记忆
    async deleteMemory(memoryId) {
        try {
            await this.storageManager.deleteMemory(memoryId);
        } catch (error) {
            console.error('删除记忆失败:', error);
            throw error;
        }
    }

    // 标记记忆被访问
    async markAccessed(memoryId) {
        try {
            const memory = await this.getMemory(memoryId);
            if (memory) {
                memory.metadata.updateAccess();
                await this.storageManager.updateMemory(memoryId, {
                    metadata: memory.metadata
                });
            }
        } catch (error) {
            console.error('标记记忆访问失败:', error);
        }
    }

    // 批量标记访问
    async markMultipleAccessed(memoryIds) {
        for (const id of memoryIds) {
            await this.markAccessed(id);
        }
    }

    // 搜索记忆（按标题或内容）
    async searchMemories(projectId, query) {
        try {
            const allMemories = await this.getProjectMemories(projectId);
            const lowerQuery = query.toLowerCase();

            return allMemories.filter(memory =>
                memory.title.toLowerCase().includes(lowerQuery) ||
                memory.content.toLowerCase().includes(lowerQuery)
            );
        } catch (error) {
            console.error('搜索记忆失败:', error);
            throw error;
        }
    }

    // 获取相关记忆（通过关联ID）
    async getRelatedMemories(memoryId) {
        try {
            const memory = await this.getMemory(memoryId);
            if (!memory || !memory.metadata.relatedMemories.length) {
                return [];
            }

            const related = [];
            for (const relatedId of memory.metadata.relatedMemories) {
                const relatedMemory = await this.getMemory(relatedId);
                if (relatedMemory) {
                    related.push(relatedMemory);
                }
            }
            return related;
        } catch (error) {
            console.error('获取相关记忆失败:', error);
            throw error;
        }
    }
}

// 导出单例
const memoryManager = new MemoryManager();
