/**
 * 文档操作执行器
 */
export class DocumentOperationExecutor {
  /**
   * 执行单个操作
   * @param {Object} operation - 操作对象
   * @returns {Promise<boolean>} 是否成功
   */
  static async executeOperation(operation) {
    try {
      operation.status = 'executing'

      switch (operation.type) {
        case 'insert':
          return await this.executeInsert(operation)
        case 'delete':
          return await this.executeDelete(operation)
        case 'replace':
          return await this.executeReplace(operation)
        default:
          throw new Error(`未知操作类型: ${operation.type}`)
      }
    } catch (error) {
      console.error('执行操作失败:', error)
      operation.status = 'error'
      return false
    }
  }

  /**
   * 批量执行操作
   * @param {Array} operations - 操作数组
   * @returns {Promise<Object>} 执行结果
   */
  static async executeOperations(operations) {
    let success = 0
    let failed = 0

    for (const op of operations) {
      const result = await this.executeOperation(op)
      if (result) {
        op.status = 'success'
        success++
      } else {
        op.status = 'error'
        failed++
      }
    }

    return { success, failed }
  }

  /**
   * 执行新增操作
   * @param {Object} operation - 操作对象
   * @returns {Promise<boolean>} 是否成功
   */
  static async executeInsert(operation) {
    if (!operation.content) return false

    const range = await this.findPosition(operation.position)
    if (!range) return false

    range.InsertAfter(operation.content)
    return true
  }

  /**
   * 执行删除操作
   * @param {Object} operation - 操作对象
   * @returns {Promise<boolean>} 是否成功
   */
  static async executeDelete(operation) {
    if (!operation.oldContent) return false

    const range = await this.findText(operation.oldContent)
    if (!range) return false

    range.Delete()
    return true
  }

  /**
   * 执行替换操作
   * @param {Object} operation - 操作对象
   * @returns {Promise<boolean>} 是否成功
   */
  static async executeReplace(operation) {
    if (!operation.oldContent || !operation.content) return false

    const range = await this.findText(operation.oldContent)
    if (!range) return false

    range.Text = operation.content
    return true
  }

  /**
   * 定位到文档位置
   * @param {Object} position - 位置信息
   * @returns {Promise<void>}
   */
  static async locatePosition(position) {
    const range = await this.findPosition(position)
    if (range) {
      range.Select()
    }
  }

  /**
   * 根据位置信息查找 Range
   * @param {Object} position - 位置信息
   * @returns {Promise<any>} Range 对象
   */
  static async findPosition(position) {
    // 优先使用上下文匹配
    if (position.contextStart && position.contextEnd) {
      return this.findByContextRange(position.contextStart, position.contextEnd)
    }

    if (position.context) {
      return this.findByContext(position.context)
    }

    // 使用段落号
    if (position.paragraph) {
      return this.findByParagraph(position.paragraph)
    }

    // 使用行号和页码（WPS API 可能需要其他方式）
    return null
  }

  /**
   * 根据文本内容查找
   * @param {string} text - 要查找的文本
   * @param {Object} position - 位置信息
   * @returns {Promise<any>} Range 对象
   */
  static async findText(text) {
    try {
      const doc = window.Application?.ActiveDocument
      if (!doc) return null

      const range = doc.Range()
      range.Find.ClearFormatting()
      range.Find.Text = text
      range.Find.Forward = true
      range.Find.Wrap = 1 // wdFindStop

      const found = range.Find.Execute()
      if (found) {
        return range
      }
    } catch (error) {
      console.error('查找文本失败:', error)
    }

    return null
  }

  /**
   * 根据前后文定位
   * @param {string} startText - 起始文本
   * @param {string} endText - 结束文本
   * @returns {Promise<any>} Range 对象
   */
  static async findByContextRange(startText, endText) {
    try {
      const doc = window.Application?.ActiveDocument
      if (!doc) return null

      // 先找到起始位置
      const startRange = doc.Range()
      startRange.Find.Text = startText
      if (!startRange.Find.Execute()) return null

      // 再找到结束位置
      const endRange = doc.Range(startRange.End)
      endRange.Find.Text = endText
      if (!endRange.Find.Execute()) return null

      // 返回中间的 range
      return doc.Range(startRange.End, endRange.Start)
    } catch (error) {
      console.error('上下文定位失败:', error)
      return null
    }
  }

  /**
   * 根据段落号定位
   * @param {number} paragraphNum - 段落号
   * @returns {Promise<any>} Range 对象
   */
  static async findByParagraph(paragraphNum) {
    try {
      const doc = window.Application?.ActiveDocument
      if (!doc) return null

      const paragraphs = doc.Paragraphs
      if (paragraphNum <= paragraphs.Count) {
        return paragraphs.Item(paragraphNum).Range
      }
    } catch (error) {
      console.error('段落定位失败:', error)
    }

    return null
  }

  /**
   * 根据上下文文本定位
   * @param {string} context - 上下文文本
   * @returns {Promise<any>} Range 对象
   */
  static async findByContext(context) {
    return this.findText(context)
  }
}
