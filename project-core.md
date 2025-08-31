# Project Core Specification (Enhanced)

## 1. Introduction  

A unified specification of backend and frontend architecture, conventions, and key features for the Real-Estate application. Serves as the single source of truth for developers, QA, and DevOps.

## 2. Scope  

- **Backend**: Django-based REST API with geospatial support, caching, async tasks, modular apps, multi-tenant support, and comprehensive business logic.  
- **Frontend**: Next.js 15.3.1 App Router with React 19, TypeScript, TailwindCSS 4.x, Shadcn/UI, feature-based organization, SEO, and PWA capabilities.

## 3. High-Level Architecture

### 3.1 Backend (`server/`)  

- **Apps**:  
  - `accounts`: User, role & permission management, social login  
  - `agents`: Agent profiles, ratings, availability calendar  
  - `company`: Multi-company & branch support, billing settings  
  - `properties`: Listings, taxonomy (types, features, tags)  
  - `units`: Individual sub-units, floor plans, availability  
  - `leases`: Lease contracts, renewals, e-signatures  
  - `payments`: Invoices, deposits, recurring rent, refunds  
  - `crm`: Leads, inquiries, follow-ups, activity log  
  - `notifications`: Email, SMS, push notifications, templates  
  - `analytics`: Usage & performance metrics, dashboards  
  - `documents`: Upload, versioning, signing workflows  
  - `search`: Advanced filters, saved searches, autocomplete  
  - `utils`: Shared models, mixins, helpers, pagination, auditing  

- **Settings & Entry Points (`src/`)**  
  - `settings/`: `base.py`, `dev.py`, `prod.py`  
  - `urls.py`, `routes.py` (global router)  
  - `middlewares.py`: IP blocking, tenant resolution, security headers  
  - `storage_backends.py`: MinIO/S3, thumbnail processors  

### 3.2 Frontend (root)  

- **Routes (`app/`)**  
  - `(auth)`: Sign-in/up, social login, OTP, password reset  
  - `(dashboard)`: Admin/agent dashboards, analytics pages  
  - `properties/`: Listing grid, detail pages, map view  
  - `clients/`: Tenant & owner portals, saved properties  
  - `crm/`: Lead management, messaging center  
  - `finance/`: Rent collection, billing history, payment methods  
  - `reports/`: Custom reports and exports  
  - `settings/`: Profile, company settings, notification preferences  

- **Other Folders**  
  - `components/`: Reusable UI & Shadcn/UI primitives  
  - `features/`: Domain-specific widgets (DataTable, Charts)  
  - `actions/`: Next.js Server Actions for mutations  
  - `schema/`: Zod schemas for forms and API contracts  
  - `store/`: Jotai atoms for global state  
  - `hooks/`: Custom React hooks (auth, forms, maps)  
  - `lib/`: API client, utilities, map integrations  
  - `public/`: Static assets, sitemap.xml, robots.txt  
  - `styles/`: Tailwind config, `globals.css`, theming  
  - `tests/`: Jest unit tests and Playwright E2E scenarios  

## 4. Backend Architecture

### 4.1 App Structure & Conventions  

- Standard file layout (`models.py`, `serializers.py`, `views.py`, `routes.py`, `tasks.py`, `signals.py`, `permissions.py`, `tests.py`).  
- Domain events via Django signals; audit trail on critical models.  
- Tenant-aware querysets for multi-company isolation.

### 4.2 API Patterns  

- DRF ViewSets & routers; generic classes (`ListModelMixin`, `CreateModelMixin`, etc.)  
- Method names: `list()`, `retrieve()`, `create()`, `update()`, `partial_update()`, `destroy()`  
- Decorators: `@extend_schema`, `@method_decorator(ratelimit)`, `@action` for custom endpoints  
- Pagination: cursor-based or offset with default 20 items/page  

### 4.3 Data Models (Core)  

- **User**: roles (admin, agent, owner, tenant), profile, two-factor settings  
- **Company**: name, plan, billing info, timezone, currency  
- **Agent**: user FK, license, bio, rating, regions  
- **Property**: title, description, price, status, type, features, tags, address, location(Point)  
- **Unit**: property FK, unit number, floor, size, bedrooms, bathrooms, status  
- **Lease**: unit FK, tenant FK, start/end dates, rent amount, deposit, status  
- **Payment**: lease FK, amount, method, status, invoice PDF  
- **Lead**: property FK, contact info, source, status, notes  
- **Notification**: user FK, type, payload, sent_at, read_at  
- **Document**: content type, object FK, file path, version, signed_flag  
- **AnalyticsEntry**: model, action, user FK, timestamp  

