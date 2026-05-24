/**
 * 解析 AI 回复中的结构化操作指令
 */
export class DocumentOperationParser {
  /**
   * 从 Markdown 文本中提取 document-operations 代码块
   * @param {string} markdown - Markdown 文本
   * @returns {Array} 操作数组
   */
  static extractOperations(markdown) {
    const regex = /```document-operations\s*\n([\s\S]*?)\n```/g
    const operations = []
    let match

    while ((match = regex.exec(markdown)) !== null) {
      try {
        const jsonStr = match[1]
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed)) {
          parsed.forEach((op, index) => {
            operations.push({
              ...op,
              id: `op-${Date.now()}-${index}`,
              confirmed: true,
              status: 'pending'
            })
          })
        }
      } catch (e) {
        console.error('解析操作指令失败:', e)
      }
    }

    return operations
  }

  /**
   * 从 Markdown 中移除操作代码块，保留纯文本
   * @param {string} markdown - Markdown 文本
   * @returns {string} 纯文本
   */
  static stripOperations(markdown) {
    return markdown.replace(/```document-operations\s*\n[\s\S]*?\n```/g, '')
  }
}
