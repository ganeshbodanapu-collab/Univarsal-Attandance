# STEP 14 — Sites & Sections Supabase Data Integration Report

## 1. Existing Sites Architecture
The Sites module manages construction worksite locations across the application. Previously, sites were initialized from `mockSites` in `src/data/mock/sites.ts` and saved to `localStorage` under `univarsal_sites_data`. State management was handled centrally via `AttendanceContext.tsx`.

## 2. Existing Sections Architecture
The Sections module manages specific trade/work departments within each site. Sections were initialized from `mockSections` in `src/data/mock/sections.ts` and persisted in `localStorage` under `univarsal_sections_data`. Each section references its parent site via `siteId`.

## 3. Database Schema Used
Canonical database schema from `0002_core_tables.sql`:

### `public.sites`
- `id` (TEXT PRIMARY KEY)
- `code` (TEXT UNIQUE NOT NULL)
- `name` (TEXT NOT NULL)
- `location` (TEXT NOT NULL)
- `in_charge` (TEXT NOT NULL)
- `mobile` (TEXT NOT NULL)
- `address` (TEXT)
- `status` (`site_status` ENUM, DEFAULT 'active')
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

### `public.sections`
- `id` (TEXT PRIMARY KEY)
- `code` (TEXT NOT NULL)
- `name` (TEXT NOT NULL)
- `site_id` (TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE)
- `in_charge` (TEXT NOT NULL)
- `mobile` (TEXT NOT NULL)
- `status` (`section_status` ENUM, DEFAULT 'active')
- `remarks` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `CONSTRAINT uq_site_section_code UNIQUE(site_id, code)`

## 4. Files Created
1. [`src/lib/data/sites.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/sites.ts): Data service layer for `public.sites` with `DBSite` interface, mapping functions, and CRUD helper methods.
2. [`src/lib/data/sections.ts`](file:///d:/Univarsal%20Attandance/worker-management-system/src/lib/data/sections.ts): Data service layer for `public.sections` with `DBSection` interface, mapping functions, site filtering, and CRUD helper methods.

## 5. Files Modified
1. [`src/context/AttendanceContext.tsx`](file:///d:/Univarsal%20Attandance/worker-management-system/src/context/AttendanceContext.tsx): Wired `sitesDataService` and `sectionsDataService` into state loading and CRUD operations (`addSite`, `updateSite`, `deleteSite`, `toggleSiteStatus`, `addSection`, `updateSection`, `deleteSection`, `toggleSectionStatus`).

## 6. Supabase Service Functions

### Sites Service (`sitesDataService`):
- `listSites()`: Selects all records from `public.sites`.
- `getSite(id)`: Selects a single site by `id`.
- `createSite(data)`: Inserts a new site into `public.sites`.
- `updateSite(id, data)`: Updates site fields by `id`.
- `deleteSite(id)`: Deletes site record by `id`.

### Sections Service (`sectionsDataService`):
- `listSections()`: Selects all records from `public.sections`.
- `listSectionsBySite(siteId)`: Selects sections filtered by `site_id`.
- `getSection(id)`: Selects a single section by `id`.
- `createSection(data)`: Inserts a new section into `public.sections`.
- `updateSection(id, data)`: Updates section fields by `id`.
- `deleteSection(id)`: Deletes section record by `id`.

## 7. Site CRUD Integration
All Site CRUD operations in `AttendanceContext.tsx` trigger `sitesDataService` methods while maintaining local state sync:
- `addSite`: Executes `sitesDataService.createSite()`.
- `updateSite`: Executes `sitesDataService.updateSite()`.
- `deleteSite`: Executes `sitesDataService.deleteSite()`.
- `toggleSiteStatus`: Toggles status between `'active'` and `'inactive'` and executes `sitesDataService.updateSite()`.

## 8. Section CRUD Integration
All Section CRUD operations in `AttendanceContext.tsx` trigger `sectionsDataService` methods while maintaining local state sync:
- `addSection`: Executes `sectionsDataService.createSection()`.
- `updateSection`: Executes `sectionsDataService.updateSection()`.
- `deleteSection`: Executes `sectionsDataService.deleteSection()`.
- `toggleSectionStatus`: Toggles status between `'active'` and `'inactive'` and executes `sectionsDataService.updateSection()`.

## 9. Site → Section Relationship
- Maintained database FK constraint: `sections.site_id` → `sites.id`.
- UI drill-down filtering uses `listSectionsBySite(siteId)` and `section.siteId === selectedSite.id`.
- Deleting a site cascades local section cleanup in tandem with database foreign key cascade settings.

## 10. RLS Behavior
- All Supabase requests execute via the authenticated `supabase` client.
- Database access policies defined in `0008_rls_policies.sql` enforce:
  - System Admin: Full read/write access across all sites and sections.
  - Supervisor: Read/write access scoped to assigned site/section.
- No service-role key or frontend bypass mechanisms are used.

## 11. Authentication Dependency
- Data access requires an active Supabase session.
- Unauthenticated requests are rejected by Supabase RLS policies.

## 12. Mock/localStorage Data Handling
- Local storage and mock fallback data remain active so that offline work and unmigrated modules continue working while remote migration is pending.
- Non-empty Supabase reads automatically populate local state.

## 13. Unmigrated Modules
The following modules remain untouched and operational:
- Workers
- Attendance & Audits
- Advances & Recoveries
- Payments & Monthly Settlements
- Food/Canteen Orders
- Referrers & Commission Requests
- Site Migrations

## 14. Error Handling
- Supabase operation responses return `{ data, error }` or `{ success, error }`.
- Service calls in `AttendanceContext.tsx` log descriptive warnings on unexpected network or database errors without crashing the UI.

## 15. Build Verification
- Command: `npm run build`
- Result: **0 errors**, build succeeded in 4.52s.

## 16. Remote Database Status
- Remote database (`gkphikhsgysoqjradbaz`) remains unpushed as per project constraints.
- No remote SQL executed, no `supabase db push` executed, no seed data inserted.
