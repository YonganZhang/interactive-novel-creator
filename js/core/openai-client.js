// OpenAI API客户端（兼容xAI Grok API）
class OpenAIClient {
    constructor() {
        this.apiKey = CONFIG.api.key;
        this.baseURL = CONFIG.api.baseURL;
        this.model = CONFIG.api.model;
        this.embeddingModel = CONFIG.api.embeddingModel;
        this.timeout = 30000; // 30秒超时
        this.maxRetries = 3;
    }

    /**
     * 发送聊天请求
     * @param {Array} messages - 消息数组
     * @param {Object} options - 可选参数
     * @returns {Promise<Object>} API响应
     */
    async chat(messages, options = {}) {
        const {
            temperature = 0.7,
            max_tokens = 2000,
            stream = false,
            ...otherOptions
        } = options;

        const requestBody = {
            model: this.model,
            messages,
            temperature,
            max_tokens,
            stream,
            ...otherOptions
        };

        return this._requestWithRetry('/chat/completions', requestBody);
    }

    /**
     * 流式聊天请求
     * @param {Array} messages - 消息数组
     * @param {Object} options - 可选参数
     * @param {Function} onChunk - 接收每个token的回调函数
     * @returns {Promise<string>} 完整响应文本
     */
    async chatStream(messages, options = {}, onChunk) {
        const {
            temperature = 0.7,
            max_tokens = 2000,
            ...otherOptions
        } = options;

        const requestBody = {
            model: this.model,
            messages,
            temperature,
            max_tokens,
            stream: true,
            ...otherOptions
        };

        const url = `${this.baseURL}/chat/completions`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this._getHeaders(),
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(`API错误 ${response.status}: ${error.error?.message || response.statusText}`);
            }

            return await this._processStream(response, onChunk);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('请求超时');
            }
            throw error;
        }
    }

    /**
     * 生成文本的embedding向量
     * @param {string} text - 输入文本
     * @returns {Promise<Array<number>>} embedding向量
     */
    async generateEmbedding(text) {
        const requestBody = {
            model: this.embeddingModel,
            input: text
        };

        const response = await this._requestWithRetry('/embeddings', requestBody);
        return response.data[0].embedding;
    }

    /**
     * 获取请求头
     * @private
     */
    _getHeaders() {
        return {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * 带重试的请求
     * @private
     */
    async _requestWithRetry(endpoint, body, retries = 0) {
        const url = `${this.baseURL}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: this._getHeaders(),
                body: JSON.stringify(body),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                const errorMessage = error.error?.message || response.statusText;

                // 5xx错误或网络错误才重试
                if (response.status >= 500 && retries < this.maxRetries) {
                    console.warn(`请求失败，重试 ${retries + 1}/${this.maxRetries}...`);
                    await this._delay(Math.pow(2, retries) * 1000); // 指数退避
                    return this._requestWithRetry(endpoint, body, retries + 1);
                }

                throw new Error(`API错误 ${response.status}: ${errorMessage}`);
            }

            return await response.json();
        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                if (retries < this.maxRetries) {
                    console.warn(`请求超时，重试 ${retries + 1}/${this.maxRetries}...`);
                    return this._requestWithRetry(endpoint, body, retries + 1);
                }
                throw new Error('请求超时');
            }

            // 网络错误重试
            if (error.message.includes('fetch') && retries < this.maxRetries) {
                console.warn(`网络错误，重试 ${retries + 1}/${this.maxRetries}...`);
                await this._delay(Math.pow(2, retries) * 1000);
                return this._requestWithRetry(endpoint, body, retries + 1);
            }

            throw error;
        }
    }

    /**
     * 处理SSE流式响应
     * @private
     */
    async _processStream(response, onChunk) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // 保留不完整的行

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || trimmed === 'data: [DONE]') continue;

                    if (trimmed.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(trimmed.slice(6));
                            const content = data.choices[0]?.delta?.content;

                            if (content) {
                                fullText += content;
                                if (onChunk) {
                                    onChunk(content);
                                }
                            }
                        } catch (e) {
                            console.warn('解析SSE数据失败:', e);
                        }
                    }
                }
            }

            return fullText;
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * 延迟函数
     * @private
     */
    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
