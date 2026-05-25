<template>
  <div class="ai-chat-panel">
    <div class="chat-body">
      <div class="session-list" v-if="showSessionList && chatMode === 'builtin'">
        <div class="session-header">
          <h3>会话列表</h3>
          <button class="new-session-btn" @click="createNewSession">+ 新会话</button>
        </div>
        <div class="session-items">
          <div
            v-for="session in sessions"
            :key="session.id"
            class="session-item"
            :class="{ active: currentSession?.id === session.id }"
            @click="loadSession(session)"
          >
            <div class="session-title">{{ session.title }}</div>
            <div class="session-meta">
              <span class="session-kb">{{ session.knowledge_base_name || '通用对话' }}</span>
              <span class="session-time">{{ formatTime(session.updated_at) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="chat-messages" v-else ref="messagesRef">
        <div class="message-list">
          <div v-if="messages.length === 0" class="empty-chat">
            <div class="empty-icon">💬</div>
            <p>开始对话吧</p>
          </div>

          <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
            <div class="message-avatar">
              <span v-if="msg.role === 'user'">🧑</span>
              <span v-else>🤖</span>
            </div>
            <div class="message-content">
              <div v-if="msg.role === 'assistant' && msg.thinking" class="thinking-container">
                <div class="thinking-toggle" @click="toggleThinking(msg.id)">
                  <span class="thinking-icon">💭</span>
                  <span class="thinking-label">思考过程</span>
                  <span class="thinking-arrow">{{ thinkingExpanded[msg.id] ? '▼' : '▶' }}</span>
                </div>
                <div v-if="thinkingExpanded[msg.id]" class="thinking-content">
                  <div class="thinking-text" v-html="formatMarkdown(msg.thinking)"></div>
                </div>
              </div>
              <div
                class="message-text"
                v-html="formatMarkdown(getMessageDisplayContent(msg))"
              ></div>

              <!-- 如果是用户消息且包含文档内容，显示一个提示标签 -->
              <div
                v-if="msg.role === 'user' && msg.hasDocumentContent"
                class="document-content-tag"
              >
                <span v-if="msg.isDocumentSelection" class="selection-tag"> 📝 包含选中内容 </span>
                <span v-else class="full-doc-tag"> 📄 包含文档全文 </span>
              </div>

              <div v-if="msg.role === 'assistant' && msg.retrieved_documents" class="sources">
                <div class="sources-title">参考文档：</div>
                <div v-for="(doc, idx) in msg.retrieved_documents" :key="idx" class="source-item">
                  <span class="source-title">{{ doc.title }}</span>
                  <span class="source-score">相关性: {{ (doc.score * 100).toFixed(0) }}%</span>
                </div>
              </div>

              <!-- 文档操作列表 -->
              <DocumentOperationList
                v-if="msg.role === 'assistant' && messageOperations.has(msg.id)"
                :operations="messageOperations.get(msg.id)"
                @execute="(ops) => handleExecuteOperations(msg.id, ops)"
                @locate="handleLocateOperation"
              />

              <div v-if="msg.role === 'assistant'" class="insert-btn-container">
                <button class="insert-btn" @click="insertToDocument(msg.content)">
                  插入光标位置
                </button>
              </div>
            </div>
          </div>

          <div v-if="isLoading" class="message assistant">
            <div class="message-avatar">🤖</div>
            <div class="message-content">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-footer" v-if="!(showSessionList && chatMode === 'builtin')">
      <!-- 文档内容选择提示 -->
      <div class="document-content-info" v-if="hasActiveDocument">
        <div class="document-content-controls">
          <label class="attach-toggle">
            <input type="checkbox" v-model="attachDocumentContent" />
            <span>附加文档内容</span>
          </label>
          <span class="content-indicator">
            <span v-if="hasDocumentSelection" class="selection-indicator"> 📝 使用选中内容 </span>
            <span v-else class="full-doc-indicator"> 📄 使用文档全文 </span>
          </span>
        </div>
      </div>

      <div class="top-selectors">
        <div class="mode-selector">
          <label>
            <input type="radio" v-model="chatMode" value="builtin" />
            内置
          </label>
          <label>
            <input type="radio" v-model="chatMode" value="openclaw" />
            OpenClaw
          </label>
        </div>

        <div class="kb-selector" v-if="chatMode === 'builtin'">
          <div class="custom-select-wrapper" :class="{ open: kbDropdownOpen }">
            <div class="custom-select-trigger" @click="kbDropdownOpen = !kbDropdownOpen">
              <span v-if="selectedKBId" class="selected-kb-display">
                {{ getKBName(selectedKBId) }}
              </span>
              <span v-else class="placeholder">通用对话</span>
              <span class="select-arrow"></span>
            </div>
            <transition name="dropdown">
              <div v-if="kbDropdownOpen" class="custom-select-dropdown">
                <div
                  class="dropdown-item"
                  :class="{ active: selectedKBId === '' }"
                  @click="selectKB('')"
                >
                  通用对话
                </div>
                <div
                  v-for="kb in knowledgeBases"
                  :key="kb.id"
                  class="dropdown-item"
                  :class="{ active: selectedKBId === kb.id }"
                  @click="selectKB(kb.id)"
                >
                  {{ kb.name }}
                </div>
              </div>
            </transition>
          </div>
        </div>

        <div class="kb-selector" v-if="chatMode === 'openclaw'">
          <div class="custom-select-wrapper" :class="{ open: kbDropdownOpen }">
            <div class="custom-select-trigger" @click="kbDropdownOpen = !kbDropdownOpen">
              <span v-if="selectedKBId" class="selected-kb-display">
                {{ getKBName(selectedKBId) }}
              </span>
              <span v-else class="placeholder">知识库（可选）</span>
              <span class="select-arrow"></span>
            </div>
            <transition name="dropdown">
              <div v-if="kbDropdownOpen" class="custom-select-dropdown">
                <div
                  class="dropdown-item"
                  :class="{ active: selectedKBId === '' }"
                  @click="selectKB('')"
                >
                  知识库（可选）
                </div>
                <div
                  v-for="kb in knowledgeBases"
                  :key="kb.id"
                  class="dropdown-item"
                  :class="{ active: selectedKBId === kb.id }"
                  @click="selectKB(kb.id)"
                >
                  {{ kb.name }}
                </div>
              </div>
            </transition>
          </div>
        </div>

        <div class="agent-selector" v-if="chatMode === 'openclaw'">
          <div class="custom-select-wrapper" :class="{ open: agentDropdownOpen }">
            <div class="custom-select-trigger" @click="agentDropdownOpen = !agentDropdownOpen">
              <span v-if="selectedAgent" class="selected-agent-display">
                {{ selectedAgent.emoji }} {{ selectedAgent.display_name }}
              </span>
              <span v-else class="placeholder">选择 Agent</span>
              <span class="select-arrow"></span>
            </div>
            <transition name="dropdown">
              <div v-if="agentDropdownOpen" class="custom-select-dropdown">
                <div
                  v-for="agent in agents"
                  :key="agent.id"
                  class="dropdown-item"
                  :class="{ active: selectedAgentId === agent.id }"
                  @click="selectAgent(agent)"
                >
                  <span class="item-emoji">{{ agent.emoji }}</span>
                  <div class="item-info">
                    <span class="item-name">{{ agent.display_name }}</span>
                    <span class="item-theme" v-if="agent.theme">{{ agent.theme }}</span>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </div>
      </div>

      <div class="attachment-list" v-if="openclawAttachments.length > 0">
        <div
          class="attachment-item"
          v-for="(file, index) in openclawAttachments"
          :key="file.name + file.size"
        >
          <span>{{ file.name }} ({{ formatFileSize(file.size) }})</span>
          <button type="button" @click="removeAttachment(index)">×</button>
        </div>
      </div>

      <div class="input-area">
        <div class="attachment-uploader" v-if="chatMode === 'openclaw'">
          <label class="attachment-label">
            <input type="file" multiple ref="attachmentInputRef" @change="handleAttachmentChange" />
            📎
          </label>
        </div>
        <textarea
          v-model="inputMessage"
          placeholder="输入问题或上传附件..."
          @keydown.enter.prevent="sendMessage"
          rows="1"
          ref="textareaRef"
        ></textarea>
        <button class="clear-session-btn" @click="clearSession" title="清除当前会话">🗑️</button>
        <button class="send-btn" @click="sendMessage" :disabled="isLoading || !canSend">
          发送
        </button>
      </div>
    </div>

    <div class="chat-footer" v-else>
      <button class="back-btn" @click="showSessionList = false">返回对话</button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onMounted, onUnmounted } from 'vue'
import axios from '../axios'
import { marked } from 'marked'
import DocumentOperationList from './DocumentOperationList.vue'
import { DocumentOperationParser } from '../utils/documentOperationParser'
import { DocumentOperationExecutor } from '../utils/documentOperationExecutor'
import { DocumentContentHelper } from '../utils/documentContentHelper'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  username: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const messagesRef = ref(null)
const textareaRef = ref(null)
const attachmentInputRef = ref(null)
const openclawAttachments = ref([])
const showSessionList = ref(false)
const sessions = ref([])
const currentSession = ref(null)
const messages = ref([])
const messageOperations = ref(new Map()) // 存储每个消息的操作
const inputMessage = ref('')
const hasDocumentSelection = ref(false) // 是否有选中的文档内容
const selectedDocumentContent = ref(null) // 选中的文档内容
const selectionCheckInterval = ref(null) // 检查选择状态的定时器
const isLoading = ref(false)
const hasActiveDocument = ref(false) // 是否有活动的WPS文档
const attachDocumentContent = ref(true) // 是否附加文档内容到问题
const knowledgeBases = ref([])
const selectedKBId = ref(null)
const chatMode = ref('builtin')
const agents = ref([])
const selectedAgentId = ref(null)
const agentDropdownOpen = ref(false)
const kbDropdownOpen = ref(false)
const thinkingExpanded = ref({})

const selectedAgent = computed(() => {
  return agents.value.find((a) => a.id === selectedAgentId.value) || null
})

const selectAgent = (agent) => {
  selectedAgentId.value = agent.id
  agentDropdownOpen.value = false
}

const toggleThinking = (msgId) => {
  thinkingExpanded.value[msgId] = !thinkingExpanded.value[msgId]
}

const canSend = computed(() => {
  if (chatMode.value === 'builtin') {
    // 支持无知识库（通用对话）和有知识库两种情况
    return true
  } else {
    return (
      selectedAgentId.value !== null &&
      selectedAgentId.value !== '' &&
      (inputMessage.value.trim() !== '' || openclawAttachments.value.length > 0)
    )
  }
})

const loadKnowledgeBases = async () => {
  try {
    console.log('Loading knowledge bases...')
    const token = localStorage.getItem('accessToken')
    console.log('Token for request:', token ? 'exists' : 'missing')

    const response = await axios.get('/documents/knowledge-bases/')
    console.log('Knowledge bases response status:', response.status)
    console.log('Knowledge bases response data:', JSON.stringify(response.data))

    knowledgeBases.value = response.data
    console.log('Set knowledgeBases, length:', knowledgeBases.value.length)

    // 默认选择不使用知识库
    selectedKBId.value = ''
    console.log('默认选择通用对话')
  } catch (error) {
    console.error('Failed to load knowledge bases:', error)
    console.error('Error response:', error.response)
    if (error.response?.status === 401) {
      console.log('Unauthorized, need to login again')
    }
  }
}

const loadAgents = async () => {
  console.log('[loadAgents] 开始加载 agents...')
  try {
    const response = await axios.get('/openclaw/agents/')
    console.log('[loadAgents] 响应数据:', response.data)
    if (response.data.success) {
      agents.value = response.data.data || []
      console.log('[loadAgents] 加载到 agents:', agents.value)
      if (agents.value.length > 0) {
        selectedAgentId.value = agents.value[0].id
        console.log('[loadAgents] 设置 selectedAgentId 为:', selectedAgentId.value)
      }
    }
  } catch (error) {
    console.error('[loadAgents] 加载失败:', error)
  }
}

const loadSessions = async () => {
  try {
    // 加载所有用户会话，不限制知识库
    const response = await axios.get('/documents/chat/sessions/')
    sessions.value = response.data
  } catch (error) {
    console.error('Failed to load sessions:', error)
  }
}

const createNewSession = async () => {
  try {
    const sessionData = {
      title: '新对话'
    }
    // 如果有选择知识库，则添加到请求数据中
    if (selectedKBId.value) {
      sessionData.knowledge_base_id = selectedKBId.value
    }

    const response = await axios.post('/documents/chat/sessions/', sessionData)
    currentSession.value = response.data
    messages.value = []
    showSessionList.value = false
  } catch (error) {
    console.error('Failed to create session:', error)
  }
}

const loadSession = async (session) => {
  currentSession.value = session
  showSessionList.value = false
  try {
    const response = await axios.get(`/documents/chat/sessions/${session.id}/`)
    messages.value = response.data.messages
    // 解析历史消息中的操作
    response.data.messages.forEach((msg) => parseMessageOperations(msg))
  } catch (error) {
    console.error('Failed to load session:', error)
  }
}

const getKBName = (id) => {
  if (!id || id === '') {
    return '通用对话'
  }
  const kb = knowledgeBases.value.find((k) => k.id === id)
  return kb ? kb.name : ''
}

const selectKB = async (id) => {
  selectedKBId.value = id
  kbDropdownOpen.value = false
  if (chatMode.value === 'builtin') {
    await onKBChange()
  }
}

const testClick = () => {
  console.log('Selector clicked!')
  alert('Selector clicked!')
}

const onKBChange = async () => {
  await loadSessions()
  if (sessions.value.length > 0) {
    await loadSession(sessions.value[0])
  } else {
    currentSession.value = null
    messages.value = []
  }
}

const sendMessage = async () => {
  const hasAttachments = chatMode.value === 'openclaw' && openclawAttachments.value.length > 0
  if ((!inputMessage.value.trim() && !hasAttachments) || isLoading.value || !canSend.value) {
    return
  }

  isLoading.value = true
  let userContent = inputMessage.value.trim()
  if (!userContent && hasAttachments) {
    userContent = '请分析附件内容'
  }
  inputMessage.value = ''

  // 获取文档内容
  let documentContent = null
  if (attachDocumentContent.value) {
    documentContent = DocumentContentHelper.getDocumentContentForAI()
  }

  // 构建完整的用户消息内容
  let fullUserContent = userContent
  if (documentContent && attachDocumentContent.value) {
    const contentLabel = hasDocumentSelection.value ? '【选中内容】' : '【文档全文】'
    fullUserContent = `${userContent}\n\n${contentLabel}:\n${documentContent}`
  }

  const tempUserMsg = {
    id: Date.now(),
    role: 'user',
    content: fullUserContent,
    originalUserContent: userContent, // 保存原始用户输入
    hasDocumentContent: !!documentContent, // 标记是否包含文档内容
    isDocumentSelection: hasDocumentSelection.value, // 标记是否是选中的内容
    created_at: new Date().toISOString()
  }

  try {
    console.log('[sendMessage] 准备发送消息, chatMode:', chatMode.value)
    if (chatMode.value === 'builtin') {
      console.log('[sendMessage] 进入 builtin 模式')
      await sendBuiltinMessage(fullUserContent, tempUserMsg)
    } else {
      console.log('[sendMessage] 进入 openclaw 模式')
      await sendOpenClawMessage(fullUserContent, tempUserMsg)
    }

    await scrollToBottom()
  } catch (error) {
    console.error('Failed to send message:', error)
    messages.value = messages.value.filter((m) => m.id !== tempUserMsg.id)
    alert('发送消息失败，请重试')
  } finally {
    isLoading.value = false
  }
}

const sendBuiltinMessage = async (userContent, tempUserMsg) => {
  if (!currentSession.value) {
    await createNewSession()
    if (!currentSession.value) {
      return
    }
  }

  const tempAssistantMsg = {
    id: 'temp_' + Date.now(),
    role: 'assistant',
    content: '',
    thinking: '',
    created_at: new Date().toISOString()
  }

  // 添加用户消息和临时助手消息
  messages.value.push(tempUserMsg)
  messages.value.push(tempAssistantMsg)

  try {
    // 准备请求数据
    const requestData = { content: userContent }
    console.log('========== 发送消息完整请求（不截断）==========')
    console.log(requestData)
    console.log('========== 完整请求结束 ==========')

    if (selectedKBId.value) {
      requestData.knowledge_base_id = selectedKBId.value
    }
    console.log('sendBuiltinMessage - requestData:', requestData)

    const response = await fetch(`/api/documents/chat/sessions/${currentSession.value.id}/send/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify(requestData)
    })

    if (!response.ok) {
      throw new Error('请求失败')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''
    let fullThinking = ''

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)
              if (data.type === 'content') {
                fullContent += data.content || ''
                fullThinking += data.thinking || ''
                tempAssistantMsg.content = fullContent
                tempAssistantMsg.thinking = fullThinking
                messages.value = [...messages.value]
                await scrollToBottom()
              } else if (data.type === 'done') {
                messages.value = messages.value.filter(
                  (m) => m.id !== tempUserMsg.id && m.id !== tempAssistantMsg.id
                )
                messages.value.push(data.user_message)
                const assistantMsg = data.assistant_message
                messages.value.push(assistantMsg)

                // 解析消息中的操作
                parseMessageOperations(assistantMsg)

                await loadSessions()
              }
            } catch (e) {
              console.error('JSON 解析错误:', e)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to send message:', error)
    messages.value = messages.value.filter(
      (m) => m.id !== tempUserMsg.id && m.id !== tempAssistantMsg.id
    )
    alert('发送消息失败，请重试')
  }
}

const sendOpenClawMessage = async (userContent, tempUserMsg) => {
  console.log('[sendOpenClawMessage] 开始执行, 参数:')
  console.log('[sendOpenClawMessage] userContent:', userContent)
  console.log('[sendOpenClawMessage] tempUserMsg:', tempUserMsg)
  console.log('[sendOpenClawMessage] selectedAgentId:', selectedAgentId.value)
  console.log('[sendOpenClawMessage] selectedKBId:', selectedKBId.value)
  console.log('[sendOpenClawMessage] chatMode:', chatMode.value)

  // 清除用户消息占位
  messages.value = messages.value.filter((m) => m.id !== tempUserMsg.id)

  // 添加用户消息
  const userMsg = {
    id: Date.now() - 1,
    role: 'user',
    content: userContent,
    originalUserContent: tempUserMsg.originalUserContent,
    hasDocumentContent: tempUserMsg.hasDocumentContent,
    isDocumentSelection: tempUserMsg.isDocumentSelection,
    created_at: new Date().toISOString()
  }
  messages.value.push(userMsg)

  // 创建助手消息占位（用于流式更新）
  const tempAssistantMsgId = Date.now()
  const tempAssistantMsg = {
    id: tempAssistantMsgId,
    role: 'assistant',
    content: '',
    created_at: new Date().toISOString()
  }
  messages.value.push(tempAssistantMsg)

  // 清除附件
  openclawAttachments.value = []
  if (attachmentInputRef.value) {
    attachmentInputRef.value.value = ''
  }

  try {
    console.log('[sendOpenClawMessage] 准备发送请求...')

    // 安全检查
    if (!selectedAgentId.value) {
      console.error('[sendOpenClawMessage] 错误: selectedAgentId 为 null 或 undefined')
      throw new Error('请先选择一个 Agent')
    }

    // 准备请求数据
    const requestData = {
      agent_id: String(selectedAgentId.value),
      query: userContent
    }

    if (selectedKBId.value && selectedKBId.value !== '') {
      requestData.knowledge_base_id = String(selectedKBId.value)
    }

    console.log('[OpenClaw Stream] 发送请求到 /api/openclaw/chat/stream/')
    console.log('[OpenClaw Stream] 请求数据:', requestData)

    // 使用 fetch 发送流式请求
    const response = await fetch('/api/openclaw/chat/stream/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
      },
      body: JSON.stringify(requestData)
    })

    console.log('[OpenClaw Stream] 响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[OpenClaw Stream] 请求失败:', response.status, errorText)
      throw new Error(`请求失败: ${response.status}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    let fullContent = ''

    console.log('[OpenClaw Stream] 开始读取流')

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        console.log('[OpenClaw Stream] 收到数据块:', chunk.substring(0, 200))

        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)
              console.log('[OpenClaw Stream] 解析数据:', data)

              if (data.error) {
                console.error('[OpenClaw Stream] 错误:', data.error)
                tempAssistantMsg.content = '错误: ' + data.error
                messages.value = [...messages.value]
                break
              }
              if (data.content) {
                fullContent += data.content
                tempAssistantMsg.content = fullContent
                messages.value = [...messages.value]
                await scrollToBottom()
              }
              if (data.done) {
                console.log('[OpenClaw Stream] 流式响应完成')
                // 解析完成后的消息中的操作
                parseMessageOperations(tempAssistantMsg)
              }
            } catch (e) {
              console.error('[OpenClaw Stream] JSON 解析错误:', e, '原始数据:', dataStr)
            }
          }
        }
      }
    }

    console.log('[OpenClaw Stream] 响应接收完毕，最终内容长度:', fullContent.length)
  } catch (error) {
    console.error('[OpenClaw Stream] 发送消息失败:', error)
    tempAssistantMsg.content = '发送消息失败，请重试'
    messages.value = [...messages.value]
  }
}

