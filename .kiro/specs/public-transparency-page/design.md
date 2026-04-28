# Design Document: Public Transparency Page

## Overview

The public transparency page is a read-only, wallet-free interface that displays real-time platform statistics and project data from the Bimex smart contract. This feature reinforces Bimex's commitment to transparency by allowing anyone to verify platform activity without requiring authentication or wallet connection.

The page will be accessible at `/transparencia` and will use the existing contract integration layer (`contrato.js`) to fetch data through read-only simulation calls. All data displayed comes directly from the Soroban smart contract on Stellar blockchain, ensuring authenticity and preventing manipulation.

### Key Design Decisions

1. **No Authentication Required**: The page uses a dummy account for contract simulation, eliminating the need for wallet connection while maintaining data integrity.

2. **Real-Time Blockchain Data**: All statistics are calculated from live smart contract data, not cached databases or APIs. This ensures visitors see the actual on-chain state.

3. **Existing Component Reuse**: The design leverages existing UI patterns, styling conventions, and the i18n system to maintain consistency with the rest of the application.

4. **Performance Optimization**: Implements client-side caching (30-second TTL) and parallel data fetching to minimize blockchain RPC calls while maintaining data freshness.

5. **Graceful Degradation**: Comprehensive error handling ensures the page remains functional even when individual contract calls fail, displaying partial data rather than blank screens.

## Architecture

### Component Structure

```
App.jsx (routing)
  └── Transparencia.jsx (main component)
       ├── TransparenciaStats (platform-wide statistics)
       ├── TransparenciaFilters (status filter buttons)
       └── TransparenciaProjectList (project cards)
```

### Data Flow

```
User navigates to /transparencia
         ↓
Transparencia component mounts
         ↓
Parallel data fetching:
  ├── obtenerTodosLosProyectos() → All projects
  └── For each project: calcularYieldDetallado() → Yield data
         ↓
Data aggregation & filtering
         ↓
Render statistics + filtered project list
         ↓
Cache data (30s TTL)
```

### Integration Points

1. **Routing**: Add route in `App.jsx` for `/transparencia` path
2. **Navigation**: Add "Transparencia" link to navbar (visible to all users)
3. **Contract Layer**: Use existing `contrato.js` functions without modification
4. **Styling**: Use existing CSS classes from `index.css`
5. **i18n**: Add translation keys to `es.json` and `en.json`

## Components and Interfaces

### Main Component: Transparencia.jsx

**Purpose**: Container component that orchestrates data fetching, state management, and rendering of child components.

**State Management**:
```javascript
{
  proyectos: Array<Project>,        // All public projects
  cargando: boolean,                // Loading state
  error: string | null,             // Error message
  filtro: string,                   // Active filter ("Todos" | status)
  stats: {
    totalProyectos: number,
    totalBloqueado: bigint,
    totalYield: bigint,
    porEstado: Map<string, number>
  },
  ultimaActualizacion: Date,        // Last refresh timestamp
  cache: {
    data: any,
    timestamp: number
  }
}
```

**Key Methods**:
- `cargarDatos()`: Fetches all projects and calculates statistics
- `aplicarFiltro(estado)`: Filters projects by status
- `refrescarDatos()`: Clears cache and reloads data
- `calcularEstadisticas(proyectos)`: Aggregates platform-wide stats

### Sub-Component: TransparenciaStats

**Purpose**: Displays aggregated platform statistics in a visually prominent stats bar.

**Props**:
```javascript
{
  totalProyectos: number,
  totalBloqueado: bigint,
  totalYield: bigint,
  porEstado: Map<string, number>,
  cargando: boolean
}
```

**Rendered Statistics**:
- Total number of projects
- Total funds locked (MXNe)
- Total yield generated (MXNe)
- Count by status (EtapaInicial, EnProgreso, Liberado, Abandonado)

### Sub-Component: TransparenciaFilters

**Purpose**: Provides filter buttons to show projects by status.

**Props**:
```javascript
{
  filtroActivo: string,
  onCambiarFiltro: (filtro: string) => void,
  contadores: Map<string, number>
}
```

**Filter Options**:
- Todos (all public projects)
- EtapaInicial
- EnProgreso
- Liberado
- Abandonado

### Sub-Component: TransparenciaProjectList

**Purpose**: Renders a grid of project cards with key information.

**Props**:
```javascript
{
  proyectos: Array<Project>,
  cargando: boolean,
  filtroActivo: string
}
```

