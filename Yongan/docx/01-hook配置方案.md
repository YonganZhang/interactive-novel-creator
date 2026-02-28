# Hook 配置方案 - 自动读取项目记录

**编号归属**：01
**状态**：completed
**Owner**：Claude
**对应 plan 条目**：2026-02-28 - 项目初始化与文档结构化
**最后更新**：2026-02-28
**本轮变更文件**：
- `Yongan/docx/00-总索引.md`（新建）
- `Yongan/docx/01-hook配置方案.md`（新建）

---

## 问题分析

### 现状问题
用户反馈：不是每次让 AI 做事情，AI 都会按照 TOP 要求记录到工作区的项目记录里。

### 根本原因
1. **上下文丢失**：每次新会话开始时，AI 没有自动读取项目历史记录
2. **记录意识不足**：AI 需要主动判断是否需要记录，容易遗漏
3. **缺少触发机制**：没有自动化机制提醒 AI 检查和更新记录

---

## 解决方案：user-prompt-submit-hook

### 核心思路
在用户每次提交新请求时，自动读取 `Yongan/docx/00-总索引.md`，让 AI 始终了解项目历史。

### Hook 配置

在 `.claude/settings.local.json` 中添加：

```json
{
  "hooks": {
    "user-prompt-submit": {
      "command": "python",
      "args": [
        "-c",
        "import os; path = 'Yongan/docx/00-总索引.md'; print(f'📋 项目记录：{path}' if os.path.exists(path) else '⚠️ 项目记录不存在，如有重要进展请创建记录')"
      ],
      "description": "提醒 AI 检查项目记录"
    }
  }
}
```

### 工作原理

1. **触发时机**：用户每次提交新请求时
2. **执行动作**：检查 `Yongan/docx/00-总索引.md` 是否存在
3. **输出提示**：
   - 存在 → 提示 AI 读取该文件
   - 不存在 → 提醒 AI 如有重要进展需创建记录
4. **AI 响应**：AI 看到提示后，会主动读取项目记录，恢复上下文

---

## 优化方案（进阶）

### 方案 A：自动读取内容（推荐）

如果希望 hook 直接输出文件内容（而不只是提示），可以使用：

```json
{
  "hooks": {
    "user-prompt-submit": {
      "command": "python",
      "args": [
        "-c",
        "import os; path = 'Yongan/docx/00-总索引.md'; print(open(path, 'r', encoding='utf-8').read() if os.path.exists(path) else '⚠️ 项目记录不存在')"
      ],
      "description": "自动加载项目记录"
    }
  }
}
```

**优点**：AI 无需额外调用 Read 工具，节省一次工具调用
**缺点**：如果文件很大，会增加每次请求的 token 消耗

### 方案 B：仅在特定条件触发

如果只想在特定情况下读取（比如用户提到"记录"、"文档"等关键词），可以使用更复杂的脚本：

```python
import sys
import os

# 读取用户输入（从环境变量或参数）
user_input = os.getenv('USER_INPUT', '')

# 关键词列表
keywords = ['记录', '文档', '总结', '索引', 'plan', 'log']

# 检查是否包含关键词
if any(kw in user_input.lower() for kw in keywords):
    path = 'Yongan/docx/00-总索引.md'
    if os.path.exists(path):
        print(f'📋 检测到相关关键词，项目记录：{path}')
    else:
        print('⚠️ 检测到相关关键词，但项目记录不存在')
else:
    print('')  # 不输出任何内容
```

---

## 配置步骤

### 1. 创建配置文件

如果 `.claude/settings.local.json` 不存在，创建它：

```bash
mkdir -p .claude
cat > .claude/settings.local.json << 'EOF'
{
  "hooks": {
    "user-prompt-submit": {
      "command": "python",
      "args": [
        "-c",
        "import os; path = 'Yongan/docx/00-总索引.md'; print(f'📋 项目记录：{path}' if os.path.exists(path) else '⚠️ 项目记录不存在，如有重要进展请创建记录')"
      ],
      "description": "提醒 AI 检查项目记录"
    }
  }
}
EOF
```

### 2. 测试 Hook

重启 Claude Code 会话，发送任意消息，应该会看到 hook 输出。

### 3. 验证效果

- AI 应该在看到提示后主动读取 `00-总索引.md`
- AI 在完成重要任务后应该更新该文件

---

## 其他优化建议

### 1. 结合 Rule 强化记录意识

在 `~/.claude/rules/token-optimization-plan.md` 中已有相关规则，确保 AI 遵守：

```markdown
## 持久日志
- 仅"当前项目相关"的推进性交互（任务/问题/决策）→ 追加到 `Yongan/docx/00-总索引.md` 的 Plan 日志区
- 全局工具链、个人账号操作、跨项目通用事项 → 不写入（应写入对应 Rule/Skill）
- 闲聊/简单查询 → 不记录
```

### 2. 定期审查机制

建议每周或每次大功能完成后，手动检查 `00-总索引.md` 是否完整记录了所有重要进展。

### 3. 使用 TodoWrite 工具

对于复杂任务，使用 TodoWrite 工具跟踪进度，完成后再汇总到 `00-总索引.md`。

---

## 预期效果

配置 hook 后：

1. **自动提醒**：每次用户提交请求，AI 都会看到项目记录提示
2. **上下文连续**：AI 会主动读取历史记录，了解项目进展
3. **记录完整**：AI 更容易判断是否需要记录新内容
4. **减少遗漏**：重要功能、决策、变更都会被记录

---

## 注意事项

1. **Token 消耗**：如果使用"自动读取内容"方案，每次请求都会增加 token 消耗
2. **文件路径**：确保 `Yongan/docx/00-总索引.md` 路径正确
3. **Python 环境**：确保系统 Python 可用（Windows 上通常已安装）
4. **Hook 权限**：首次使用时，Claude Code 可能会请求权限确认

---

## 总结

通过配置 `user-prompt-submit-hook`，可以有效解决 AI 记录遗漏的问题。推荐使用"提示方案"（方案基础版），在 token 消耗和效果之间取得平衡。

配置后，AI 会在每次会话中自动了解项目历史，显著提高记录的完整性和连续性。
