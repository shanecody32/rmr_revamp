# Performance Optimization Plan

## Executive Summary

Analysis of the RMR application revealed significant performance issues causing slow page loads. The band edit page (`/bands/edit/161245/monster-mike-welsh`) triggers up to **7+ API calls** on load, with several being redundant or inefficient.

### Key Metrics (Current State)
- Band edit page: 7+ API calls, ~2-4 seconds load time
- Similar bands search: Duplicate relation loading
- Band merge (4 bands): 100+ database queries
- Album list: O(n²) in-memory operations

---

## Phase 1: Backend API Optimization (High Impact)

### 1.1 Add Missing Database Indexes
**Priority: CRITICAL**
**Impact: All endpoints**

Create migration to add indexes on frequently-queried foreign key columns:

```sql
-- bands table
CREATE INDEX idx_bands_name ON bands(name);
CREATE INDEX idx_bands_country_id ON bands(country_id);
CREATE INDEX idx_bands_state_id ON bands(state_id);
CREATE INDEX idx_bands_city_id ON bands(city_id);

-- band_aliases table
CREATE INDEX idx_band_aliases_band_id ON band_aliases(band_id);

-- band_images table
CREATE INDEX idx_band_images_band_id ON band_images(band_id);

-- albums_songs table
CREATE INDEX idx_albums_songs_album_id ON albums_songs(album_id);
CREATE INDEX idx_albums_songs_song_id ON albums_songs(song_id);

-- albums_bands table
CREATE INDEX idx_albums_bands_band_id ON albums_bands(band_id);
CREATE INDEX idx_albums_bands_album_id ON albums_bands(album_id);

-- songs table
CREATE INDEX idx_songs_band_id ON songs(band_id);

-- bands_sub_genres table
CREATE INDEX idx_bands_sub_genres_band_id ON bands_sub_genres(band_id);

-- reviews table
CREATE INDEX idx_reviews_band_id ON reviews(band_id);

-- radio_playlists table
CREATE INDEX idx_radio_playlists_band_id ON radio_playlists(band_id);
```

**File to create**: `migration/src/m20260126_add_performance_indexes.rs`

---

### 1.2 Fix N+1 Queries in Band Merge
**Priority: CRITICAL**
**File**: `backend/src/services/band_service.rs` (lines 498-880)

**Current Issue**: For each source band in a merge, the function executes separate queries in a loop:
```rust
for from_id in &from_ids {
    let images = BandImage::find().filter(...).all(txn).await?;
    // ... repeats for 12 different relation types
}
```

**Solution**: Bulk load all relations before the loop:
```rust
// Load all images for all source bands at once
let all_images = BandImage::find()
    .filter(BandImageColumn::BandId.is_in(from_ids.clone()))
    .all(txn)
    .await?;

// Group by band_id in memory
let images_by_band: HashMap<u32, Vec<BandImageModel>> = all_images
    .into_iter()
    .filter_map(|img| img.band_id.map(|id| (id, img)))
    .fold(HashMap::new(), |mut acc, (id, img)| {
        acc.entry(id).or_default().push(img);
        acc
    });

// Then iterate without queries
for from_id in &from_ids {
    if let Some(images) = images_by_band.get(from_id) {
        for img in images { /* process */ }
    }
}
```

**Impact**: Reduce 100+ queries to ~15 queries for merging 10 bands.

---

### 1.3 Optimize Similar Bands Relation Loading
**Priority: HIGH**
**File**: `backend/src/services/band_service.rs` (lines 367-512)

**Current Issue**: `load_band_relations` is called redundantly after bands are already loaded.

**Solution**: The function already loads band models; remove the second `load_band_relations` call since the data is already there.

---

### 1.4 Use HashMap for O(1) Lookups in Relation Loading
**Priority: HIGH**
**Files**:
- `backend/src/services/band_service.rs` (load_band_relations)
- `backend/src/services/album_service.rs` (load_album_relations)

**Current Issue**: O(n²) nested `.find()` calls:
```rust
// O(n) per call
songs.iter().find(|s| s.id == asong.song_id)
```

**Solution**: Pre-build HashMaps:
```rust
use std::collections::HashMap;

let song_map: HashMap<u32, &SongModel> = songs.iter()
    .map(|s| (s.id, s))
    .collect();

// O(1) lookup
song_map.get(&asong.song_id)
```

---

### 1.5 Create Lightweight Band Endpoint
**Priority: HIGH**
**File**: `backend/src/api/bands.rs`

**Current Issue**: `/bands/{id}` returns full relations including all images, genres, sub_genres.

**Solution**: Add query parameter for field selection:
```rust
#[utoipa::path(
    get,
    path = "/bands/{id}",
    params(
        ("id" = u32, Path),
        ("include" = Option<String>, Query, description = "Comma-separated: images,genres,location,discography")
    ),
)]
pub async fn get_band(
    State(state): State<AppState>,
    Path(id): Path<u32>,
    Query(params): Query<BandDetailParams>,
) -> impl IntoResponse {
    // Only load requested relations
}
```