**Project Card Data**:
- Project name
- Funding amount (aportado)
- Funding goal (meta)
- Progress percentage
- Status badge
- Progress bar visualization
- Document verification indicator (if doc_hash exists)

## Data Models

### Project Data Structure

The component consumes the existing `Project` type returned by `obtenerProyecto()`:

```javascript
{
  id: number,
  dueno: string,              // Owner address
  nombre: string,             // Project name
  meta: bigint,               // Goal in stroops
  aportado: bigint,           // Total contributed in stroops
  yield_entregado: bigint,    // Yield delivered in stroops
  estado: ProjectStatus,      // Current status
  timestamp_inicio: number,   // Unix timestamp
  capital_en_cetes: bigint,   // Capital in CETES
  capital_en_amm: bigint,     // Capital in AMM
  yield_cetes_acumulado: bigint,
  yield_amm_acumulado: bigint,
  doc_hash: string | null,    // IPFS CID or null
  motivo_rechazo: string      // Rejection reason (if any)
}
```

### ProjectStatus Enum

```javascript
type ProjectStatus = 
  | "EtapaInicial"   // Initial stage (approved, not funded)
  | "EnProgreso"     // In progress (funded, active)
  | "Liberado"       // Released (goal reached)
  | "Abandonado"     // Abandoned (available for takeover)
  | "EnRevision"     // Under review (not public)
  | "Rechazado"      // Rejected (not public)
```

### Public Projects Filter

Only projects with status in `["EtapaInicial", "EnProgreso", "Liberado", "Abandonado"]` are displayed. Projects with status `"EnRevision"` or `"Rechazado"` are filtered out.

### Yield Data Structure

Returned by `calcularYieldDetallado(idProyecto)`:

```javascript
{
  cetes: bigint,  // Yield from CETES layer
  amm: bigint,    // Yield from AMM layer
  total: bigint   // Combined yield
}
```

### Statistics Aggregation

Platform-wide statistics are calculated by:
1. Summing `aportado` across all projects → `totalBloqueado`
2. Summing `total` from `calcularYieldDetallado()` for each project → `totalYield`
3. Counting projects by `estado` → `porEstado`
4. Counting all public projects → `totalProyectos`

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Total funds calculation accuracy

*For any* set of projects retrieved from the smart contract, the displayed total funds locked should equal the sum of the `aportado` field from all projects.

**Validates: Requirements 2.5**

### Property 2: Total yield calculation accuracy

*For any* set of projects retrieved from the smart contract, the displayed total yield should equal the sum of the `total` field from `calcularYieldDetallado()` for each project.

**Validates: Requirements 2.6**

### Property 3: Consistent monetary formatting

*For any* MXNe amount displayed on the transparency page, the formatted value should match the output of the `stroopsAMXNe` helper function for that amount.

**Validates: Requirements 2.7**

### Property 4: Public projects visibility

*For any* project with status in ["EtapaInicial", "EnProgreso", "Liberado", "Abandonado"], that project should appear in the displayed project list.

**Validates: Requirements 3.1**

### Property 5: Project card completeness

*For any* public project displayed on the transparency page, its project card should contain all required information: project name, funding amount (aportado), funding goal (meta), progress percentage (aportado/meta * 100), current status, and a visual progress bar.

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

### Property 6: Non-public projects exclusion

*For any* project with status "EnRevision" or "Rechazado", that project should NOT appear in the displayed project list.

**Validates: Requirements 3.8**

### Property 7: Filter correctness

*For any* status filter selection (other than "Todos"), only projects with that exact status should be displayed in the filtered project list.

**Validates: Requirements 4.2**

### Property 8: Real-time blockchain data

*For any* data displayed on the transparency page, if the smart contract state changes, the displayed data should reflect those changes after the next data refresh (not showing stale or hardcoded values).

**Validates: Requirements 6.4**

### Property 9: Graceful error handling for invalid projects

*For any* project that returns corrupted or invalid data from the smart contract, the transparency page should skip that project and continue displaying all other valid projects without crashing.

**Validates: Requirements 10.5**

### Property 10: Error resilience

*For any* error condition (network failure, contract error, data corruption), the transparency page should remain functional and display either partial data or appropriate error messages, never showing a blank screen or crashing.

**Validates: Requirements 10.6**

## Error Handling

### Error Categories

The transparency page handles three categories of errors:

1. **Network Errors**: Connection failures, timeouts, RPC unavailability
2. **Contract Errors**: Smart contract simulation failures, invalid responses
3. **Data Errors**: Corrupted project data, invalid field values

