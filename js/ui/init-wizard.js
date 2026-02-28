// 初始化向导 - 对话式引导创建世界观
class InitWizard {
    constructor() {
        this.steps = [
            {
                id: 'genre',
                question: '你想创作什么类型的故事？',
                placeholder: '例如：奇幻冒险、科幻、武侠、现代都市、历史架空等...',
                examples: ['奇幻冒险', '科幻', '武侠', '现代都市', '历史架空']
            },
            {
                id: 'setting',
                question: '故事发生在什么样的世界？',
                placeholder: '描述世界的背景、时代、地理环境等...',
                examples: []
            },
            {
                id: 'tone',
                question: '你希望故事的叙事风格是怎样的？',
                placeholder: '例如：轻松幽默、严肃深沉、热血激昂、悬疑紧张等...',
                examples: ['轻松幽默', '严肃深沉', '热血激昂', '悬疑紧张']
            },
            {
                id: 'rules',
                question: '这个世界有什么特殊的规则或限制吗？',
                placeholder: '例如：魔法体系、科技水平、社会制度、特殊能力等...',
                examples: []
            },
            {
                id: 'protagonist',
                question: '请描述主角的基本信息',
                placeholder: '包括姓名、性格、背景、目标等...',
                examples: []
            }
        ];
        this.currentStep = 0;
        this.answers = {};
        this.elements = {};
    }

    // 初始化UI
    init() {
        this.elements = {
            container: document.getElementById('init-wizard'),
            stepDisplay: document.getElementById('wizard-step'),
            answerInput: document.getElementById('wizard-answer'),
            nextButton: document.getElementById('wizard-next')
        };

        // 绑定事件
        this.elements.nextButton.addEventListener('click', () => this.handleNext());
        this.elements.answerInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleNext();
            }
        });

        // 显示第一个问题
        this.showCurrentStep();
    }

    // 显示当前步骤
    showCurrentStep() {
        const step = this.steps[this.currentStep];

        let html = `
            <p class="wizard-question">${step.question}</p>
            <p class="wizard-progress">步骤 ${this.currentStep + 1} / ${this.steps.length}</p>
        `;

        // 如果有示例，显示快捷选项
        if (step.examples && step.examples.length > 0) {
            html += '<div class="wizard-examples">';
            step.examples.forEach(example => {
                html += `<button class="example-btn" data-value="${example}">${example}</button>`;
            });
            html += '</div>';
        }

        this.elements.stepDisplay.innerHTML = html;
        this.elements.answerInput.placeholder = step.placeholder;
        this.elements.answerInput.value = '';
        this.elements.answerInput.focus();

        // 绑定示例按钮事件
        document.querySelectorAll('.example-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.elements.answerInput.value = e.target.dataset.value;
                this.elements.answerInput.focus();
            });
        });

        // 更新按钮文本
        this.elements.nextButton.textContent =
            this.currentStep === this.steps.length - 1 ? '完成' : '下一步';
    }

    // 处理下一步
    async handleNext() {
        const answer = this.elements.answerInput.value.trim();

        if (!answer) {
            alert('请输入回答');
            return;
        }

        // 保存答案
        this.answers[this.steps[this.currentStep].id] = answer;

        // 移动到下一步
        this.currentStep++;

        if (this.currentStep >= this.steps.length) {
            // 完成向导，生成世界观
            await this.complete();
        } else {
            // 显示下一个问题
            this.showCurrentStep();
        }
    }

    // 完成向导
    async complete() {
        try {
            // 显示加载状态
            this.showLoading('正在生成世界观...');

            // 生成世界观
            const worldSetting = await this.generateWorldSetting();

            // 创建项目
            const projectId = await storageManager.createProject({
                name: `${this.answers.genre}故事`,
                worldSetting
            });

            // 创建会话
            const sessionId = await storageManager.createSession({
                projectId
            });

            // 创建初始记忆（主角）
            await memoryManager.createMemory(
                projectId,
                MemoryTypes.CHARACTER,
                '主角',
                this.answers.protagonist,
                { importance: ImportanceLevel.CRITICAL }
            );

            // 隐藏向导，显示主界面
            this.hide();
            await creationInterface.init(projectId, sessionId);

        } catch (error) {
            console.error('完成向导失败:', error);
            alert('初始化失败: ' + error.message);
            this.hideLoading();
        }
    }

    // 生成世界观
    async generateWorldSetting() {
        const prompt = `基于以下信息，生成一个详细的故事世界观设定。请以JSON格式返回，包含以下字段：
- genre: 类型
- setting: 世界背景
- tone: 叙事风格
- rules: 世界规则
- protagonist: 主角信息

用户回答：
类型：${this.answers.genre}
世界：${this.answers.setting}
风格：${this.answers.tone}
规则：${this.answers.rules}
主角：${this.answers.protagonist}

请生成一个连贯、详细的世界观设定。`;

        try {
            const response = await openAIClient.chat([
                {
                    role: 'system',
                    content: '你是一个专业的故事世界观设计师。请根据用户提供的信息，生成详细的世界观设定。'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ], {
                temperature: 0.8,
                max_tokens: 1000
            });

            // 尝试解析JSON
            try {
                return JSON.parse(response.choices[0].message.content);
            } catch {
                // 如果不是JSON，使用原始答案构建
                return {
                    genre: this.answers.genre,
                    setting: this.answers.setting,
                    tone: this.answers.tone,
                    rules: this.answers.rules,
                    protagonist: this.answers.protagonist
                };
            }
        } catch (error) {
            console.error('生成世界观失败:', error);
            // 降级方案：直接使用用户输入
            return {
                genre: this.answers.genre,
                setting: this.answers.setting,
                tone: this.answers.tone,
                rules: this.answers.rules,
                protagonist: this.answers.protagonist
            };
        }
    }

    // 显示加载状态
    showLoading(message) {
        const loading = document.getElementById('loading');
        loading.querySelector('p').textContent = message;
        loading.style.display = 'flex';
    }

    // 隐藏加载状态
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    // 隐藏向导
    hide() {
        this.elements.container.style.display = 'none';
    }

    // 显示向导
    show() {
        this.elements.container.style.display = 'flex';
        this.currentStep = 0;
        this.answers = {};
        this.showCurrentStep();
    }
}

// 导出单例
const initWizard = new InitWizard();