const handleAttachmentChange = (event) => {
  const files = event.target.files ? Array.from(event.target.files) : []
  openclawAttachments.value = files
}

const removeAttachment = (index) => {
  openclawAttachments.value.splice(index, 1)
}

const clearSession = () => {
  if (!confirm('确定要清除当前会话吗？这将清空所有对话记录。')) {
    return
  }

  // 清除消息
  messages.value = []
  currentSession.value = null
  messageOperations.value.clear()

  // 清除OpenClaw模式的附件
  openclawAttachments.value = []
  if (attachmentInputRef.value) {
    attachmentInputRef.value.value = ''
  }

  // 重新加载会话列表
  loadSessions()
}

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  return `${gb.toFixed(1)} GB`
}

const formatMarkdown = (content) => {
  if (!content) return ''
  return marked.parse(content, { breaks: true, gfm: true })
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight
  }
}

// 解析消息中的操作
const parseMessageOperations = (message) => {
  if (message.role === 'assistant' && message.content) {
    const operations = DocumentOperationParser.extractOperations(message.content)
    if (operations.length > 0) {
      messageOperations.value.set(message.id, operations)
    }
  }
}

// 获取消息的纯文本（移除操作代码块）
const getMessageDisplayContent = (message) => {
  if (message.role === 'user' && message.originalUserContent) {
    // 如果是用户消息且有原始内容，则显示原始内容
    return message.originalUserContent
  }
  if (message.role === 'assistant' && message.content) {
    return DocumentOperationParser.stripOperations(message.content)
  }
  return message.content
}

