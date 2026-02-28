// 摘要生成器 - 压缩对话历史
class Summarizer {
    constructor() {
        this.openAIClient = null;
    }

    // 初始化
    async init() {
        this.openAIClient = openAIClient;
    }

    // 生成对话摘要
    async summarizeConversations(conversations) {
        if (!conversations || conversations.length === 0) {
            return '';
        }

        try {
            // 构建对话文本
            const conversationText = conversations.map(conv => {
                const role = conv.role === 'user' ? '用户' : 'AI';
                return `${role}: ${conv.content}`;
            }).join('\n\n');

            // 调用API生成摘要
            const messages = [
                {
                    role: 'system',
                    content: '你是一个专业的文本摘要助手。请将以下对话内容压缩成简洁的摘要，保留关键剧情点、角色行动和重要细节。摘要应该是第三人称叙述，长度控制在原文的1/3左右。'
                },
                {
                    role: 'user',
                    content: `请为以下对话生成摘要：\n\n${conversationText}`
                }
            ];

            const response = await this.openAIClient.chat(messages, {
                temperature: 0.3,
                max_tokens: 500
            });

            return response.content || '';
        } catch (error) {
            console.error('生成摘要失败:', error);
            // 降级方案：简单截取
            return this._simpleSummarize(conversations);
        }
    }

    // 简单摘要（降级方案）
    _simpleSummarize(conversations) {
        // 提取用户的行动和AI的关键描写
        const keyPoints = [];

        for (let i = 0; i < conversations.length; i += 2) {
            const userMsg = conversations[i];
            const aiMsg = conversations[i + 1];

            if (userMsg && userMsg.role === 'user') {
                keyPoints.push(`角色行动：${userMsg.content.substring(0, 50)}...`);
            }

            if (aiMsg && aiMsg.role === 'assistant') {
                // 提取第一句话作为关键点
                const firstSentence = aiMsg.content.split(/[。！？]/)[0];
                keyPoints.push(`剧情：${firstSentence}...`);
            }
        }

        return '【剧情摘要】\n' + keyPoints.join('\n');
    }

    // 批量摘要（分段处理长对话）
    async summarizeLongConversations(conversations, chunkSize = 10) {
        const summaries = [];

        for (let i = 0; i < conversations.length; i += chunkSize) {
            const chunk = conversations.slice(i, i + chunkSize);
            const summary = await this.summarizeConversations(chunk);
            summaries.push(summary);
        }

        // 如果有多个摘要，再次压缩
        if (summaries.length > 1) {
            return await this._mergeSummaries(summaries);
        }

        return summaries[0] || '';
    }

    // 合并多个摘要
    async _mergeSummaries(summaries) {
        try {
            const combinedText = summaries.join('\n\n---\n\n');

            const messages = [
                {
                    role: 'system',
                    content: '请将以下多个剧情摘要合并成一个连贯的总摘要，保持时间顺序和逻辑关系。'
                },
                {
                    role: 'user',
                    content: combinedText
                }
            ];

            const response = await this.openAIClient.chat(messages, {
                temperature: 0.3,
                max_tokens: 800
            });

            return response.content || combinedText;
        } catch (error) {
            console.error('合并摘要失败:', error);
            return summaries.join('\n\n');
        }
    }

    // 提取关键信息（用于创建记忆）
    async extractKeyInfo(conversations) {
        try {
            const conversationText = conversations.map(conv => {
                const role = conv.role === 'user' ? '用户' : 'AI';
                return `${role}: ${conv.content}`;
            }).join('\n\n');

            const messages = [
                {
                    role: 'system',
                    content: `分析以下对话，提取关键信息并以JSON格式返回：
{
  "characters": ["出现的角色名称"],
  "locations": ["提到的地点"],
  "events": ["发生的重要事件"],
  "items": ["提到的重要物品"]
}`
                },
                {
                    role: 'user',
                    content: conversationText
                }
            ];

            const response = await this.openAIClient.chat(messages, {
                temperature: 0.2,
                max_tokens: 300
            });

            // 尝试解析JSON
            try {
                return JSON.parse(response.content);
            } catch {
                return {
                    characters: [],
                    locations: [],
                    events: [],
                    items: []
                };
            }
        } catch (error) {
            console.error('提取关键信息失败:', error);
            return {
                characters: [],
                locations: [],
                events: [],
                items: []
            };
        }
    }
}

// 导出单例
const summarizer = new Summarizer();
