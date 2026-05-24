<template>
  <div class="document-operation-list">
    <!-- 批量操作栏 -->
    <div class="batch-actions" v-if="operations.length > 0">
      <button class="batch-btn" @click="toggleAll(true)">全选</button>
      <button class="batch-btn" @click="toggleAll(false)">全不选</button>
    </div>

    <!-- 操作列表 -->
    <div class="operation-items">
      <DocumentOperationItem
        v-for="op in operations"
        :key="op.id"
        :operation="op"
        @confirm="onConfirm"
        @locate="onLocate"
        @update:confirmed="(checked) => updateOperationConfirmed(op, checked)"
      />
    </div>

    <!-- 执行按钮 -->
    <div class="execute-actions" v-if="operations.length > 0">
      <button class="execute-btn" :disabled="!hasConfirmedOperations" @click="executeOperations">
        执行已确认的操作 ({{ confirmedCount }})
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import DocumentOperationItem from './DocumentOperationItem.vue'

const props = defineProps({
  operations: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['execute', 'locate'])

const hasConfirmedOperations = computed(() => props.operations.some((op) => op.confirmed))

const confirmedCount = computed(() => props.operations.filter((op) => op.confirmed).length)

const toggleAll = (confirmed) => {
  props.operations.forEach((op) => {
    op.confirmed = confirmed
  })
}

const updateOperationConfirmed = (operation, confirmed) => {
  operation.confirmed = confirmed
}

const onConfirm = () => {
  // 操作已通过updateOperationConfirmed更新
}

const onLocate = (operation) => {
  emit('locate', operation)
}

const executeOperations = () => {
  const confirmedOps = props.operations.filter((op) => op.confirmed)
  emit('execute', confirmedOps)
}
</script>

<style scoped>
.document-operation-list {
  margin-top: 12px;
}

.batch-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.batch-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}

.batch-btn:hover {
  background: #f5f5f5;
}

.execute-actions {
  margin-top: 12px;
}

.execute-btn {
  width: 100%;
  padding: 10px 16px;
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
}

.execute-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.execute-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