// 执行操作
const handleExecuteOperations = async (messageId, operations) => {
  if (!window.Application?.ActiveDocument) {
    alert('请先打开一个 WPS 文档')
    return
  }

  const result = await DocumentOperationExecutor.executeOperations(operations)
  alert(`操作完成：成功 ${result.success} 个，失败 ${result.failed} 个`)
}

// 定位操作
const handleLocateOperation = async (operation) => {
  if (!window.Application?.ActiveDocument) {
    alert('请先打开一个 WPS 文档')
    return
  }

  await DocumentOperationExecutor.locatePosition(operation.position)
}

const checkAuth = () => {
  const token = localStorage.getItem('accessToken')
  if (!token) {
    window.location.hash = '#/login'
    return false
  }
  return true
}

// 检查文档选择状态
const checkDocumentSelection = () => {
  try {
    // 检查是否有活动文档
    hasActiveDocument.value = !!window.Application?.ActiveDocument

    if (hasActiveDocument.value) {
      const selectionInfo = DocumentContentHelper.getSelectionInfo()
      hasDocumentSelection.value = selectionInfo.hasSelection
      selectedDocumentContent.value = selectionInfo.selectedText
    } else {
      hasDocumentSelection.value = false
      selectedDocumentContent.value = null
    }
  } catch (error) {
    console.error('检查选择状态失败:', error)
    hasActiveDocument.value = false
    hasDocumentSelection.value = false
  }
}