---

### 1.6 Consolidate Band Detail + Discography Endpoints
**Priority: MEDIUM**
**Files**: `backend/src/api/bands.rs`, `backend/src/services/band_service.rs`

**Current Issue**: Frontend calls both `/bands/{id}` AND `/bands/{id}/discography`.

**Solution**: Return discography in main endpoint when requested:
```rust
// Single call: GET /bands/{id}?include=discography
```

---

## Phase 2: Frontend Optimization (High Impact)

### 2.1 Single API Call for Band Details
**Priority: CRITICAL**
**File**: `frontend/src/lib/api/bands.ts` (lines 122-138)

**Current Issue**: Two parallel API calls for every band fetch.

**Solution**: Use single endpoint with include parameter:
```typescript
export const fetchBandById = async (
    id: number,
    options?: { includeDiscography?: boolean }
): Promise<BandWithDiscographyResponse> => {
    const params = new URLSearchParams();
    if (options?.includeDiscography) {
        params.append('include', 'discography');
    }
    const response = await api.get<BandWithDiscographyResponse>(
        `/bands/${id}?${params}`
    );
    return response.data;
};
```

---

### 2.2 Eliminate Location Typeahead API Calls
**Priority: HIGH**
**Files**:
- `frontend/src/components/common/typeahead/CountryTypeahead.tsx`
- `frontend/src/components/common/typeahead/StateTypeahead.tsx`
- `frontend/src/components/common/typeahead/CityTypeahead.tsx`

**Current Issue**: Each typeahead fetches entity by ID on mount, causing 3-4 extra API calls.

**Solution**: Pass initial value from parent (already have the data):
```typescript
interface CountryTypeaheadProps {
    value?: number;
    initialCountry?: CountryResponse; // NEW: Pass the full object
    onChange: (value: number | undefined) => void;
}

export default function CountryTypeahead({
    value,
    initialCountry, // Use this instead of fetching
    onChange
}: CountryTypeaheadProps) {
    const [currentCountry, setCurrentCountry] = useState<CountryResponse | null>(
        initialCountry || null
    );

    // Only fetch if we have value but no initialCountry
    useEffect(() => {
        if (value && !initialCountry && !currentCountry) {
            loadCountry();
        }
    }, [value, initialCountry]);
}
```

**In BandEditContent.tsx**:
```typescript
<CountryTypeahead
    value={band?.country_id}
    initialCountry={band?.country}  // Pass existing data
    onChange={...}
/>
```

---

### 2.3 Lazy Load Discography
**Priority: HIGH**
**Files**:
- `frontend/src/app/bands/view/[id]/[slug]/components/BandViewContent.tsx`
- `frontend/src/app/bands/edit/[id]/[slug]/components/BandEditContent.tsx`

**Current Issue**: Discography loaded on page mount even if user never views it.

**Solution**: Load discography only when tab is selected:
```typescript
const [discographyLoaded, setDiscographyLoaded] = useState(false);
const [discography, setDiscography] = useState<AlbumResponse[]>([]);

const handleTabChange = async (key: string) => {
    setActiveTab(key);
    if (key === 'discography' && !discographyLoaded) {
        const data = await fetchBandDiscography(bandId);
        setDiscography(data);
        setDiscographyLoaded(true);
    }
};
```

---

### 2.4 Remove Duplicate Hook Files
**Priority: MEDIUM**
**Files to consolidate**:
- Keep: `frontend/src/hooks/useTableData.ts`
- Remove: `frontend/src/hooks/table/useTableData.ts`
- Keep: `frontend/src/hooks/useTableSearch.ts`
- Remove: `frontend/src/hooks/table/useTableSearch.ts`

**Action**: Delete the `hooks/table/` directory after verifying no imports use it.

---

### 2.5 Implement Request Deduplication
**Priority: MEDIUM**
**File**: `frontend/src/lib/api/config.ts`

**Solution**: Add axios request deduplication:
```typescript
import axios from 'axios';

const pendingRequests = new Map<string, Promise<any>>();

api.interceptors.request.use((config) => {
    const key = `${config.method}-${config.url}-${JSON.stringify(config.params)}`;

    if (pendingRequests.has(key)) {
        // Return cached promise
        return pendingRequests.get(key);
    }

    return config;
});

api.interceptors.response.use((response) => {
    const key = `${response.config.method}-${response.config.url}`;
    pendingRequests.delete(key);
    return response;
});
```

---

### 2.6 Add Response Caching with SWR
**Priority: MEDIUM**
**Files**: Various API hooks

**Solution**: Use SWR consistently for all data fetching:
```typescript
// frontend/src/hooks/api/useBand.ts
export function useBand(id: number, options?: { includeDiscography?: boolean }) {
    const params = options?.includeDiscography ? '?include=discography' : '';

    return useSWR<BandWithDiscographyResponse>(
        id ? `/bands/${id}${params}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute cache
        }
    );
}
```

---

## Phase 3: Best Practices Improvements

### 3.1 Backend Best Practices

#### Connection Pooling
**File**: `backend/src/main.rs` or database config

Ensure SeaORM connection pool is properly configured:
```rust
let mut opt = ConnectOptions::new(database_url);
opt.max_connections(100)
   .min_connections(5)
   .connect_timeout(Duration::from_secs(8))
   .idle_timeout(Duration::from_secs(8))
   .sqlx_logging(false); // Disable in production
