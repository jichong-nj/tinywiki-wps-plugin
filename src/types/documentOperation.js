/**
 * 文档操作位置信息
 * @typedef {Object} OperationPosition
 * @property {number} [page] - 页码
 * @property {number} [line] - 行号
 * @property {number} [paragraph] - 段落号
 * @property {string} [context] - 上下文文本
 * @property {string} [contextStart] - 起始上下文文本
 * @property {string} [contextEnd] - 结束上下文文本
 */

/**
 * 文档操作对象
 * @typedef {Object} DocumentOperation
 * @property {string} id - 操作ID
 * @property {'insert'|'delete'|'replace'} type - 操作类型
 * @property {OperationPosition} position - 位置信息
 * @property {string} [content] - 新增或替换的内容
 * @property {string} [oldContent] - 被删除或替换的原内容
 * @property {string} description - 操作说明
 * @property {boolean} confirmed - 是否已确认
 * @property {'pending'|'executing'|'success'|'error'} status - 执行状态
 */

export {}
