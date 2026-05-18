<template>
  <div class="operation-item">
    <div class="operation-header">
      <span class="operation-type" :class="operation.type">
        {{ getTypeLabel(operation.type) }}
      </span>
      <span class="operation-desc">{{ operation.description }}</span>
      <button class="locate-btn" @click="onLocate">
        📍 定位
      </button>
    </div>
    
    <div class="operation-position" v-if="hasPositionInfo">
      <span v-if="operation.position.page">第 {{ operation.position.page }} 页</span>
      <span v-if="operation.position.line">第 {{ operation.position.line }} 行</span>
      <span v-if="operation.position.paragraph">第 {{ operation.position.paragraph }} 段</span>
    </div>
    
    <div class="operation-content">
      <!-- 删除内容 -->
      <div v-if="operation.type === 'delete' || operation.type === 'replace'" class="old-content">
        <div class="content-label">删除/原内容：</div>
        <div class="content-text delete-text">{{ operation.oldContent }}</div>
      </div>
      
      <!-- 新增/替换内容 -->
      <div v-if="operation.type === 'insert' || operation.type === 'replace'" class="new-content">
        <div class="content-label">新增/新内容：</div>
        <div class="content-text insert-text">{{ operation.content }}</div>
      </div>
    </div>
    
    <div class="operation-footer">
      <label class="confirm-checkbox">
        <input 
          type="checkbox" 
          :checked="operation.confirmed"
          @change="onConfirmChange($event.target.checked)"
        />
        确认执行此操作
      </label>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  operation: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['confirm', 'locate', 'update:confirmed']);

const hasPositionInfo = computed(() => 
  props.operation.position.page || 
  props.operation.position.line || 
  props.operation.position.paragraph
);

const getTypeLabel = (type) => {
  const labels = {
    'insert': '➕ 新增',
    'delete': '🗑️ 删除',
    'replace': '✏️ 修改'
  };
  return labels[type] || type;
};

const onConfirmChange = (checked) => {
  emit('update:confirmed', checked);
  emit('confirm', props.operation, checked);
};

const onLocate = () => {
  emit('locate', props.operation);
};
</script>

<style scoped>
.operation-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.operation-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.operation-type {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.operation-type.insert {
  background: #e8f5e9;
  color: #2e7d32;
}

.operation-type.delete {
  background: #ffebee;
  color: #c62828;
}

.operation-type.replace {
  background: #e3f2fd;
  color: #1565c0;
}

.operation-desc {
  flex: 1;
  font-size: 13px;
}

.locate-btn {
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
}

.operation-position {
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
}

.operation-content {
  background: white;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 8px;
}

.content-label {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.content-text {
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.delete-text {
  color: #c62828;
  text-decoration: line-through;
}

.insert-text {
  color: #2e7d32;
}

.operation-footer {
  display: flex;
  justify-content: flex-end;
}

.confirm-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}
</style>