### Error Handling Strategy

**Retry Logic**:
- Failed contract calls are retried up to 3 times with exponential backoff (1s, 2s, 4s)
- After 3 failures, display error message to user
- Log detailed error information to console for debugging

**Graceful Degradation**:
- If individual project data fails, skip that project and continue
- If statistics calculation fails, display "—" placeholder
- If all data fails, display error message with refresh button

**Timeout Handling**:
- Display loading indicators for first 5 seconds
- After 10 seconds, show timeout message with manual refresh option
- Never leave user in indefinite loading state

**Error Messages**:
- Network errors: "Unable to connect to blockchain. Please check your connection and try again."
- Contract errors: "Error loading data from smart contract. Please refresh the page."
- Data errors: "Some project data could not be loaded. Showing available projects."
- Timeout: "Loading is taking longer than expected. Click refresh to try again."

### Error Recovery

**Manual Refresh**:
- Prominent refresh button always available
- Clears cache and retries all failed operations
- Updates last refresh timestamp

**Automatic Recovery**:
- Cache expiration (30s) triggers automatic refresh
- Failed requests are retried on next user interaction
- No automatic polling to avoid excessive RPC calls

### Console Logging

All errors are logged to browser console with:
- Error type and category
- Failed operation details
- Contract call parameters
- Full error stack trace
- Timestamp

## Testing Strategy

### Dual Testing Approach

The transparency page requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific UI states (loading, empty, error)
- User interactions (filter clicks, refresh button)
- Edge cases (no projects, all projects filtered out)
- Integration with routing and navigation
- Accessibility features (ARIA labels, keyboard navigation)
- Responsive design breakpoints

**Property-Based Tests** focus on:
- Calculation accuracy across all possible project sets
- Filter correctness for any status combination
- Data consistency for any contract state
- Error resilience for any failure scenario
- Formatting consistency for any monetary value

### Property-Based Testing Configuration

**Library**: Use `@fast-check/jest` for JavaScript property-based testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with: `Feature: public-transparency-page, Property {number}: {property_text}`
- Generators for: projects, statuses, monetary amounts, error conditions

**Example Property Test Structure**:
```javascript
// Feature: public-transparency-page, Property 1: Total funds calculation accuracy
test('total funds equals sum of aportado', () => {
  fc.assert(
    fc.property(
      fc.array(projectGenerator()),
      (projects) => {
        const displayed = calculateTotalFunds(projects);
        const expected = projects.reduce((sum, p) => sum + p.aportado, 0n);
        expect(displayed).toBe(expected);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Focus Areas

**Component Rendering**:
- Transparencia component mounts without errors
- All sub-components render correctly
- Loading states display appropriate indicators
- Empty states show correct messages

**User Interactions**:
- Filter buttons change active filter
- Refresh button triggers data reload
- Navigation link routes to correct path
- Language toggle updates all text

**Data Display**:
- Statistics show correct values for known data
- Project cards display all required fields
- Progress bars reflect correct percentages
- Status badges show correct colors/icons

**Error Scenarios**:
- Network failure shows error message
- Contract error displays fallback UI
- Invalid project data is skipped
- Timeout shows timeout message

**Accessibility**:
- All interactive elements have ARIA labels
- Keyboard navigation works correctly
- Color contrast meets WCAG AA standards
- Screen reader announcements are appropriate

**Responsive Design**:
- Layout adapts to mobile screens
- Touch targets are appropriately sized
- Horizontal scrolling is prevented
- Content remains readable at all breakpoints

### Integration Testing

**Routing Integration**:
- `/transparencia` route renders Transparencia component
- Navigation link navigates to correct route
- Browser back button works correctly
- Direct URL access works

**Contract Integration**:
- `obtenerTodosLosProyectos()` is called on mount
- `calcularYieldDetallado()` is called for each project
- Data is correctly transformed for display
- Errors from contract layer are handled

**i18n Integration**:
- All text uses translation keys
- Language changes update all content
- Number formatting respects locale
- Missing translations show keys (not blank)

**Caching Integration**:
- Data is cached for 30 seconds
- Cached data is served immediately
- Cache is cleared on manual refresh
- Cache expiration triggers new fetch

### Test Data Generators

**Project Generator**:
```javascript
const projectGenerator = () => fc.record({
  id: fc.nat(),
  dueno: fc.hexaString({ minLength: 56, maxLength: 56 }),
  nombre: fc.string({ minLength: 1, maxLength: 100 }),
  meta: fc.bigInt({ min: 1n, max: 1000000000000n }),
  aportado: fc.bigInt({ min: 0n, max: 1000000000000n }),
  yield_entregado: fc.bigInt({ min: 0n }),
  estado: fc.constantFrom(
    "EtapaInicial", "EnProgreso", "Liberado", 
    "Abandonado", "EnRevision", "Rechazado"
  ),
  timestamp_inicio: fc.nat(),
  capital_en_cetes: fc.bigInt({ min: 0n }),
  capital_en_amm: fc.bigInt({ min: 0n }),
  yield_cetes_acumulado: fc.bigInt({ min: 0n }),
  yield_amm_acumulado: fc.bigInt({ min: 0n }),
  doc_hash: fc.option(fc.string(), { nil: null }),
  motivo_rechazo: fc.string()
});
```

**Public Project Generator**:
```javascript
const publicProjectGenerator = () => 
  projectGenerator().filter(p => 
    ["EtapaInicial", "EnProgreso", "Liberado", "Abandonado"]
      .includes(p.estado)
  );
