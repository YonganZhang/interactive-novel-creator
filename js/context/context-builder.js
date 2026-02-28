// 上下文构建器 - 组装消息上下文
class ContextBuilder {
    constructor() {
        this.config = CONFIG.context;
    }

    // 构建系统提示词
    buildSystemPrompt(worldSetting) {
        return `你是一个专业的交互式小说创作AI助手。你的任务是根据用户输入的角色行动，生成引人入胜的后续剧情。

## 世界观设定
${JSON.stringify(worldSetting, null, 2)}

## 创作要求
1. 根据用户描述的角色行动，自然地推进剧情
2. 保持与世界观设定的一致性
3. 描写要生动、具体，富有画面感
4. 适当加入对话、心理描写和环境描写
5. 每次生成200-400字的内容
6. 保持叙事风格与世界观的基调一致
7. 在关键时刻制造悬念和冲突

## 注意事项
- 不要替用户决定角色的行动和想法
- 专注于描写行动的结果和环境的反应
- 保持剧情的连贯性和逻辑性`;
    }

    // 构建记忆上下文
    buildMemoryContext(memories) {
        if (!memories || memories.length === 0) {
            return '';
        }

        const sections = {
            character: [],
            location: [],
            event: [],
            other: []
        };

        // 按类型分组
        memories.forEach(item => {
            const memory = item.memory;
            const text = `【${memory.title}】${memory.content}`;

            if (memory.type === MemoryTypes.CHARACTER) {
                sections.character.push(text);
            } else if (memory.type === MemoryTypes.LOCATION) {
                sections.location.push(text);
            } else if (memory.type === MemoryTypes.EVENT) {
                sections.event.push(text);
            } else {
                sections.other.push(text);
            }
        });

        // 组装文本
        let context = '## 相关记忆\n\n';

        if (sections.character.length > 0) {
            context += '### 角色信息\n' + sections.character.join('\n') + '\n\n';
        }

        if (sections.location.length > 0) {
            context += '### 场景信息\n' + sections.location.join('\n') + '\n\n';
        }

        if (sections.event.length > 0) {
            context += '### 相关事件\n' + sections.event.join('\n') + '\n\n';
        }

        if (sections.other.length > 0) {
            context += '### 其他信息\n' + sections.other.join('\n') + '\n\n';
        }

        return context;
    }

    // 构建对话历史
    buildConversationHistory(conversations) {
        return conversations.map(conv => ({
            role: conv.role,
            content: conv.content
        }));
    }

    // 构建压缩历史摘要
    buildCompressedSummary(summaries) {
        if (!summaries || summaries.length === 0) {
            return '';
        }

        return '## 之前的剧情摘要\n\n' +
            summaries.map(s => s.summary).join('\n\n') +
            '\n\n---\n\n';
    }

    // 组装完整上下文
    async assembleContext(options) {
        const {
            worldSetting,
            memories = [],
            compressedSummary = '',
            recentConversations = [],
            userInput
        } = options;

        const messages = [];

        // 1. 系统提示词
        let systemContent = this.buildSystemPrompt(worldSetting);

        // 2. 添加压缩摘要
        if (compressedSummary) {
            systemContent += '\n\n' + compressedSummary;
        }

        // 3. 添加记忆上下文
        if (memories.length > 0) {
            systemContent += '\n\n' + this.buildMemoryContext(memories);
        }

        messages.push({
            role: 'system',
            content: systemContent
        });

        // 4. 添加最近对话
        messages.push(...this.buildConversationHistory(recentConversations));

        // 5. 添加用户输入
        if (userInput) {
            messages.push({
                role: 'user',
                content: userInput
            });
        }

        return messages;
    }

    // 计算消息的token数
    calculateTokens(messages) {
        let total = 0;
        for (const msg of messages) {
            total += tokenCounter.countTokens(msg.content);
            total += 4; // 消息格式开销
        }
        return total;
    }

    // 优化上下文（如果超出限制）
    async optimizeContext(messages, maxTokens) {
        let currentTokens = this.calculateTokens(messages);

        if (currentTokens <= maxTokens) {
            return messages;
        }

        // 策略：保留系统提示和最近的对话，压缩中间部分
        const systemMsg = messages[0];
        const recentMsgs = messages.slice(-6); // 保留最近3轮对话

        // 重新组装
        const optimized = [systemMsg, ...recentMsgs];
        currentTokens = this.calculateTokens(optimized);

        // 如果还是超出，缩短系统提示
        if (currentTokens > maxTokens) {
            const systemTokens = tokenCounter.countTokens(systemMsg.content);
            const recentTokens = currentTokens - systemTokens;
            const allowedSystemTokens = maxTokens - recentTokens - 100;

            if (allowedSystemTokens > 0) {
                systemMsg.content = this._truncateText(systemMsg.content, allowedSystemTokens);
            }
        }

        return optimized;
    }

    // 截断文本
    _truncateText(text, maxTokens) {
        const estimatedChars = maxTokens * 2; // 粗略估算
        if (text.length <= estimatedChars) {
            return text;
        }
        return text.substring(0, estimatedChars) + '...[内容已截断]';
    }
}

// 导出单例
const contextBuilder = new ContextBuilder();
