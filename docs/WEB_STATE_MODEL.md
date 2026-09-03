# Web State Model - actiond-web

## 状态分类

前端状态分为三类：

| 类型 | 说明 | 存储位置 |
|------|------|----------|
| **Server State** | 从 ActionD API 获取的数据 | React Query / SWR |
| **Client State** | 前端独占的 UI 状态 | Zustand |
| **Derived State** | 从以上两者计算得出的派生数据 | useMemo / computed |

---

## 1. Server State (from ActionD API)

### 1.1 runListStore (Run 列表)

**数据来源**: `GET /api/actions`

```typescript
interface RunListState {
  runs: ActionRun[];
  totalCount: number;
  isLoading: boolean;
  error: Error | null;
}
```

**状态流转**:
```
initial → loading → success
                 → error
```

### 1.2 runDetailStore (Run 详情)

**数据来源**: `GET /api/actions/:id`

```typescript
interface RunDetailState {
  run: ActionRun | null;
  actions: Action[];
  artifacts: string[];
  logs: LogChunk[];
  isLoading: boolean;
  error: Error | null;
}
```

**状态流转**:
```
initial → loading → success
                 → error → retry
```

### 1.3 approvalStore (审批状态)

**数据来源**: `GET /api/actions?status=pending_approval`

```typescript
interface ApprovalState {
  pendingApprovals: ActionRun[];
  currentApproval: ActionRun | null;
  isApproving: boolean;
  error: Error | null;
}
```

**状态流转**:
```
idle → loading → success → approving → approved
                                      → rejected
```

### 1.4 pluginStore (插件状态)

**数据来源**: `GET /api/plugins`

```typescript
interface PluginState {
  plugins: Plugin[];
  enabledPlugins: string[];
  isLoading: boolean;
  error: Error | null;
}
```

**状态流转**:
```
initial → loading → success → toggling → success
                                      → error
```

---

## 2. Client State (Zustand)

### 2.1 uiFilterStore (筛选状态)

```typescript
interface UIFilterState {
  // Filter
  statusFilter: StatusFilter[];  // pending, running, done, failed
  repoFilter: string[];
  pluginFilter: string[];
  dateRange: [Date, Date] | null;
  
  // Sort
  sortBy: 'created_at' | 'duration' | 'status';
  sortOrder: 'asc' | 'desc';
  
  // Search
  searchQuery: string;
  
  // Pagination
  currentPage: number;
  pageSize: number;
}
```

### 2.2 logStreamStore (日志流状态)

```typescript
interface LogStreamState {
  // SSE connection
  isConnected: boolean;
  connectionError: Error | null;
  
  // Log chunks
  logs: Map<actionId, LogChunk[]>;
  expandedActions: Set<string>;
  
  // Virtual scroll
  scrollPosition: Map<actionId, number>;
}
```

### 2.3 retryResumeStore (重试/恢复状态)

```typescript
interface RetryResumeState {
  retryingActions: Set<string>;
  resumingActions: Set<string>;
  confirmDialog: {
    actionId: string;
    type: 'retry' | 'resume';
  } | null;
}
```

### 2.4 uiNotificationStore (通知状态)

```typescript
interface UINotificationState {
  notifications: Notification[];
  toasts: Toast[];
}
```

---

## 3. Derived State (计算得出)

### 3.1 filteredRuns

```typescript
const filteredRuns = useMemo(() => {
  return runs.filter(run => {
    if (statusFilter.length && !statusFilter.includes(run.status)) return false;
    if (repoFilter.length && !repoFilter.includes(run.repo)) return false;
    if (pluginFilter.length && !pluginFilter.includes(run.plugin)) return false;
    if (searchQuery && !run.repo.includes(searchQuery)) return false;
    return true;
  });
}, [runs, statusFilter, repoFilter, pluginFilter, searchQuery]);
```

### 3.2 sortedRuns

```typescript
const sortedRuns = useMemo(() => {
  return [...filteredRuns].sort((a, b) => {
    const cmp = compare(a[sortBy], b[sortBy]);
    return sortOrder === 'asc' ? cmp : -cmp;
  });
}, [filteredRuns, sortBy, sortOrder]);
```

### 3.3 paginatedRuns

```typescript
const paginatedRuns = useMemo(() => {
  const start = (currentPage - 1) * pageSize;
  return sortedRuns.slice(start, start + pageSize);
}, [sortedRuns, currentPage, pageSize]);
```

### 3.4 runStats (统计)

```typescript
const runStats = useMemo(() => {
  return {
    total: runs.length,
    success: runs.filter(r => r.status === 'done').length,
    failed: runs.filter(r => r.status === 'failed').length,
    running: runs.filter(r => r.status === 'running').length,
    pending: runs.filter(r => r.status === 'pending').length,
  };
}, [runs]);
```

---

## 4. 状态初始化策略

### Server State 初始化
- **首屏数据**: 通过 `useQuery` 在 layout.tsx 预加载
- **按需加载**: 详情页在进入时加载
- **自动刷新**: 使用 `staleTime` 控制刷新频率

### Client State 初始化
- **本地存储恢复**: filter 偏好从 localStorage 恢复
- **默认值**: 初始状态为清空/空数组

---

## 5. Zustand Store 划分建议

### 建议的 Store 划分

| Store | 职责 | 持久化 |
|-------|------|--------|
| `useFilterStore` | 筛选/排序/分页 | localStorage |
| `useUIStore` | 侧边栏/主题/通知 | localStorage |
| `useLogStore` | 日志流/展开状态 | memory |
| `useRetryStore` | 重试/恢复状态 | memory |

### 不建议放进 Zustand 的状态
- 所有 API 返回的完整数据 (用 React Query)
- 临时表单状态 (用 useState)
- URL 可编码的状态 (用 URL params)

---

## 6. 状态一致性策略

### 乐观更新
- Approval 操作使用乐观更新
- 重试/恢复使用乐观更新

### 错误回滚
```typescript
const handleApprove = async (id: string) => {
  const previous = queryClient.getQueryData(['approval', id]);
  
  // Optimistic update
  queryClient.setQueryData(['approval', id], { status: 'approved' });
  
  try {
    await approve(id);
  } catch (error) {
    // Rollback on error
    queryClient.setQueryData(['approval', id], previous);
  }
};
```

### SSE 实时同步
- Run 状态变更通过 SSE 推送
- 使用 `queryClient.setQueryData` 更新缓存
- 不重新 fetch，保持 UI 不抖动

---

## 7. 验收标准检查清单

- [ ] runListStore 有 loading/error/data 状态
- [ ] runDetailStore 有完整的 action timeline
- [ ] approvalStore 有 approve/reject 操作状态
- [ ] logStreamStore 支持 SSE 重连
- [ ] uiFilterStore 筛选后结果正确
- [ ] derived state 正确计算
- [ ] 刷新页面后 filter 偏好保留
- [ ] 重试操作有确认对话框
- [ ] 错误状态有友好的错误提示
BOUNDARY_EOF
echo "WEB_STATE_MODEL.md created"