onMounted(async () => {
  console.log('AIChat mounted, loading data...')
  await loadKnowledgeBases()
  console.log('After loadKnowledgeBases, knowledgeBases length:', knowledgeBases.value.length)
  await loadSessions()
  if (chatMode.value === 'openclaw') {
    await loadAgents()
  }
  console.log('All data loaded in mounted')
  console.log('chatMode:', chatMode.value)
  console.log('selectedKBId:', selectedKBId.value)

  // 启动选择状态检查定时器
  checkDocumentSelection() // 立即检查一次
  selectionCheckInterval.value = setInterval(checkDocumentSelection, 500) // 每500ms检查一次
})

onUnmounted(() => {
  // 清除定时器
  if (selectionCheckInterval.value) {
    clearInterval(selectionCheckInterval.value)
    selectionCheckInterval.value = null
  }
})

watch(chatMode, async (newMode) => {
  console.log('chatMode changed to:', newMode)
  if (newMode === 'openclaw') {
    await loadAgents()
  }
})

watch(
  knowledgeBases,
  (newVal) => {
    console.log('knowledgeBases changed:', newVal.length, 'items')
  },
  { deep: true }
)

watch(selectedKBId, (newVal) => {
  console.log('selectedKBId changed to:', newVal)
})

const insertToDocument = async (markdownContent) => {
  try {
    if (!window.Application || !window.Application.ActiveDocument) {
      alert('请先打开一个WPS文档')
      return
    }

    const doc = window.Application.ActiveDocument
    const selection = window.Application.Selection

    if (!selection) {
      alert('无法获取文档光标位置')
      return
    }

    // 记录插入起始位置
    const startPos = selection.Range.Start

    // 解析Markdown并插入到文档
    parseAndInsertMarkdown(markdownContent, selection)

    // 记录插入结束位置并选中
    const endPos = selection.Range.Start
    const insertedRange = doc.Range(startPos, endPos)
    insertedRange.Select()

    alert('内容已成功插入到文档！')
  } catch (error) {
    console.error('插入文档失败:', error)
    alert('插入文档失败: ' + (error.message || '未知错误'))
  }
}

