<template>
  <div class="ai-proofread">
    <!-- Toast 提示组件 -->
    <div class="toast-container">
      <div
        v-for="(toast, index) in toasts"
        :key="index"
        class="toast"
        :class="toast.type"
        :style="{
          opacity: toast.visible ? 1 : 0,
          transform: toast.visible ? 'translateY(0)' : 'translateY(-20px)'
        }"
      >
        <span class="toast-icon">{{ getToastIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </div>

    <div class="header">
      <h1>AI 勘误</h1>
      <p class="description">分析文档中的问题，通过审阅模式添加改进建议</p>
    </div>

    <div class="content">
      <div class="control-section">
        <!-- 文档信息展示 -->
        <div class="document-info" v-if="documentInfo">
          <div class="doc-stat">
            <span class="stat-label">文档长度</span>
            <span class="stat-value">{{ documentInfo.charCount }} 字符</span>
          </div>
          <div class="doc-stat">
            <span class="stat-label">段落数量</span>
            <span class="stat-value">{{ documentInfo.paragraphCount }} 段</span>
          </div>
          <div class="doc-stat" v-if="documentInfo.chunkCount > 1">
            <span class="stat-label">分块处理</span>
            <span class="stat-value">{{ documentInfo.chunkCount }} 块</span>
          </div>
        </div>

        <div class="options">
          <label class="option-item">
            <input type="checkbox" v-model="checkSpelling" />
            检查拼写错误
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="checkGrammar" />
            检查语法问题
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="checkFormat" />
            检查格式建议
          </label>
          <label class="option-item">
            <input type="checkbox" v-model="checkContent" />
            检查内容优化
          </label>
        </div>

        <!-- 进度条 -->
        <div class="progress-section" v-if="isLoading">
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: progress + '%' }"></div>
          </div>
          <span class="progress-text">{{ progressText }}</span>
        </div>

        <button class="analyze-btn" @click="startAnalysis" :disabled="isLoading">
          {{ isLoading ? '分析中...' : '开始分析' }}
        </button>
      </div>

      <div class="result-section" v-if="analysisResults.length > 0">
        <div class="result-header">
          <h3>分析结果 ({{ analysisResults.length }})</h3>
          <div class="result-actions">
            <button class="apply-all-btn" @click="applyAllComments" :disabled="isApplying">
              {{ isApplying ? '添加中...' : '全部添加批注' }}
            </button>
          </div>
        </div>

        <div class="result-list">
          <div
            v-for="(result, index) in analysisResults"
            :key="index"
            class="result-item"
            :class="{ applied: result.applied }"
          >
            <div class="result-type" :class="result.type">
              {{ getTypeLabel(result.type) }}
            </div>
            <div class="result-location"><strong>位置：</strong>第 {{ result.paragraph }} 段</div>
            <div class="result-original"><strong>原文：</strong>{{ result.originalText }}</div>
            <div class="result-suggestion"><strong>建议：</strong>{{ result.suggestion }}</div>
            <div class="result-actions">
              <button class="locate-btn" @click="locateText(result)">📍 定位</button>
              <button v-if="!result.applied" class="apply-btn" @click="applyComment(result)">
                ✓ 添加批注
              </button>
              <span v-else class="applied-label">✓ 已添加</span>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" v-if="!isLoading && analysisResults.length === 0 && hasAnalyzed">
        <div class="empty-icon">✨</div>
        <p>文档完美，没有发现需要改进的地方！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import axios from '../axios'

const isLoading = ref(false)
const isApplying = ref(false)
const hasAnalyzed = ref(false)
const checkSpelling = ref(true)
const checkGrammar = ref(true)
const checkFormat = ref(true)
const checkContent = ref(true)
const analysisResults = ref([])
const documentStructure = ref(null)
const documentInfo = ref(null)
const progress = ref(0)
const progressText = ref('')
const toasts = ref([])

const MAX_CHARS_PER_CHUNK = 1000

const showToast = (message, type = 'info') => {
  const id = Date.now()
  const toast = { id, message, type, visible: true }
  toasts.value.push(toast)

  setTimeout(() => {
    toast.visible = false
    setTimeout(() => {
      const index = toasts.value.findIndex((t) => t.id === id)
      if (index > -1) {
        toasts.value.splice(index, 1)
      }
    }, 300)
  }, 3000)
}

const getToastIcon = (type) => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  return icons[type] || 'ℹ'
}