```

#### Query Logging (Development)
Add query timing logs to identify slow queries:
```rust
// In development, log queries taking > 100ms
if cfg!(debug_assertions) {
    opt.sqlx_logging(true);
}
```

#### Response Compression
**File**: `backend/src/main.rs`

Enable gzip compression for API responses:
```rust
use tower_http::compression::CompressionLayer;

let app = Router::new()
    .merge(api_routes())
    .layer(CompressionLayer::new());
```

---

### 3.2 Frontend Best Practices

#### Component Memoization
Wrap expensive components with React.memo:
```typescript
const BandCard = React.memo(function BandCard({ band }: { band: BandResponse }) {
    // ...
});
```

#### Virtual List for Large Tables
**File**: `frontend/src/components/common/data/tables/`

For tables with 100+ rows, use virtual scrolling:
```typescript
import { VariableSizeList } from 'react-window';
```

#### Code Splitting
Lazy load heavy components:
```typescript
const BandMergeComparison = dynamic(
    () => import('./BandMergeComparison'),
    { loading: () => <Spin /> }
);
```

#### Image Optimization
Use Next.js Image component with proper sizing:
```typescript
import Image from 'next/image';

<Image
    src={band.images[0]?.thumbname}
    width={48}
    height={48}
    alt={band.name}
    loading="lazy"
/>
```

---

## Phase 4: Monitoring & Validation

### 4.1 Add Performance Metrics
**Backend**: Add request timing middleware
```rust
use std::time::Instant;

async fn timing_middleware<B>(req: Request<B>, next: Next<B>) -> Response {
    let start = Instant::now();
    let path = req.uri().path().to_string();
    let response = next.run(req).await;
    let duration = start.elapsed();

    if duration > Duration::from_millis(500) {
        tracing::warn!("Slow request: {} took {:?}", path, duration);
    }

    response
}
```

### 4.2 Frontend Performance Monitoring
Add Web Vitals tracking:
```typescript
// frontend/src/app/layout.tsx
import { useReportWebVitals } from 'next/web-vitals';

export function reportWebVitals(metric: any) {
    if (metric.name === 'LCP' && metric.value > 2500) {
        console.warn('LCP exceeded threshold:', metric.value);
    }
}
```

---

## Implementation Priority

| Phase | Task | Impact | Effort | Priority |
|-------|------|--------|--------|----------|
| 1.1 | Add database indexes | HIGH | LOW | P0 |
| 1.2 | Fix N+1 in merge_bands | HIGH | MEDIUM | P0 |
| 2.1 | Single API call for band | HIGH | LOW | P0 |
| 2.2 | Eliminate typeahead fetches | HIGH | LOW | P0 |
| 1.3 | Optimize similar bands | MEDIUM | LOW | P1 |
| 1.4 | HashMap lookups | MEDIUM | MEDIUM | P1 |
| 2.3 | Lazy load discography | MEDIUM | MEDIUM | P1 |
| 2.4 | Remove duplicate hooks | LOW | LOW | P2 |
| 2.5 | Request deduplication | MEDIUM | MEDIUM | P2 |
| 3.1 | Backend best practices | MEDIUM | LOW | P2 |
| 3.2 | Frontend best practices | MEDIUM | MEDIUM | P2 |

---

## Expected Results

After implementing all optimizations:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Band edit page API calls | 7+ | 1-2 | 70-85% reduction |
| Band edit load time | 2-4s | <1s | 60-75% faster |
| Band merge (10 bands) queries | 100+ | 15 | 85% reduction |
| Similar bands search | Duplicate loading | Single load | 50% faster |
| Album list rendering | O(n²) | O(n) | Linear scaling |

---

## Files to Modify

### Backend
- [ ] `migration/src/m20260126_add_performance_indexes.rs` (NEW)
- [ ] `backend/src/services/band_service.rs`
- [ ] `backend/src/services/album_service.rs`
- [ ] `backend/src/api/bands.rs`
- [ ] `backend/src/main.rs` (compression)

### Frontend
- [ ] `frontend/src/lib/api/bands.ts`
- [ ] `frontend/src/lib/api/config.ts`
- [ ] `frontend/src/components/common/typeahead/CountryTypeahead.tsx`
- [ ] `frontend/src/components/common/typeahead/StateTypeahead.tsx`
- [ ] `frontend/src/components/common/typeahead/CityTypeahead.tsx`
- [ ] `frontend/src/app/bands/edit/[id]/[slug]/components/BandEditContent.tsx`
- [ ] `frontend/src/app/bands/view/[id]/[slug]/components/BandViewContent.tsx`
- [ ] `frontend/src/hooks/table/` (DELETE directory)
