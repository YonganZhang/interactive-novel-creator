/**
 * Token计数工具
 * 使用简单估算方法计算文本的token数
 */
class TokenCounter {
  constructor() {
    // 缓存已计算的文本，最多1000条
    this.cache = new Map();
    this.maxCacheSize = 1000;
  }

  /**
   * 估算文本的token数
   * @param {string} text - 要计算的文本
   * @returns {number} 估算的token数
   */
  countTokens(text) {
    if (!text || typeof text !== 'string') {
      return 0;
    }

    // 检查缓存
    if (this.cache.has(text)) {
      return this.cache.get(text);
    }

    let tokens = 0;

    // 分离中文字符、英文单词和标点符号
    // 中文字符（包括中文标点）
    const chineseChars = text.match(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g) || [];
    tokens += chineseChars.length * 1.5;

    // 英文单词（连续的字母数字组合）
    const englishWords = text.match(/[a-zA-Z0-9]+/g) || [];
    tokens += englishWords.length * 1.3;

    // 其他标点符号和特殊字符
    const otherChars = text.replace(/[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef]/g, '')
                           .replace(/[a-zA-Z0-9]+/g, '')
                           .replace(/\s+/g, '');
    tokens += otherChars.length;

    // 四舍五入
    tokens = Math.round(tokens);

    // 缓存结果
    this._addToCache(text, tokens);

    return tokens;
  }

  /**
   * 计算消息数组的总token数
   * @param {Array} messages - 消息数组，每条消息包含role和content
   * @returns {number} 总token数
   */
  countMessages(messages) {
    if (!Array.isArray(messages)) {
      return 0;
    }

    let totalTokens = 0;

    for (const message of messages) {
      // 每条消息的格式开销：4 tokens
      totalTokens += 4;

      // role字段的token数
      if (message.role) {
        totalTokens += this.countTokens(message.role);
      }

      // content字段的token数
      if (message.content) {
        totalTokens += this.countTokens(message.content);
      }
    }

    return totalTokens;
  }

  /**
   * 添加到缓存，超过最大容量时删除最早的条目
   * @private
   */
  _addToCache(text, tokens) {
    // 如果缓存已满，删除最早的条目
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(text, tokens);
  }

  /**
   * 清空缓存
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存大小和最大容量
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

// 导出单例对象
const tokenCounter = new TokenCounter();
