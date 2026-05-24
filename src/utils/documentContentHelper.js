/**
 * 文档内容获取工具类
 */
export class DocumentContentHelper {
  /**
   * 获取文档中选中的文本
   * @returns {string|null} 选中的文本，如果没有选中则返回null
   */
  static getSelectedText() {
    try {
      if (!window.Application?.ActiveDocument) {
        return null
      }

      const selection = window.Application.Selection
      if (!selection) {
        return null
      }

      // 获取选中的文本
      const selectedText = selection.Range.Text

      // 如果选中的文本为空或只有空格，则返回null
      if (!selectedText || selectedText.trim() === '') {
        return null
      }

      return selectedText
    } catch (error) {
      console.error('获取选中内容失败:', error)
      return null
    }
  }

  /**
   * 获取文档的全部文本内容
   * @returns {string|null} 文档的全部文本，如果获取失败则返回null
   */
  static getFullDocumentText() {
    try {
      if (!window.Application?.ActiveDocument) {
        return null
      }

      const doc = window.Application.ActiveDocument
      // 获取文档的全部内容
      const fullText = doc.Content.Text

      return fullText
    } catch (error) {
      console.error('获取文档全文失败:', error)
      return null
    }
  }

  /**
   * 获取要发送给AI的文档内容
   * - 如果有选中的文本，则返回选中的文本
   * - 如果没有选中文本，则返回全文
   * @returns {string|null} 要发送的文档内容
   */
  static getDocumentContentForAI() {
    // 首先尝试获取选中的文本
    const selectedText = this.getSelectedText()

    if (selectedText) {
      return selectedText
    }

    // 如果没有选中，则返回全文
    return this.getFullDocumentText()
  }

  /**
   * 检查是否有选中文本
   * @returns {boolean} 是否有选中文本
   */
  static hasSelection() {
    const selectedText = this.getSelectedText()
    return selectedText !== null
  }

  /**
   * 获取选择状态信息
   * @returns {object} 包含选择状态和内容的对象
   */
  static getSelectionInfo() {
    const hasSelection = this.hasSelection()
    const selectedText = hasSelection ? this.getSelectedText() : null
    const fullText = this.getFullDocumentText()

    return {
      hasSelection,
      selectedText,
      fullText,
      contentToUse: hasSelection ? selectedText : fullText
    }
  }
}