const splitIntoChunks = (paragraphs) => {
  const chunks = []
  let currentChunk = { paragraphs: [], text: '' }

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const paragraphText = `[段落${para.index}]\n${para.text}\n\n`

    if (
      currentChunk.text.length + paragraphText.length > MAX_CHARS_PER_CHUNK &&
      currentChunk.paragraphs.length > 0
    ) {
      chunks.push({ ...currentChunk })

      const lastPara = currentChunk.paragraphs[currentChunk.paragraphs.length - 1]
      currentChunk = {
        paragraphs: [lastPara],
        text: `[段落${lastPara.index}]\n${lastPara.text}\n\n`
      }
    }

    currentChunk.paragraphs.push(para)
    currentChunk.text += paragraphText
  }

  if (currentChunk.paragraphs.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}

const getDocumentStructure = () => {
  try {
    const doc = window.Application.ActiveDocument
    if (!doc) {
      showToast('请先打开一个 WPS 文档', 'warning')
      return null
    }

    const fullText = doc.Content.Text
    if (!fullText || fullText.trim() === '') {
      showToast('文档内容为空', 'warning')
      return null
    }

    // 使用 WPS 官方的 Paragraphs 对象获取段落
    const wpsParagraphs = doc.Paragraphs
    const paragraphs = []

    for (let i = 1; i <= wpsParagraphs.Count; i++) {
      const para = wpsParagraphs.Item(i)
      const text = para.Range.Text

      // 只保留有内容的段落（排除纯换行或空段落）
      if (text && text.trim() !== '') {
        paragraphs.push({
          index: i,
          text: text,
          originalText: text.trim()
        })
      }
    }

    console.log('WPS段落总数:', wpsParagraphs.Count, '有效段落数:', paragraphs.length)

    return {
      paragraphs: paragraphs,
      fullText: fullText,
      charCount: fullText.length,
      paragraphCount: paragraphs.length
    }
  } catch (error) {
    console.error('获取文档结构失败:', error)
    showToast('获取文档失败: ' + (error.message || '未知错误'), 'error')
    return null
  }
}

const startAnalysis = async () => {
  if (!window.Application?.ActiveDocument) {
    showToast('请先打开一个 WPS 文档', 'warning')
    return
  }

  isLoading.value = true
  hasAnalyzed.value = false
  analysisResults.value = []
  progress.value = 0
  progressText.value = '准备中...'

  try {
    documentStructure.value = getDocumentStructure()

    if (!documentStructure.value) {
      isLoading.value = false
      return
    }

    const chunks = splitIntoChunks(documentStructure.value.paragraphs)
    documentInfo.value = {
      charCount: documentStructure.value.charCount,
      paragraphCount: documentStructure.value.paragraphCount,
      chunkCount: chunks.length
    }

    console.log(
      `文档长度: ${documentStructure.value.charCount} 字符, 段落数: ${documentStructure.value.paragraphCount}, 分块数: ${chunks.length}`
    )

    const checks = []
    if (checkSpelling.value) checks.push('拼写错误')
    if (checkGrammar.value) checks.push('语法问题')
    if (checkFormat.value) checks.push('格式问题')
    if (checkContent.value) checks.push('内容优化建议')

    const baseSystemPrompt = `你是一个专业的文档勘误和校对助手。请仔细分析下面的文档内容，找出其中的${checks.join('、')}。

文档以段落形式提供，每个段落前标有"[段落X]"，X为段落编号（从1开始）。

请以严格的JSON数组格式返回分析结果，每个结果对象必须包含以下字段：
- type: 问题类型，只能是以下值之一：spelling（拼写错误）、grammar（语法问题）、format（格式问题）、content（内容优化）
- paragraph: 段落编号（整数，从1开始）
- originalText: 问题所在的原文片段（要精确匹配文档中的内容）
- suggestion: 具体的改进建议
- startIndex: 问题文本在所在段落中的起始位置（从0开始的字符索引）
- endIndex: 问题文本在所在段落中的结束位置（从0开始的字符索引）
- context: 包含问题的上下文（前后各20-30个字符）

请务必确保：
1. 只返回JSON数组，不要包含其他文字说明
2. 即使只发现一个问题，也必须用数组包裹
3. 段落编号要与文档中的"[段落X]"标记一致
4. originalText要精确匹配文档中的内容
5. 如果没有发现任何问题，请返回空数组[]
6. suggestion字段中的引号需要正确转义

输出格式示例（必须是数组）：
[
  {
    "type": "spelling",
    "paragraph": 1,
    "originalText": "错别子",
    "suggestion": "应改为"错别字"",
    "startIndex": 5,
    "endIndex": 8,
    "context": "这是一个错别子示例"
  }
]`

    // 每个批次创建一个会话，而不是每个块一个会话
    const currentTime = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const response = await axios.post('/documents/chat/sessions/', {
      title: `AI勘误会话 - ${currentTime}`
    })
    const sessionId = response.data.id

    console.log(`批次会话 ${sessionId} 创建成功，准备处理 ${chunks.length} 个块`)

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      progress.value = Math.round((i / chunks.length) * 80)
      progressText.value = `正在分析第 ${i + 1}/${chunks.length} 块...`

      console.log(
        `处理第 ${i + 1}/${chunks.length} 块，段落范围: ${chunk.paragraphs[0].index} - ${chunk.paragraphs[chunk.paragraphs.length - 1].index}`
      )

      const fullPrompt = `${baseSystemPrompt}\n\n文档内容：\n${chunk.text}`

      console.log('========== 完整的请求内容（不截断）==========')
      console.log(fullPrompt)
      console.log('========== 完整请求内容结束 ==========')

      const chatResponse = await axios.post(`/documents/chat/sessions/${sessionId}/send/`, {
        content: fullPrompt
      })

      console.log('========== 完整的API响应（不截断）==========')
      console.log(JSON.stringify(chatResponse.data, null, 2))
      console.log('========== 完整API响应结束 ==========')

      const aiContent = chatResponse.data.assistant_message.content
      const chunkResults = parseAIResponse(aiContent)
      analysisResults.value = [...analysisResults.value, ...chunkResults]
    }

    progress.value = 100
    progressText.value = '分析完成！'

    showToast(
      `分析完成！发现 ${analysisResults.value.length} 个问题`,
      analysisResults.value.length > 0 ? 'info' : 'success'
    )
  } catch (error) {
    console.error('分析失败:', error)
    showToast('分析失败: ' + (error.message || '请重试'), 'error')
    analysisResults.value = []
  } finally {
    isLoading.value = false
    hasAnalyzed.value = true
  }
}

