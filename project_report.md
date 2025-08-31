Based on the project structure and files reviewed, here are the extracted rules for the frontend and backend of the real estate project:

---

### **Frontend Rules**

1. **Project Structure**:
   - The frontend is built with Next.js (App Router).
   - Key directories:
     - `app/`: Contains the main application pages and layouts.
     - `components/`: Reusable UI components (e.g., forms, cards).
     - `features/`: Feature-specific logic (e.g., auth, properties).
     - `hooks/`: Custom hooks (e.g., `useRemainingTimer`, `useSetRetryTimer`).
     - `lib/`: Utilities (e.g., Redis client, validation helpers).
     - `store/`: State management (Jotai atoms).

2. **Authentication**:
   - Uses `next-auth` for session management.
   - Middleware (`middleware.ts`) protects routes and handles redirects.
   - Supports email/password, OTP, and 2FA flows.
   - Public routes are defined in `PUBLIC_ROUTES`.

3. **State Management**:
   - Uses `jotai` for global state (e.g., auth state, project data).
   - Example atoms:
     - `authAtom`: Tracks OTP verification status.
     - `selectedProjectAtom`: Stores the currently selected project.

4. **Forms and Validation**:
   - Uses `react-hook-form` with `zod` for schema validation.
   - Example: `signUpFormSchema` enforces password strength and email validation.

5. **UI Components**:
   - Uses `shadcn/ui` for pre-styled components (e.g., buttons, forms).
   - Custom components (e.g., `PasswordInput`, `InputOTP`) are built on top of Radix primitives.

6. **API Client**:
   - Uses `@tanstack/react-query` for data fetching and mutations.
   - Example: `useMutation` for OTP resend logic.

7. **Styling**:
   - Uses Tailwind CSS with custom themes (light/dark mode).
   - Global styles are defined in `globals.css`.

8. **Routing**:
   - Dynamic routes (e.g., `/properties/[id]`) are handled by Next.js.
   - Redirects are managed in middleware.

---

### **Backend Rules**

1. **Project Structure**:
   - The backend is a Django REST API.
   - Key directories:
     - `accounts/`: User authentication and profiles.
     - `properties/`: Property, project, and unit management.
     - `company/`: Company and branch management.
     - `documents/`: File uploads and media handling.
     - `utils/`: Middleware and exception handlers.

2. **Authentication**:
   - Uses `djangorestframework-simplejwt` for JWT authentication.
   - Supports 2FA via `django-otp` and `django-two-factor-auth`.
   - Custom user model: `accounts.Users`.

3. **Database Models**:
   - PostgreSQL with PostGIS for geospatial data.
   - Key models:
     - `Property`, `Project`, `Unit`, `Floor`, `Room` (with geolocation fields).
     - `Company`, `Branch`, `Owner` for organizational hierarchy.
     - `Media` for file uploads (stored in MinIO).

4. **API Endpoints**:
   - RESTful endpoints (e.g., `/api/v1/properties/`).
   - Uses DRF serializers and viewsets.
   - OpenAPI schema generated via `drf-spectacular`.

5. **File Storage**:
   - Uses `django-minio-storage` for MinIO integration.
   - Files are compressed (images, PDFs, videos) before storage.

6. **Rate Limiting**:
   - Uses `django-ratelimit` with Redis for caching.
   - Configurable rates (e.g., `100/day` for anonymous users).

7. **Middleware**:
   - Custom middleware (e.g., `IPBlockMiddleware`) for IP blocking.
   - CORS headers are managed via `django-cors-headers`.

8. **Background Tasks**:
   - Uses `celery` for async tasks (e.g., email notifications).

9. **Validation**:
   - Custom validators (e.g., `validate_media` for file uploads).
   - Field-level validation in serializers.

---

### **Summary of Key Rules**

| **Category**       | **Frontend**                                                                 | **Backend**                                                                 |
|--------------------|------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| **Auth**           | NextAuth, OTP flows, JWT storage                                            | DRF SimpleJWT, 2FA, custom user model                                      |
| **State**          | Jotai atoms, React Query                                                    | Django ORM, Redis caching                                                  |
| **Forms/Validation** | React Hook Form + Zod                                                     | Django validators, DRF serializers                                         |
| **UI**             | shadcn/ui, Tailwind CSS                                                     | DRF browsable API (disabled in production)                                 |
| **Storage**        | LocalStorage for tokens                                                     | MinIO for media, PostgreSQL for data                                       |
| **Rate Limiting**  | Client-side retry logic                                                     | Django Ratelimit + Redis                                                   |
| **Geospatial**     | React Map GL for maps                                                       | PostGIS for geolocation queries                                            |

These rules ensure consistency and maintainability across the frontend and backend. Let me know if you'd like me to elaborate on any specific area!
