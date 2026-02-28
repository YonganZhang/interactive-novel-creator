/**
 * 向量数学工具函数
 */

/**
 * 计算两个向量的余弦相似度
 * @param {number[]} vecA - 向量A
 * @param {number[]} vecB - 向量B
 * @returns {number} 余弦相似度值 [-1, 1]
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    throw new Error('向量必须存在且长度相同');
  }

  const dot = dotProduct(vecA, vecB);
  const magA = Math.sqrt(dotProduct(vecA, vecA));
  const magB = Math.sqrt(dotProduct(vecB, vecB));

  if (magA === 0 || magB === 0) {
    return 0;
  }

  return dot / (magA * magB);
}

/**
 * 向量归一化（单位化）
 * @param {number[]} vec - 输入向量
 * @returns {number[]} 归一化后的向量
 */
function normalize(vec) {
  if (!vec || vec.length === 0) {
    throw new Error('向量不能为空');
  }

  const magnitude = Math.sqrt(dotProduct(vec, vec));

  if (magnitude === 0) {
    return vec.map(() => 0);
  }

  return vec.map(v => v / magnitude);
}

/**
 * 计算两个向量的点积
 * @param {number[]} vecA - 向量A
 * @param {number[]} vecB - 向量B
 * @returns {number} 点积结果
 */
function dotProduct(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    throw new Error('向量必须存在且长度相同');
  }

  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

// 浏览器环境下作为全局函数使用
