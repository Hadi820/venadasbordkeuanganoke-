# Optimasi Egress Supabase

## Masalah
Egress Supabase mencapai 4.256 GB dari 5 GB limit (85%) karena:
1. Query tanpa pagination mengambil semua data sekaligus
2. Multiple data loading saat app startup
3. Tidak ada caching mechanism

## Solusi yang Diimplementasikan

### 1. Pagination & Limit ✅
- **File:** `services/projects.ts`, `services/clients.ts`
- Semua service sekarang mendukung `limit` dan `offset` parameter
- Default limit: 50 items untuk initial load, max 100
- Implementasi `listProjectsPaginated()` dan `listClientsPaginated()`
- Range queries: `.range(offset, offset + limit - 1)`

### 2. Optimized Data Loading ✅
- **File:** `services/data-loader.ts`
- Centralized data loading dengan `loadEssentialData()`
- Load data berdasarkan view dengan `loadDataForView()`
- Lazy loading untuk projects dan clients

### 3. Caching System ✅
- **File:** `hooks/useOptimizedData.ts`
- localStorage caching dengan expiration
- Cache duration: 5 menit default, configurable
- Automatic cache invalidation dan cleanup

### 4. Dashboard Summary Queries ✅
- **File:** `services/optimized-queries.ts`
- `getDashboardStats()` - count queries only
- `getProjectsSummary()` - limited fields, 10 items
- `getRecentActivity()` - minimal data untuk dashboard

### 5. Pagination Hooks ✅
- **File:** `hooks/usePaginatedData.ts`
- Infinite scroll dengan `loadMore()` function
- State management untuk pagination
- Error handling dan loading states

### 6. Data Management Hooks ✅
- **File:** `hooks/useDataManager.ts`
- `useDashboardData()` - cached dashboard data
- `useProjectsData()` - paginated projects
- `useClientsData()` - paginated clients
- `useEssentialData()` - minimal startup data

### 7. UI Components ✅
- **File:** `components/LoadMoreButton.tsx`
- Reusable pagination button
- Loading states dan "no more data" indicator

## Penggunaan

### 1. Service dengan Pagination
```typescript
// Load dengan limit dan offset
const projects = await listProjects({ limit: 20, offset: 0 });
const clients = await listClients({ limit: 50, offset: 0 });

// Load dengan pagination (recommended)
const { projects, total, hasMore } = await listProjectsPaginated(1, 20);
const { clients, total, hasMore } = await listClientsPaginated(1, 20);
```

### 2. Optimized Data Hook
```typescript
import { useOptimizedData } from './hooks/useOptimizedData';

const { data, loading, error, load, reload } = useOptimizedData({
  fetchFn: () => listClients({ limit: 50 }),
  cacheKey: 'clients_summary',
  cacheDuration: 5, // 5 minutes
  immediate: true
});
```

### 3. Paginated Data Hook
```typescript
import { usePaginatedData } from './hooks/usePaginatedData';

const { items, loading, hasMore, loadMore, reset } = usePaginatedData({
  fetchFn: async (page, limit) => {
    const result = await listProjectsPaginated(page, limit);
    return {
      data: result.projects,
      total: result.total,
      hasMore: result.hasMore
    };
  },
  limit: 20,
  immediate: false // Load on demand
});
```

### 4. Data Manager Hooks
```typescript
import { useDashboardData, useProjectsData, useClientsData } from './hooks/useDataManager';

// Dashboard dengan caching
const { data: dashboardData, loading } = useDashboardData();

// Projects dengan pagination
const projectsData = useProjectsData();
useEffect(() => {
  if (activeView === 'projects') {
    projectsData.loadMore();
  }
}, [activeView]);

// Clients dengan pagination
const clientsData = useClientsData();
```

### 5. Load More Button
```typescript
import { LoadMoreButton } from './components/LoadMoreButton';

<LoadMoreButton
  loading={projectsData.loading}
  hasMore={projectsData.hasMore}
  onLoadMore={projectsData.loadMore}
  className="mt-4"
/>
```

### 6. Centralized Data Loading
```typescript
import { loadEssentialData, loadDataForView } from './services/data-loader';

// Load minimal data saat startup
const essentialData = await loadEssentialData();

// Load data berdasarkan view
const viewData = await loadDataForView('projects');
```

## Estimasi Pengurangan Egress

### Sebelum Optimasi:
- Projects: ~500 records × 2KB = 1MB per load
- Clients: ~200 records × 1KB = 200KB per load  
- Total initial load: ~5MB
- Multiple loads per session: 20-50MB

### Setelah Optimasi:
- Projects: 30 records × 2KB = 60KB per load
- Clients: 50 records × 1KB = 50KB per load
- Total initial load: ~500KB
- Dengan caching: 50-80% reduction

**Estimasi pengurangan egress: 60-70%**

## Monitoring

### Metrics to Track:
1. Initial app load time
2. Data transfer per session
3. Cache hit rate
4. User experience (loading states)

### Tools:
- Supabase Dashboard untuk egress monitoring
- Browser DevTools Network tab
- Performance monitoring

## Next Steps

1. **Immediate (1-2 hari):**
   - Monitor egress reduction
   - Fix any loading issues
   - Add loading states to UI

2. **Short term (1 minggu):**
   - Implement infinite scroll di semua list views
   - Add search/filter dengan server-side processing
   - Optimize image loading

3. **Medium term (2-4 minggu):**
   - Database indexing optimization
   - Consider Supabase Edge Functions
   - Implement real-time subscriptions yang efisien

4. **Long term:**
   - CDN untuk static assets
   - Database query optimization
   - Consider data archiving strategy