const parseAndInsertMarkdown = (content, selection) => {
  // 按行分割内容
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    // 处理标题
    if (line.startsWith('#')) {
      const headingLevel = line.match(/^#+/)?.[0].length || 1
      const text = line.replace(/^#+\s*/, '')

      if (text) {
        selection.TypeText(text)
        // 设置标题样式（1-6级）
        if (headingLevel <= 6) {
          // WPS中标题样式的名称，如"标题 1", "标题 2"等
          selection.ParagraphFormat.set_Style(`标题 ${headingLevel}`)
        }
        selection.TypeParagraph()
      }
    }
    // 处理粗体
    else if (line.startsWith('**') && line.endsWith('**')) {
      const text = line.slice(2, -2)
      selection.Font.Bold = true
      selection.TypeText(text)
      selection.Font.Bold = false
      selection.TypeParagraph()
    }
    // 处理斜体
    else if (line.startsWith('*') && line.endsWith('*')) {
      const text = line.slice(1, -1)
      selection.Font.Italic = true
      selection.TypeText(text)
      selection.Font.Italic = false
      selection.TypeParagraph()
    }
    // 处理代码块
    else if (line.startsWith('```')) {
      // 代码块开始或结束，这里我们简单处理
      if (index === lines.length - 1 || !lines[index + 1]?.startsWith('```')) {
        // 代码块内容
      }
    }
    // 处理列表
    else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
      const text = line.slice(2)
      // 插入项目符号
      selection.Range.ListFormat.ApplyBulletDefault()
      selection.TypeText(text)
      selection.TypeParagraph()
      // 清除列表格式
      selection.Range.ListFormat.RemoveNumbers()
    }
    // 处理有序列表
    else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '')
      // 插入编号
      selection.Range.ListFormat.ApplyNumberDefault()
      selection.TypeText(text)
      selection.TypeParagraph()
      // 清除列表格式
      selection.Range.ListFormat.RemoveNumbers()
    }
    // 处理普通段落
    else if (line.trim()) {
      // 处理行内粗体和斜体
      let processedLine = line
      let currentPos = 0

      // 简单的行内格式处理
      while (processedLine) {
        // 查找下一个格式标记
        const boldMatch = processedLine.indexOf('**')
        const italicMatch = processedLine.indexOf('*')

        if (boldMatch === -1 && italicMatch === -1) {
          // 没有更多格式，直接插入剩余文本
          selection.TypeText(processedLine)
          break
        }

        // 确定先处理哪个
        let matchIndex, matchLen, isBold
        if (boldMatch !== -1 && (italicMatch === -1 || boldMatch < italicMatch)) {
          matchIndex = boldMatch
          matchLen = 2
          isBold = true
        } else {
          matchIndex = italicMatch
          matchLen = 1
          isBold = false
        }

        // 插入格式前的文本
        if (matchIndex > 0) {
          selection.TypeText(processedLine.slice(0, matchIndex))
        }

        // 找到结束标记
        const endMatch = processedLine.indexOf(isBold ? '**' : '*', matchIndex + matchLen)
        if (endMatch === -1) {
          // 没有结束标记，直接插入剩余文本
          selection.TypeText(processedLine.slice(matchIndex))
          break
        }

        // 插入格式化文本
        const formattedText = processedLine.slice(matchIndex + matchLen, endMatch)
        if (isBold) {
          selection.Font.Bold = true
        } else {
          selection.Font.Italic = true
        }
        selection.TypeText(formattedText)
        if (isBold) {
          selection.Font.Bold = false
        } else {
          selection.Font.Italic = false
        }

        // 更新processedLine
        processedLine = processedLine.slice(endMatch + matchLen)
      }

      selection.TypeParagraph()
    }
    // 处理空行
    else {
      selection.TypeParagraph()
    }
  })
}
</script>