```

### Coverage Goals

- **Line Coverage**: Minimum 90%
- **Branch Coverage**: Minimum 85%
- **Function Coverage**: 100%
- **Property Coverage**: 100% (all 10 properties tested)

### Continuous Integration

All tests must pass before merging:
- Unit tests run on every commit
- Property tests run on every pull request
- Integration tests run on staging deployment
- Accessibility tests run weekly

## Implementation Notes

### Performance Considerations

**Parallel Data Fetching**:
```javascript
const [proyectos, yields] = await Promise.all([
  obtenerTodosLosProyectos(),
  // Fetch yields in parallel after getting project IDs
]);
```

**Memoization**:
- Memoize statistics calculations to avoid recomputation
- Memoize filtered project lists
- Use React.memo for sub-components

**Lazy Loading**:
- Consider virtualizing project list if >100 projects
- Load project details on-demand if needed
- Defer non-critical data (yield details) until visible

### Caching Implementation

```javascript
const CACHE_TTL = 30000; // 30 seconds

const cache = {
  data: null,
  timestamp: 0,
  isValid() {
    return this.data && (Date.now() - this.timestamp) < CACHE_TTL;
  },
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
  },
  clear() {
    this.data = null;
    this.timestamp = 0;
  }
};
```

### Accessibility Implementation

**Semantic HTML**:
```jsx
<main aria-label="Transparency page">
  <section aria-labelledby="stats-heading">
    <h2 id="stats-heading">Platform Statistics</h2>
    {/* stats content */}
  </section>
  
  <section aria-labelledby="projects-heading">
    <h2 id="projects-heading">Projects</h2>
    {/* projects list */}
  </section>