const parseAIResponse = (content) => {
  try {
    let jsonStr = content

    // 先尝试找数组
    const firstBracket = content.indexOf('[')
    const lastBracket = content.lastIndexOf(']')

    // 如果没有数组，尝试找单个对象
    if (firstBracket === -1 || lastBracket === -1) {
      const firstBrace = content.indexOf('{')
      const lastBrace = content.lastIndexOf('}')

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = content.substring(firstBrace, lastBrace + 1)
        const singleResult = JSON.parse(jsonStr)
        // 单个对象包装成数组
        return [{ ...singleResult, applied: false }]
      }
    } else {
      jsonStr = content.substring(firstBracket, lastBracket + 1)
      const results = JSON.parse(jsonStr)
      if (Array.isArray(results)) {
        return results.map((r) => ({ ...r, applied: false }))
      }
    }

    return []
  } catch (error) {
    console.error('解析响应失败:', error)
    console.error('响应内容:', content)
    return []
  }
}

const locateText = (result) => {
  try {
    if (!window.Application?.ActiveDocument) {
      showToast('请先打开一个 WPS 文档', 'warning')
      return
    }

    const doc = window.Application.ActiveDocument
    const range = doc.Range()
    range.Find.ClearFormatting()
    range.Find.Text = result.originalText || result.context
    range.Find.Forward = true
    range.Find.Wrap = 1

    if (range.Find.Execute()) {
      range.Select()
      showToast('已定位到问题位置', 'success')
    } else {
      showToast('未找到指定文本', 'warning')
    }
  } catch (error) {
    console.error('定位失败:', error)
    showToast('定位失败', 'error')
  }
}