<style scoped>
.document-content-info {
  padding: 6px 12px;
  background: linear-gradient(135deg, #f0f2ff 0%, #e8f0fe 100%);
  border-radius: 6px;
  margin-bottom: 10px;
  font-size: 12px;
}

.document-content-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.attach-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

.attach-toggle input[type='checkbox'] {
  cursor: pointer;
}

.content-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #667eea;
  font-weight: 500;
}

.selection-indicator {
  color: #2e7d32;
}

.full-doc-indicator {
  color: #1565c0;
}

.document-content-tag {
  margin-top: 6px;
}

.selection-tag,
.full-doc-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  background: #f0f2ff;
  color: #667eea;
}

.selection-tag {
  background: #e8f5e9;
  color: #2e7d32;
}

.full-doc-tag {
  background: #e3f2fd;
  color: #1565c0;
}

.ai-chat-panel {
  width: 100%;
  height: 100%;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.session-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.session-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.session-header h3 {
  margin: 0;
  font-size: 14px;
  color: #333;
}

.new-session-btn {
  padding: 8px 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.new-session-btn:hover {
  transform: translateY(-1px);
}

.session-items {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.session-item {
  padding: 12px 20px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}

.session-item:hover {
  background: #f8f9fa;
}

.session-item.active {
  background: #e8f0fe;
  border-left: 4px solid #667eea;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.session-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #888;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  min-height: 0;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-chat {
  text-align: center;
  padding: 40px 20px;
  color: #888;
}

.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.message {
  display: flex;
  gap: 10px;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: #e3f2fd;
}

.message.assistant .message-avatar {
  background: #f3e5f5;
}

.message-content {
  max-width: 70%;
}

.message.user .message-content {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-text {
  padding: 8px 12px;
  border-radius: 12px;
  line-height: 1.5;
  word-wrap: break-word;
  font-size: 14px;
}

.message.user .message-text {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-text {
  background: #f5f5f5;
  color: #333;
  border-bottom-left-radius: 4px;
}

.thinking-container {
  margin-bottom: 8px;
}

.thinking-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: rgba(255, 193, 7, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.thinking-toggle:hover {
  background: rgba(255, 193, 7, 0.3);
}

.thinking-icon {
  font-size: 14px;
}

.thinking-label {
  font-size: 12px;
  color: #8b6914;
  font-weight: 500;
}

.thinking-arrow {
  font-size: 10px;
  color: #8b6914;
  transition: transform 0.2s;
}

.thinking-content {
  margin-top: 6px;
  padding: 8px 12px;
  background: #fff8e1;
  border-radius: 8px;
  border-left: 2px solid #ffc107;
}

.thinking-text {
  font-size: 12px;
  color: #8b6914;
  line-height: 1.4;
  font-style: italic;
  white-space: pre-wrap;
}

.message-text :deep(p) {
  margin: 6px 0;
}

.message-text :deep(pre) {
  background: #2d2d2d;
  color: #ccc;
  padding: 10px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.message-text :deep(code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 5px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 13px;
}

.message.user .message-text :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

.sources {
  margin-top: 8px;
  padding: 8px 10px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 12px;
}

.sources-title {
  font-weight: 600;
  color: #555;
  margin-bottom: 6px;
}

.source-item {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid #eee;
}

.source-item:last-child {
  border-bottom: none;
}

.source-title {
  color: #667eea;
  font-weight: 500;
}

.source-score {
  color: #888;
}

.insert-btn-container {
  margin-top: 8px;
}

.insert-btn {
  padding: 6px 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition:
    transform 0.2s,
    opacity 0.2s;
}

.insert-btn:hover {
  transform: translateY(-1px);
  opacity: 0.9;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 10px 12px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #888;
  border-radius: 50%;
  animation: typing 1.4s infinite;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  60%,
  100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-6px);
  }
}

.chat-footer {
  padding: 10px 16px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

.top-selectors {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  align-items: center;
  flex-wrap: wrap;
  position: relative;
  z-index: 2;
}

.mode-selector {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.mode-selector label {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
}

.mode-selector input[type='radio'] {
  cursor: pointer;
}

.kb-selector,
.agent-selector {
  flex: 1;
  min-width: 140px;
  position: relative;
  z-index: 9999;
}

.kb-selector select,
.agent-selector select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: white;
  cursor: pointer;
  position: relative;
  z-index: 9999;
  pointer-events: auto;
}

.agent-selector {
  flex: 1;
  min-width: 140px;
  max-width: 100%;
  position: relative;
}

.custom-select-wrapper {
  position: relative;
  width: 100%;
  box-sizing: border-box;
}

.custom-select-trigger {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  transition: border-color 0.2s;
  user-select: none;
  overflow: hidden;
  box-sizing: border-box;
}

.custom-select-trigger:hover {
  border-color: #bbb;
}

.custom-select-wrapper.open .custom-select-trigger {
  border-color: #667eea;
}

.selected-agent-display {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.selected-kb-display {
  font-size: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.selected-agent-display .emoji {
  flex-shrink: 0;
}

.placeholder {
  color: #999;
  flex: 1;
  min-width: 0;
}

.select-arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #888;
  pointer-events: none;
}

.custom-select-dropdown {
  position: absolute;
  bottom: calc(100% + 4px);
  left: 0;
  width: 100%;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
  box-sizing: border-box;
}

.dropdown-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f5f5f5;
}

.dropdown-item:last-child {
  border-bottom: none;
}

.dropdown-item:hover {
  background: #f8f9fa;
}

.dropdown-item.active {
  background: #e8f0fe;
}

.item-emoji {
  font-size: 20px;
  flex-shrink: 0;
  line-height: 1.4;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.item-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-theme {
  font-size: 12px;
  color: #888;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
}

.attachment-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  background: #fbfbff;
  font-size: 12px;
}

.attachment-item button {
  border: none;
  background: transparent;
  color: #d23f3f;
  cursor: pointer;
  font-size: 16px;
  padding: 0;
}

.input-area {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.attachment-uploader {
  flex-shrink: 0;
}

.attachment-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px dashed #667eea;
  border-radius: 8px;
  color: #667eea;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
}

.attachment-label:hover {
  background: #f0f2ff;
}

.attachment-label input[type='file'] {
  display: none;
}

.clear-session-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px dashed #667eea;
  border-radius: 8px;
  color: #667eea;
  font-size: 20px;
  cursor: pointer;
  transition: background 0.2s;
  background: transparent;
  padding: 0;
}

.clear-session-btn:hover {
  background: #f0f2ff;
}

.input-area textarea {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
  outline: none;
  max-height: 100px;
  font-family: inherit;
}

.input-area textarea:focus {
  border-color: #667eea;
}

.send-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition:
    transform 0.2s,
    opacity 0.2s;
  height: 36px;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-btn {
  width: 100%;
  padding: 10px;
  background: #f5f5f5;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  color: #555;
  transition: background 0.2s;
}

.back-btn:hover {
  background: #e8e8e8;
}
</style>
