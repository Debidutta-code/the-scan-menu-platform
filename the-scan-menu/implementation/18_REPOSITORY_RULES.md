# Repository Rules

These are hard rules for contributing to TheScanMenu. Violations will result in rejected pull requests or failed CI/CD pipelines.

## 1. Architectural Rules
*   **No Business Logic in Controllers**: Express route handlers/controllers must only parse requests, check auth/validation, call services, and return the standard envelope.
*   **No Business Logic in UI Components**: React components handle rendering and UI state. Data fetching and mutation logic must reside in Hooks or Services.
*   **Always Multi-Tenant**: Every feature interacting with operational data (Orders, Menus, Tables) must include and validate against a `restaurantId`.

## 2. API & Data Rules
*   **Standard Envelope Required**: All API responses must follow the strict `{ success: boolean, data?: any, error?: { code, message }, message?: string }` format.
*   **Document Endpoints**: Every new or modified endpoint must be immediately documented (e.g., in `docs/API.md` or Swagger if implemented).
*   **Zod Validation**: All incoming request payloads (body, query) must be validated using Zod schemas at the route level before reaching the controller.
*   **Soft Deletes**: Use `isArchived` flags for master data (Tables, MenuItems) instead of hard deletions to maintain historical order integrity.

## 3. Development Rules
*   **No Mock Data in Production Code**: Do not commit fake data, bypassed auth checks, or hardcoded IDs to the main branch.
*   **Linter Cleanliness**: The codebase must compile cleanly. `npm run lint` must return zero warnings and zero errors.
*   **Testing Requirement**: Critical business logic (especially state machines for Orders and Sessions) must have accompanying Vitest coverage.

## 4. UI/UX Rules
*   **Design System Adherence**: Use the predefined Tailwind type scales, color palettes (Primary, Accent, Surface), and Framer Motion easing curves (`cubic-bezier(0.16, 1, 0.3, 1)`).
*   **Lucide React**: Only use Lucide React for icons, maintaining a default `strokeWidth={1.75}`.
*   **No Layout Flash**: Use loaders or optimistic UI to prevent layout shifts while waiting for API responses.

## 5. Security Rules
*   **Never Expose Secrets**: JWT secrets, Database URIs, and external API keys must never leak to the client bundle.
*   **Rate Limiting**: Apply Express rate limiters to any new public or high-risk endpoints.