## 
Action Plan Implementasi

### Phase 1: Immediate Actions (Hari ini - 2 hari)

#### 1. Update App.tsx untuk Lazy Loading
```typescript
// Ganti multiple useEffect dengan:
import { useEssentialData, useDashboardData } from './hooks/useDataManager';
import { loadDataForView } from './services/data-loader';

// Load hanya essential data saat startup
const { data: essentialData, loadEssentialData } = useEssentialData();
const { data: dashboardData } = useDashboardData();

// Load data berdasarkan view
useEffect(() => {
  if (activeView !== 'dashboard') {
    loadDataForView(activeView).then(setViewData);
  }
}, [activeView]);
```

#### 2. Update Service Calls di Components
```typescript
// Ganti semua pemanggilan service:
// SEBELUM: const projects = await listProjects();
// SESUDAH: const projects = await listProjects({ limit: 20 });

// Atau gunakan pagination:
const { projects, hasMore } = await listProjectsPaginated(1, 20);
```

#### 3. Add Loading States
- Tambahkan loading indicators di semua list views
- Implementasikan LoadMoreButton di Projects dan Clients view
- Show "Loading..." state saat data sedang dimuat

### Phase 2: Short Term (3-7 hari)

#### 1. Implement Infinite Scroll
```typescript
// Di ProjectsView dan ClientsView
const { items, loadMore, hasMore, loading } = usePaginatedData({
  fetchFn: listProjectsPaginated,
  limit: 20
});

// Auto-load saat scroll ke bawah
useEffect(() => {
  const handleScroll = () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
      if (hasMore && !loading) loadMore();
    }
  };
  window.addEventListener('scroll', handleScroll);
  return () => window.removeEventListener('scroll', handleScroll);
}, [hasMore, loading, loadMore]);
```

#### 2. Add Search/Filter dengan Server-side Processing
```typescript
// Tambahkan search parameter ke service
export async function searchProjects(query: string, limit: number = 20) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .or(`project_name.ilike.%${query}%,client_name.ilike.%${query}%`)
    .limit(limit);
  return data || [];
}
```

#### 3. Optimize Image Loading
```typescript
// Lazy load images dengan intersection observer
const LazyImage = ({ src, alt, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef();
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setLoaded(true);
        observer.disconnect();
      }
    });
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);
  
  return (
    <div ref={imgRef}>
      {loaded ? <img src={src} alt={alt} {...props} /> : <div>Loading...</div>}
    </div>
  );
};
```

### Phase 3: Medium Term (1-2 minggu)

#### 1. Database Optimization
```sql
-- Add indexes untuk query yang sering digunakan
CREATE INDEX IF NOT EXISTS idx_projects_date ON projects(date DESC);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_clients_since ON clients(since DESC);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
```

#### 2. Implement Edge Functions
```typescript
// Supabase Edge Function untuk complex queries
// functions/dashboard-stats/index.ts
export default async function handler(req: Request) {
  const stats = await Promise.all([
    supabase.from('projects').select('status', { count: 'exact' }),
    supabase.from('clients').select('status', { count: 'exact' }),
    // ... other aggregations
  ]);
  
  return new Response(JSON.stringify(stats), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### 3. Real-time Subscriptions Optimization
```typescript
// Hanya subscribe ke data yang benar-benar perlu real-time
const subscription = supabase
  .channel('projects_changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      // Update hanya item yang berubah, bukan reload semua
      updateProjectInList(payload.new);
    }
  )
  .subscribe();
```

## Monitoring & Validation

### 1. Setup Monitoring
```typescript
// Gunakan egressMonitor untuk tracking
import { egressMonitor } from './scripts/monitor-egress';

// Di development, log summary setiap 5 menit
setInterval(() => {
  if (process.env.NODE_ENV === 'development') {
    egressMonitor.logSummary();
  }
}, 5 * 60 * 1000);
```

### 2. Performance Metrics
- **Target:** Reduce initial load dari ~5MB ke <500KB
- **Target:** Reduce per-session egress dari 20-50MB ke 5-10MB
- **Target:** Cache hit rate >70%
- **Target:** Initial load time <2 detik

### 3. User Experience Metrics
- Loading states harus muncul dalam <100ms
- Infinite scroll harus smooth tanpa lag
- Search results dalam <500ms
- Cache data harus fresh (max 5 menit)

## Rollback Plan

Jika ada masalah dengan optimasi:

1. **Immediate Rollback:**
   ```bash
   git revert <commit-hash>
   # Atau restore specific files
   git checkout HEAD~1 -- services/projects.ts services/clients.ts
   ```

2. **Partial Rollback:**
   - Disable caching: Set `cacheDuration: 0`
   - Increase limits: Change default dari 20 ke 50
   - Disable lazy loading: Set `immediate: true`

3. **Emergency Fallback:**
   ```typescript
   // Fallback ke old behavior
   const USE_LEGACY_LOADING = true;
   
   if (USE_LEGACY_LOADING) {
     // Load all data like before
     const allProjects = await listProjects();
     setProjects(allProjects);
   } else {
     // Use optimized loading
     const { projects } = await listProjectsPaginated(1, 20);
     setProjects(projects);
   }
   ```

## Success Criteria

✅ **Egress reduction >60%** (dari 4.2GB ke <1.7GB)  
✅ **Initial load time <2 detik**  
✅ **Cache hit rate >70%**  
✅ **No degradation in user experience**  
✅ **All features working as before**  
✅ **Monitoring system in place**  

---

**Next Action:** Mulai implementasi Phase 1 dengan update App.tsx dan service calls.