### 4.4 Search & Filtering  

- Elasticsearch or PostgreSQL full-text search with weighted fields  
- Faceted filters: price range, bedrooms, bathrooms, area, features  
- Autosuggest & geospatial radius/bounding-box queries  
- Saved searches with user notifications on new matches

### 4.5 Caching & Rate Limiting  

- Redis DB1: response caching with key patterns; DB2: rate limits  
- Cache invalidation on write operations via signals  
- Throttling: anonymous (50/day), authenticated (500/day), elevated roles exempt

### 4.6 Asynchronous Tasks  

- Celery tasks: email/SMS sending, report generation, geocoding, thumbnailing  
- Retry policies, task timeouts, versioned task names

### 4.7 Media & Geospatial  

- MinIO/S3 backend: originals + multiple thumbnail sizes  
- PostGIS integration for spatial indexing and queries  
- GeoJSON endpoints for map overlays and heatmaps

### 4.8 Security & Compliance  

- JWT with refresh tokens, optional session blacklisting  
- OWASP headers (CSP, HSTS), strict CORS  
- Input sanitization on both ends; JSON schema validation  
- GDPR-compliant data exports & erasure endpoints

### 4.9 Monitoring & Logging  

- Structured JSON logs: user, request_id, latency, status  
- Error tracking: Sentry  
- Metrics: Prometheus + Grafana dashboards, alerts on anomalies



## 5. Frontend Architecture

### 5.1 UI & Theming  

- TailwindCSS utility classes; theme tokens in `globals.css`  
- Light/dark mode toggling via context/provider  
- Responsive breakpoints and mobile-first design  

### 5.2 Components & Patterns  

- Atomic design: `atoms/`, `molecules/`, `organisms/` under `components/ui/`  
- DataTable: sortable, paginated, filterable, selectable  
- Chart widgets: line, bar, pie via Recharts or Chart.js wrapper  

### 5.3 State & Data Fetching  

- Jotai atoms for auth, user profile, global settings  
- Next.js Server Actions for mutations; `use` hooks for queries  
- SWR for cache-first client fetching where needed  

### 5.4 Forms & Validation  

- React Hook Form + Zod for schema-driven forms  
- Wizard/stepper forms for complex flows (company setup, lease creation)  
- Inline and summary error display  

### 5.5 Maps & Media  

- Mapbox GL JS: markers, clustering, drawing tools  
- Image galleries with lightbox, lazy loading, drag-and-drop upload  

### 5.6 Notifications & Chat  

- In-app toast/snackbar system for real-time events via WebSockets  
- Agent-client chat module with message history and typing indicators  

### 5.7 SEO & Performance  

- Dynamic metadata and Open Graph tags per route  
- Sitemap.xml and robots.txt generation  
- PWA support (service worker, manifest)  
- Code splitting, dynamic imports, image optimization  

### 5.8 Testing  

- Jest + React Testing Library for unit/component tests  
- Playwright E2E for critical user journeys (auth, listing search, checkout)  
- Accessibility audits with axe-core

## 6. CI/CD & DevOps

### 6.1 Development Environment  

- PDM for Python; Bun (or pnpm) for Node.js  
- Docker Compose: `db`, `redis`, `minio`, `server`, `app`  

### 6.2 CI Pipeline  

- Pre-commit: Black, isort, ESLint, Prettier, typescript checks  
- GitHub Actions: lint → typecheck → tests → build → security scan  

### 6.3 Deployment  

- Staging and production on Kubernetes or Docker Swarm  
- Blue/green or canary deployments  
- Automated DB migrations and seed data  
- CDN (CloudFront, Cloudflare) for static assets  

### 6.4 Observability  

- Centralized logs (ELK Stack)  
- Metrics & tracing (Prometheus, Jaeger)  
- Alerting on error spikes, high latency, and resource exhaustion  

## 7. Business & UX Features

### 7.1 Multi-Language & Locale  

- i18n support for UI strings, dates, currencies  
- RTL language compatibility  

### 7.2 Multi-Currency & Pricing Plans  

- Display prices in user’s currency; conversion via external API  
- Tiered subscription plans for agencies  

### 7.3 Marketing & SEO  

- Schema.org structured data for properties  
- Automated email campaigns (new listings, price drops)  
- Social sharing integrations  

### 7.4 Analytics & Reporting  

- Agent performance dashboard (listings, leads, conversions)  
- Company revenue reports and export to CSV/PDF  
- User engagement metrics (page views, search trends)

