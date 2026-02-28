/**
 * 文本处理工具函数
 */

// 中文停用词列表（简化版）
const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
  '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
  '自己', '这', '那', '里', '为', '与', '个', '中', '大', '来', '以', '时', '地',
  '们', '出', '得', '可', '下', '对', '生', '能', '而', '子', '后', '年', '两',
  '他', '她', '它', '这个', '那个', '什么', '怎么', '哪里', '为什么'
]);

/**
 * 截断文本到指定长度
 * @param {string} text - 输入文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
function truncate(text, maxLength) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
}

/**
 * 提取文本关键词（简单实现：分词+去停用词）
 * @param {string} text - 输入文本
 * @returns {string[]} 关键词数组
 */
function extractKeywords(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // 简单分词：按标点和空格分割
  const words = text
    .replace(/[，。！？；：、""''（）《》【】\s]+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0);

  // 去除停用词
  const keywords = words.filter(word => !STOP_WORDS.has(word));

  // 统计词频
  const wordCount = {};
  keywords.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });

  // 按词频排序并返回
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/**
 * 简单文本摘要（取前N个句子）
 * @param {string} text - 输入文本
 * @param {number} maxLength - 最大字符长度
 * @returns {string} 摘要文本
 */
function summarize(text, maxLength) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  // 按句子分割（中文句号、问号、感叹号）
  const sentences = text.split(/[。！？]+/).filter(s => s.trim().length > 0);

  let summary = '';
  for (const sentence of sentences) {
    const nextSummary = summary + sentence + '。';
    if (nextSummary.length > maxLength) {
      break;
    }
    summary = nextSummary;
  }

  // 如果一个句子都放不下，就截断第一个句子
  if (summary.length === 0 && sentences.length > 0) {
    summary = truncate(sentences[0], maxLength - 3) + '。';
  }

  return summary || truncate(text, maxLength);
}

// 浏览器环境下作为全局函数使用
