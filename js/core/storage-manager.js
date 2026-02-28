/**
 * 基于IndexedDB的存储管理器
 * 管理项目、记忆、对话、会话和摘要数据
 */
class StorageManager {
  constructor() {
    this.dbName = 'NovelAssistantDB';
    this.version = 1;
    this.db = null;
  }

  /**
   * 初始化数据库
   * @returns {Promise<IDBDatabase>}
   */
  initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Failed to open database: ' + request.error));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 创建 projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id', autoIncrement: true });
          projectStore.createIndex('name', 'name', { unique: false });
          projectStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 创建 memories store
        if (!db.objectStoreNames.contains('memories')) {
          const memoryStore = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
          memoryStore.createIndex('projectId', 'projectId', { unique: false });
          memoryStore.createIndex('type', 'type', { unique: false });
          memoryStore.createIndex('projectId_type', ['projectId', 'type'], { unique: false });
          memoryStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }

        // 创建 conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const conversationStore = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
          conversationStore.createIndex('sessionId', 'sessionId', { unique: false });
          conversationStore.createIndex('timestamp', 'timestamp', { unique: false });
          conversationStore.createIndex('sessionId_timestamp', ['sessionId', 'timestamp'], { unique: false });
        }

        // 创建 sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id', autoIncrement: true });
          sessionStore.createIndex('projectId', 'projectId', { unique: false });
          sessionStore.createIndex('lastActiveAt', 'lastActiveAt', { unique: false });
        }

        // 创建 summaries store
        if (!db.objectStoreNames.contains('summaries')) {
          const summaryStore = db.createObjectStore('summaries', { keyPath: 'id', autoIncrement: true });
          summaryStore.createIndex('sessionId', 'sessionId', { unique: false });
          summaryStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * 确保数据库已初始化
   * @returns {Promise<IDBDatabase>}
   */
  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
    return this.db;
  }

  /**
   * 创建项目
   * @param {Object} data - 项目数据
   * @returns {Promise<number>} 项目ID
   */
  async createProject(data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');

      const projectData = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      };

      const request = store.add(projectData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to create project: ' + request.error));
      };
    });
  }

  /**
   * 获取项目
   * @param {number} id - 项目ID
   * @returns {Promise<Object>}
   */
  async getProject(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readonly');
      const store = transaction.objectStore('projects');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get project: ' + request.error));
      };
    });
  }

  /**
   * 更新项目
   * @param {number} id - 项目ID
   * @param {Object} data - 更新数据
   * @returns {Promise<void>}
   */
  async updateProject(id, data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['projects'], 'readwrite');
      const store = transaction.objectStore('projects');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const project = getRequest.result;
        if (!project) {
          reject(new Error('Project not found'));
          return;
        }

        const updatedProject = {
          ...project,
          ...data,
          id: id,
          updatedAt: new Date().toISOString()
        };

        const putRequest = store.put(updatedProject);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = () => {
          reject(new Error('Failed to update project: ' + putRequest.error));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get project: ' + getRequest.error));
      };
    });
  }

  /**
   * 创建记忆
   * @param {Object} data - 记忆数据
   * @returns {Promise<number>} 记忆ID
   */
  async createMemory(data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');

      const memoryData = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        lastAccessedAt: data.lastAccessedAt || new Date().toISOString()
      };

      const request = store.add(memoryData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to create memory: ' + request.error));
      };
    });
  }

  /**
   * 获取记忆列表
   * @param {number} projectId - 项目ID
   * @param {string} type - 记忆类型（可选）
   * @returns {Promise<Array>}
   */
  async getMemories(projectId, type = null) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');

      let request;
      if (type) {
        const index = store.index('projectId_type');
        request = index.getAll([projectId, type]);
      } else {
        const index = store.index('projectId');
        request = index.getAll(projectId);
      }

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get memories: ' + request.error));
      };
    });
  }

  /**
   * 更新记忆
   * @param {number} id - 记忆ID
   * @param {Object} data - 更新数据
   * @returns {Promise<void>}
   */
  async updateMemory(id, data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const memory = getRequest.result;
        if (!memory) {
          reject(new Error('Memory not found'));
          return;
        }

        const updatedMemory = {
          ...memory,
          ...data,
          id: id,
          lastAccessedAt: new Date().toISOString()
        };

        const putRequest = store.put(updatedMemory);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = () => {
          reject(new Error('Failed to update memory: ' + putRequest.error));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get memory: ' + getRequest.error));
      };
    });
  }

  /**
   * 获取单个记忆
   * @param {number} id - 记忆ID
   * @returns {Promise<Object>}
   */
  async getMemory(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories'], 'readonly');
      const store = transaction.objectStore('memories');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get memory: ' + request.error));
      };
    });
  }

  /**
   * 删除记忆
   * @param {number} id - 记忆ID
   * @returns {Promise<void>}
   */
  async deleteMemory(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['memories'], 'readwrite');
      const store = transaction.objectStore('memories');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete memory: ' + request.error));
      };
    });
  }

  /**
   * 删除摘要
   * @param {number} id - 摘要ID
   * @returns {Promise<void>}
   */
  async deleteSummary(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['summaries'], 'readwrite');
      const store = transaction.objectStore('summaries');
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to delete summary: ' + request.error));
      };
    });
  }

  /**
   * 创建对话
   * @param {Object} data - 对话数据
   * @returns {Promise<number>} 对话ID
   */
  async createConversation(data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readwrite');
      const store = transaction.objectStore('conversations');

      const conversationData = {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      };

      const request = store.add(conversationData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to create conversation: ' + request.error));
      };
    });
  }

  /**
   * 获取最近对话
   * @param {number} sessionId - 会话ID
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>}
   */
  async getRecentConversations(sessionId, limit = 50) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conversations'], 'readonly');
      const store = transaction.objectStore('conversations');
      const index = store.index('sessionId_timestamp');

      const conversations = [];
      const range = IDBKeyRange.bound([sessionId, ''], [sessionId, '\uffff']);
      const request = index.openCursor(range, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor && conversations.length < limit) {
          conversations.push(cursor.value);
          cursor.continue();
        } else {
          resolve(conversations.reverse());
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get conversations: ' + request.error));
      };
    });
  }

  /**
   * 创建摘要
   * @param {Object} data - 摘要数据
   * @returns {Promise<number>} 摘要ID
   */
  async createSummary(data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['summaries'], 'readwrite');
      const store = transaction.objectStore('summaries');

      const summaryData = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString()
      };

      const request = store.add(summaryData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to create summary: ' + request.error));
      };
    });
  }

  /**
   * 获取摘要列表
   * @param {number} sessionId - 会话ID
   * @returns {Promise<Array>}
   */
  async getSummaries(sessionId) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['summaries'], 'readonly');
      const store = transaction.objectStore('summaries');
      const index = store.index('sessionId');
      const request = index.getAll(sessionId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get summaries: ' + request.error));
      };
    });
  }

  /**
   * 创建会话
   * @param {Object} data - 会话数据
   * @returns {Promise<number>} 会话ID
   */
  async createSession(data) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');

      const sessionData = {
        ...data,
        createdAt: data.createdAt || new Date().toISOString(),
        lastActiveAt: data.lastActiveAt || new Date().toISOString()
      };

      const request = store.add(sessionData);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to create session: ' + request.error));
      };
    });
  }

  /**
   * 更新会话活跃时间
   * @param {number} id - 会话ID
   * @returns {Promise<void>}
   */
  async updateSessionActivity(id) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessions'], 'readwrite');
      const store = transaction.objectStore('sessions');

      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const session = getRequest.result;
        if (!session) {
          reject(new Error('Session not found'));
          return;
        }

        session.lastActiveAt = new Date().toISOString();
        const putRequest = store.put(session);

        putRequest.onsuccess = () => {
          resolve();
        };

        putRequest.onerror = () => {
          reject(new Error('Failed to update session: ' + putRequest.error));
        };
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get session: ' + getRequest.error));
      };
    });
  }

  /**
   * 获取项目的所有会话
   * @param {number} projectId - 项目ID
   * @returns {Promise<Array>}
   */
  async getProjectSessions(projectId) {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sessions'], 'readonly');
      const store = transaction.objectStore('sessions');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get sessions: ' + request.error));
      };
    });
  }
}

// 导出单例
const storageManager = new StorageManager();