</main>
```

**ARIA Labels**:
- Filter buttons: `aria-label="Filter by {status}"`
- Refresh button: `aria-label="Refresh data"`
- Project cards: `aria-label="Project: {name}"`
- Progress bars: `aria-valuenow`, `aria-valuemin`, `aria-valuemax`

**Keyboard Navigation**:
- All interactive elements focusable
- Logical tab order
- Enter/Space activate buttons
- Escape closes modals (if any)

### Responsive Design Breakpoints

- **Desktop**: 1024px+ (3-column grid)
- **Tablet**: 768px-1023px (2-column grid)
- **Mobile**: <768px (1-column grid, stacked stats)

### Translation Keys Structure

```json
{
  "transparencia": {
    "title": "Transparencia",
    "subtitle": "Datos en tiempo real desde la blockchain",
    "stats": {
      "totalProjects": "Total de proyectos",
      "totalLocked": "Total bloqueado",
      "totalYield": "Yield generado",
      "byStatus": "Por estado"
    },
    "filters": {
      "all": "Todos",
      "initial": "Etapa inicial",
      "progress": "En progreso",
      "released": "Liberado",
      "abandoned": "Abandonado"
    },
    "project": {
      "funding": "Financiamiento",
      "goal": "Meta",
      "progress": "Progreso",
      "status": "Estado"
    },
    "empty": {
      "noProjects": "No hay proyectos públicos",
      "noResults": "No hay proyectos con este estado"
    },
    "loading": "Cargando datos...",
    "refresh": "Actualizar",
    "lastUpdate": "Última actualización",
    "errors": {
      "network": "Error de conexión. Verifica tu red e intenta de nuevo.",
      "contract": "Error al cargar datos del contrato. Actualiza la página.",
      "data": "Algunos proyectos no se pudieron cargar.",
      "timeout": "La carga está tardando más de lo esperado. Haz clic en actualizar."
    }
  }
}
```

## Security Considerations

### Read-Only Access

- No wallet connection required eliminates authentication vulnerabilities
- Dummy account for simulations has no funds or permissions
- All contract calls are read-only simulations (no state changes)

### Data Validation

- Validate all data received from contract before display
- Sanitize project names and descriptions to prevent XSS
- Validate BigInt values to prevent overflow errors
- Check for null/undefined before accessing nested properties

### Rate Limiting

- Client-side caching reduces RPC call frequency
- No automatic polling prevents excessive requests
- Manual refresh has cooldown period (prevent spam)

### Privacy

- No user data collected or stored
- No analytics or tracking on transparency page
- No cookies or local storage used
- All data is public blockchain data

## Future Enhancements

### Phase 2 Features

1. **Historical Data**: Show platform statistics over time (charts)
2. **Project Search**: Full-text search across project names/descriptions
3. **Export Data**: Download statistics as CSV/JSON
4. **RSS Feed**: Subscribe to new projects
5. **Embed Widget**: Embeddable transparency stats for external sites

### Performance Optimizations

1. **GraphQL API**: Replace direct contract calls with indexed API
2. **WebSocket Updates**: Real-time updates without polling
3. **Service Worker**: Offline support with cached data
4. **CDN Caching**: Cache static project data at edge

### Analytics (Privacy-Preserving)

1. **Page Views**: Track transparency page visits (no user identification)
2. **Popular Filters**: Which statuses are most viewed
3. **Load Times**: Monitor performance metrics
4. **Error Rates**: Track contract call failures

## Appendix: Contract Functions Reference

### obtenerTodosLosProyectos()

**Purpose**: Retrieves all projects from the smart contract

**Returns**: `Promise<Array<Project>>`

**Error Handling**: Returns empty array on failure

**Usage**:
```javascript
const proyectos = await obtenerTodosLosProyectos();
```

### calcularYieldDetallado(idProyecto)

**Purpose**: Calculates detailed yield breakdown for a project

**Parameters**:
- `idProyecto: number` - Project ID

**Returns**: `Promise<{ cetes: bigint, amm: bigint, total: bigint }>`

**Error Handling**: Returns zeros on failure

**Usage**:
```javascript
const yield = await calcularYieldDetallado(projectId);
```

### stroopsAMXNe(stroops)

**Purpose**: Formats stroops to MXNe with locale formatting

**Parameters**:
- `stroops: bigint` - Amount in stroops (1 MXNe = 10,000,000 stroops)

**Returns**: `string` - Formatted string like "1,234.56 MXNe"

**Usage**:
```javascript
const formatted = stroopsAMXNe(BigInt(12345670000));
// Returns: "1,234.57 MXNe"
```

## Appendix: Component API

### Transparencia Component

**Props**: None (standalone page component)

**State**:
```typescript
{
  proyectos: Project[],
  cargando: boolean,
  error: string | null,
  filtro: string,
  stats: Statistics,
  ultimaActualizacion: Date,
  cache: CacheEntry
}
```

**Methods**:
- `cargarDatos(): Promise<void>` - Fetches all data
- `aplicarFiltro(estado: string): void` - Filters projects
- `refrescarDatos(): Promise<void>` - Clears cache and reloads
- `calcularEstadisticas(proyectos: Project[]): Statistics` - Aggregates stats

**Lifecycle**:
1. Mount → Load data from cache or fetch
2. Update → Recalculate filtered projects
3. Unmount → No cleanup needed (no subscriptions)

### TransparenciaStats Component

**Props**:
```typescript
{
  totalProyectos: number,
  totalBloqueado: bigint,
  totalYield: bigint,
  porEstado: Map<string, number>,
  cargando: boolean
}
```

**Rendering**: Stats bar with 4 main metrics + status breakdown

### TransparenciaFilters Component

**Props**:
```typescript
{
  filtroActivo: string,
  onCambiarFiltro: (filtro: string) => void,
  contadores: Map<string, number>
}
```

**Rendering**: Row of filter buttons with active state

### TransparenciaProjectList Component

**Props**:
```typescript
{
  proyectos: Project[],
  cargando: boolean,
  filtroActivo: string
}
```

**Rendering**: Grid of project cards or empty state

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Status**: Ready for Implementation