const applyComment = async (result) => {
  try {
    if (!window.Application?.ActiveDocument) {
      showToast('请先打开一个 WPS 文档', 'warning')
      return
    }

    const doc = window.Application.ActiveDocument
    const targetRange = doc.Range()
    targetRange.Find.ClearFormatting()
    targetRange.Find.Text = result.originalText || result.context
    targetRange.Find.Forward = true
    targetRange.Find.Wrap = 1

    if (targetRange.Find.Execute()) {
      let commentAdded = false

      // 先选择文本（与定位功能一致）
      targetRange.Select()

      // 尝试使用选择范围添加批注
      try {
        const selection = window.Application.Selection
        const comment = doc.Comments.Add(selection.Range)
        comment.Range.Text = `【${getTypeLabel(result.type)}】${result.suggestion}`
        commentAdded = true
      } catch (e) {
        console.log('使用选择范围添加批注失败，尝试直接使用找到的范围:', e)

        // 如果选择范围方法失败，尝试直接使用找到的范围
        try {
          const comment = doc.Comments.Add(targetRange)
          comment.Range.Text = `【${getTypeLabel(result.type)}】${result.suggestion}`
          commentAdded = true
        } catch (e2) {
          console.log('直接使用范围也失败:', e2)
        }
      }

      if (commentAdded) {
        result.applied = true
        showToast('批注添加成功！', 'success')
      } else {
        // 所有方法都失败，使用备用方案：在文档末尾添加批注
        const endRange = doc.Range(doc.Content.End - 1, doc.Content.End - 1)
        const comment = doc.Comments.Add(endRange)
        comment.Range.Text = `【${getTypeLabel(result.type)}】${result.suggestion}\n原文: ${result.originalText}\n段落: 第${result.paragraph}段\n注: 原位置可能在表格中，无法直接添加批注`
        result.applied = true
        showToast('无法在原位置添加批注，已在文档末尾添加', 'warning')
      }
    } else {
      const endRange = doc.Range(doc.Content.End - 1, doc.Content.End - 1)
      const comment = doc.Comments.Add(endRange)
      comment.Range.Text = `【${getTypeLabel(result.type)}】${result.suggestion}\n原文: ${result.originalText}\n段落: 第${result.paragraph}段`
      result.applied = true
      showToast('未找到原文位置，已在文档末尾添加批注', 'warning')
    }
  } catch (error) {
    console.error('添加批注失败:', error)
    showToast('添加批注失败: ' + (error.message || '请检查WPS是否支持批注功能'), 'error')
  }
}

const applyAllComments = async () => {
  if (!window.Application?.ActiveDocument) {
    showToast('请先打开一个 WPS 文档', 'warning')
    return
  }

  isApplying.value = true
  let successCount = 0
  let failCount = 0

  for (const result of analysisResults.value) {
    if (!result.applied) {
      try {
        await applyComment(result)
        successCount++
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (e) {
        failCount++
      }
    }
  }

  isApplying.value = false
  showToast(
    `批量添加完成！成功: ${successCount}, 失败: ${failCount}`,
    failCount === 0 ? 'success' : 'warning'
  )
}

const getTypeLabel = (type) => {
  const labels = {
    spelling: '拼写错误',
    grammar: '语法问题',
    format: '格式建议',
    content: '内容优化'
  }
  return labels[type] || type
}
</script>

<style scoped>
.ai-proofread {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f9fafb;
  overflow: hidden;
}

.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 280px;
  transition: all 0.3s ease;
}

.toast.success {
  border-left: 4px solid #4caf50;
}

.toast.error {
  border-left: 4px solid #f44336;
}

.toast.warning {
  border-left: 4px solid #ff9800;
}

.toast.info {
  border-left: 4px solid #2196f3;
}

.toast-icon {
  font-size: 18px;
  font-weight: bold;
}

.toast.success .toast-icon {
  color: #4caf50;
}
.toast.error .toast-icon {
  color: #f44336;
}
.toast.warning .toast-icon {
  color: #ff9800;
}
.toast.info .toast-icon {
  color: #2196f3;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.header {
  padding: 20px 24px;
  background: white;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.header h1 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.description {
  margin: 0;
  font-size: 14px;
  color: #666;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.control-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.document-info {
  display: flex;
  gap: 20px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.doc-stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #888;
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #555;
  cursor: pointer;
  user-select: none;
}

.option-item input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-bar-container {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
}

.analyze-btn {
  width: 100%;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.analyze-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  opacity: 0.9;
}

.analyze-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.result-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.apply-all-btn {
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.apply-all-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.apply-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.result-item {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  border-left: 4px solid #667eea;
  transition: all 0.2s;
}

.result-item.applied {
  opacity: 0.6;
  background: #f0f4f0;
  border-left-color: #4caf50;
}

.result-type {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px;
}

.result-type.spelling {
  background: #ffebee;
  color: #c62828;
}

.result-type.grammar {
  background: #fff3e0;
  color: #e65100;
}

.result-type.format {
  background: #e3f2fd;
  color: #1565c0;
}

.result-type.content {
  background: #e8f5e9;
  color: #2e7d32;
}

.result-location,
.result-original,
.result-suggestion {
  margin: 6px 0;
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

.result-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.locate-btn,
.apply-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.locate-btn {
  background: #e3f2fd;
  color: #1565c0;
}

.apply-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.locate-btn:hover,
.apply-btn:hover {
  opacity: 0.8;
}

.applied-label {
  font-size: 13px;
  color: #4caf50;
  font-weight: 500;
  padding: 6px 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #888;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
}
</style>
