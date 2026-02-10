# RMR Gap Analysis: rmr_current vs rmr_revamp

> Generated: 2026-02-09
> Legacy: CakePHP 2.x (`rmr_current`)
> New: Rust/Axum + Next.js 16 (`rmr_revamp`)

---

## Executive Summary

The revamp has strong coverage of **core entity management** (CRUD, search, similarity, merge, dedup) and introduces significant **new capabilities** not in the legacy app (background duplicate scanning, two-stage similarity pipeline, entity transfers, action logging, SSE job streaming). However, several **major subsystems** from the legacy app are missing or incomplete, most notably the **chart system**, **subscription/billing**, **articles/reviews CMS**, **email notifications**, and **radio playlist management**.

### Coverage Overview

| Area | Status |
|------|--------|
| Entity CRUD (bands, albums, songs, labels) | Complete |
| Radio Station CRUD | Complete |
| Staff Member CRUD | Complete |
| Similarity/Dedup Detection | Complete (superior to legacy) |
| Entity Merging | Complete |
| Entity Transfers | Complete (new feature) |
| Staff Playlists | Complete |
| Charts & Rankings | Not Started |
| Articles & Reviews CMS | Not Started |
| User Registration & Auth Flow | Partial |
| Subscription/Billing (Recurly) | Not Started |
| Email Notifications | Not Started |
| Radio Playlists | Not Started |
| Advertisement Management | Not Started |

---

## 1. CRITICAL GAPS (Core Business Features)

### 1.1 Chart System
**Legacy**: Full chart generation, display, and management system
**Revamp**: Has a `/charts` page shell but no backend logic

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Weekly chart generation | `generate_weekly_charts()` | Missing | HIGH |
| Monthly chart generation | `generate_monthly_charts()` | Missing | HIGH |
| Cumulative/total charts | `total_song_stats()`, `total_album_stats()` | Missing | HIGH |
| Chart display/viewing | `ChartsController::view()` | Page shell only | HIGH |
| Chart preview/test | `view_test()` | Missing | MEDIUM |
| Print-friendly charts | `print_chart()` | Missing | MEDIUM |
| Cashbox report | `cashbox()` | Missing | MEDIUM |
| Number ones (#1 rankings) | `number_ones()` | Missing | LOW |
| Chart ad rotation | `ad_changer()` | Missing | LOW |
| Chart finalization checks | `check_finalised()` | Missing | HIGH |
| Radio spin compilation | `compile_radio_spins()` | Missing | HIGH |
| Playlist archival (weekly) | `archive_playlists()` | Missing | HIGH |
| Week ending calendar management | `WeekEnding` model + UI | Model exists, no UI | MEDIUM |
| Chart Functions config | `ChartFunction` model + admin | Models exist, no admin | MEDIUM |

**Impact**: This is the core product feature. Charts drive the business value of RMR.

---

### 1.2 Radio Playlist Management
**Legacy**: Full radio playlist lifecycle (create, edit, upload, archive)
**Revamp**: Has models but no API endpoints or UI for radio playlists

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| View radio playlists | `RadioPlaylistArchivesController` | Missing | HIGH |
| Edit radio playlists | Edit playlist entries | Missing | HIGH |
| Upload compiled playlist | `upload_playlist()` | Missing | HIGH |
| Upload uncompiled playlist | `upload_uncompiled_playlist()` | Missing | HIGH |
| Line-by-line upload API | `upload_playlist_line()` | Missing | HIGH |
| Import RMR spins | `import_rmr_spins()` | Missing | MEDIUM |
| Playlist quick check | `playlist_quick_check()` | Missing | MEDIUM |

**Note**: Staff playlists are fully implemented. Radio playlists (station-level) are not.

---

### 1.3 Subscription & Billing (Recurly)
**Legacy**: Full Recurly v3 SDK integration for subscription management
**Revamp**: No billing system

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Recurly account provisioning | `create_recurly_account()` | Missing | HIGH |
| Subscription creation | `create_recurly_subscription()` | Missing | HIGH |
| Upgrade/downgrade plans | `upgrade_recurly_subscription()` | Missing | HIGH |
| Billing info management | `update_billing_info()` | Missing | HIGH |
| Subscription status queries | `get_subscription_status()` | Missing | HIGH |
| Plan types (Free/Silver/Gold/Reporter) | Implemented | Missing | HIGH |
| Feature gating by subscription tier | Implemented | Missing | HIGH |

**Impact**: Revenue-generating feature. Required for production launch.

---

### 1.4 User Authentication & Account Management
**Legacy**: Full auth lifecycle (register, activate, reset, settings)
**Revamp**: Basic login only

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Login | Implemented | Implemented | Done |
| Current user | N/A | Implemented | Done |
| User registration | `register()` | Missing | HIGH |
| Email confirmation/activation | `account()`, `resend_activation()` | Missing | HIGH |
| Password reset (email flow) | `password_reset_form()`, `reset_password()` | Token model exists, no flow | HIGH |
| Change password | `change_password()` | Missing | HIGH |
| Account settings | `settings()` | Missing | MEDIUM |
| User profile editing | Implemented | Missing | MEDIUM |
| Role-specific welcome pages | `administrator_welcome()`, etc. | Missing | LOW |

---

### 1.5 Email Notification System
**Legacy**: Multiple email templates with HTML + text variants
**Revamp**: No email sending capability

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| User confirmation email | Implemented | Missing | HIGH |
| Password reset email | Implemented | Missing | HIGH |
| Contact form auto-reply | Implemented | Missing | MEDIUM |
| Radio station notifications | Implemented | Missing | MEDIUM |
| Account upgrade notification | Implemented | Missing | LOW |
| SMTP configuration | `/app/Config/email.php` | Missing | HIGH |

---

## 2. SIGNIFICANT GAPS (Important Features)

### 2.1 Articles & Reviews CMS
**Legacy**: Full content management with approval workflows
**Revamp**: Models exist but no endpoints or UI

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Article CRUD | Full controller + views | Model only | MEDIUM |
| Article categories | `CategoriesController` | Model only | MEDIUM |
| Article tags | `TagsController` | Model only | MEDIUM |
| Article approval workflow | `rmr_approve()`, `rmr_unapproved()` | Missing | MEDIUM |
| Review CRUD | Full controller + views | Model only | MEDIUM |
| Review approval workflow | Same as articles | Missing | MEDIUM |

---

### 2.2 Advertisement Management
**Legacy**: Full ad management system
**Revamp**: Model exists but no functionality

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Ad CRUD | `AdvertisementsController` | Model only | MEDIUM |
| Ad display/rotation | `ad_changer()` in charts | Missing | MEDIUM |

---

### 2.3 Contact Form
**Legacy**: Contact form with email notification
**Revamp**: Not implemented

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Contact form submission | `ContactController` | Missing | MEDIUM |
| Contact auto-reply email | Implemented | Missing | MEDIUM |

---

### 2.4 Radio Station Application Form
**Legacy**: Public station registration/application
**Revamp**: Not implemented

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Station application form | `RadioStationsController::application()` | Missing | MEDIUM |
| Application processing | Implemented | Missing | MEDIUM |

---

### 2.5 Staff Reporting Features
**Legacy**: Comprehensive reporting status tracking
**Revamp**: Partial

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Check who reported | `check_reported()` | Missing | HIGH |
| Last week reporting status | `check_last_week_reported()` | Missing | HIGH |
| Who reported when | `who_reported_when()` | Missing | MEDIUM |
| Check not reported | `check_not_reported()` | Missing | HIGH |
| Staff spotlight | `set_as_spotlight()` | Missing | LOW |

---

### 2.6 ACL/Permission Admin UI
**Legacy**: Full ACL management console
**Revamp**: Permission tables exist, no admin interface

| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| ACL management console | `AclAdminController` | Missing | MEDIUM |
| Permission assignment UI | Implemented | Missing | MEDIUM |
| Role management | `RolesController` | Table only | MEDIUM |
| Action sync | `rmr_sync_actions()` | Missing | LOW |

---

## 3. MINOR GAPS (Nice-to-Have Features)

### 3.1 iTunes Integration
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Check band/album/song in iTunes | `*_in_itunes()` | Missing | LOW |
| Import from iTunes | `get_itunes_bands()` | Missing | LOW |
| Remove iTunes association | `remove_itunes()` | Missing | LOW |

### 3.2 Google Analytics Integration
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| GA tracking | `GapiComponent` | Missing | LOW |

### 3.3 QR Code Generation
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| QR codes | `QRHelper` | Missing | LOW |

### 3.4 Recaptcha/Bot Protection
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Form bot protection | Recaptcha plugin | Missing | MEDIUM |

### 3.5 Static Pages
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Static content pages | `PagesController` | Missing | LOW |

### 3.6 Autocomplete Optimization
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Dedicated autocomplete endpoints | `AutoCompletesController` | Uses regular list endpoints | LOW |

### 3.7 All Contacts Export
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Station contacts export | `all_contacts()` | Missing | LOW |

### 3.8 Song Ordering Within Albums
| Feature | Legacy | Revamp | Priority |
|---------|--------|--------|----------|
| Reorder tracks | `song_order()` | Missing | LOW |

---

## 4. FEATURES IN REVAMP NOT IN LEGACY (New Capabilities)

These are features the revamp introduces that don't exist in the legacy app:

| Feature | Description |
|---------|-------------|
| **Background Duplicate Scanning** | Automated batch scanning for duplicates across all entity types with configurable thresholds |
| **Two-Stage Similarity Pipeline** | DB narrowing + in-memory scoring (Jaro-Winkler, Sorensen-Dice, Jaccard) |
| **Six Phonetic Algorithms** | Soundex, Metaphone, Double Metaphone (primary + alt) per entity |
| **Entity Transfers** | Move songs between albums/bands, move albums between bands with preview |
| **Merge Preview with Counts** | Server-side breakdown of all related data before merge execution |
| **Action Audit Logging** | Complete trail for merges, transfers, archives, admin edits |
| **Staff Archival** | Archive/unarchive staff members with audit trail |
| **SSE Job Streaming** | Real-time progress updates for background jobs |
| **Data/Chart Status Tracking** | Separate status tracks with full history |
| **Advanced Search Drawers** | Entity-specific advanced filter panels |
| **Column Customization** | User-configurable table columns |
| **OpenAPI Documentation** | Auto-generated API docs via RapiDoc |
| **Type-Safe Full Stack** | Rust backend + TypeScript frontend |
| **Comprehensive Test Suite** | 28 test files, ~7,200 lines, 120+ tests |

---

## 5. MODEL COVERAGE COMPARISON

### Models in Legacy with No Revamp Equivalent
| Legacy Model | Notes |
|--------------|-------|
| `AutoComplete` | Revamp uses regular endpoints |
| `ChartFunctionBak` | Backup table, probably not needed |
| `NewChartFunction` | Variant, may consolidate into ChartFunction |
| `BandChange` | Revamp uses `action_logs` instead |
| `CityPostalCode` | Junction table, may not be needed |
| `Contact` | No contact form in revamp |
| `Itunes`, `ItunesArtist`, `ItunesSongsFlat` | No iTunes integration |
| `RadioSyndicatedStation` | May be covered by `radio_syndicated_details` |

### Models in Revamp with No Legacy Equivalent
| Revamp Model | Notes |
|--------------|-------|
| `action_logs` | New audit trail system |
| `duplicate_scan_state` | Background scan persistence |
| `*_duplicate_candidates` (6 tables) | Automated duplicate detection |
| `band_relationships` | Band-to-band connections |
| `song_artists` | Extended performer tracking |
| `password_reset_tokens` | Secure reset flow |
| `violations`, `users_violations` | User violation tracking |
| `system_notes`, `roles_system_notes` | System-level notes |

---

## 6. FRONTEND PAGE COVERAGE

### Pages in Legacy with No Revamp Equivalent
| Legacy Page | Controller | Priority |
|-------------|-----------|----------|
| Charts view | ChartsController | HIGH |
| Charts cashbox | ChartsController | MEDIUM |
| Charts print | ChartsController | MEDIUM |
| Charts number ones | ChartsController | LOW |
| Articles list/view/edit | ArticlesController | MEDIUM |
| Reviews list/view/edit | ReviewsController | MEDIUM |
| User registration | UsersController | HIGH |
| User settings | UsersController | MEDIUM |
| Subscription management | UsersController | HIGH |
| Contact form | ContactController | MEDIUM |
| Station application | RadioStationsController | MEDIUM |
| ACL admin | AclAdminController | MEDIUM |
| Ad management | AdvertisementsController | MEDIUM |
| Radio playlist upload | StaffPlaylistsController | HIGH |
| Genre/SubGenre admin | GenresController | LOW |
| Category/Tag admin | CategoriesController | LOW |
| City/State/Country admin | LocationControllers | LOW |

### Pages in Revamp with No Legacy Equivalent
| Revamp Page | Description |
|-------------|-------------|
| `/system` | Background job management dashboard |
| `/system/duplicates` | Duplicate scanner with real-time progress |
| `/system/validation/*` | Per-entity validation pages |
| Entity transfer UIs | Move songs/albums between parents |
| Advanced search drawers | Entity-specific filter panels |

---

## 7. API ENDPOINT COVERAGE

### Legacy Endpoints Not in Revamp
| Endpoint Category | Count | Priority |
|-------------------|-------|----------|
| Chart generation & display | ~12 | HIGH |
| Radio playlist CRUD & upload | ~7 | HIGH |
| User registration & account | ~8 | HIGH |
| Subscription/billing (Recurly) | ~6 | HIGH |
| Article CRUD & approval | ~6 | MEDIUM |
| Review CRUD & approval | ~5 | MEDIUM |
| Contact form | ~2 | MEDIUM |
| Station application | ~2 | MEDIUM |
| Staff reporting checks | ~4 | HIGH |
| ACL management | ~3 | MEDIUM |
| Advertisement CRUD | ~4 | MEDIUM |
| iTunes integration | ~6 | LOW |
| Static pages | ~2 | LOW |

### Revamp Endpoints Not in Legacy
| Endpoint Category | Count |
|-------------------|-------|
| Duplicate scanning & management | ~10 |
| Entity transfers (song/album) | ~7 |
| Merge previews (with counts) | ~2 |
| Status tracking & history | ~15 |
| Background job management | ~5 |
| Staff archive/unarchive | ~2 |
| Action logging | ~2 |

---

## 8. RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Authentication & User Management (Required for Production)
1. User registration with email confirmation
2. Password reset email flow
3. Change password
4. Account settings page
5. Email sending infrastructure (SMTP)
6. Recaptcha/bot protection on forms

### Phase 2: Chart System (Core Business Value)
1. Chart generation engine (weekly)
2. Radio spin compilation
3. Playlist archival (weekly snapshot)
4. Chart display pages
5. Chart finalization checks
6. Staff reporting status checks
7. Monthly chart generation
8. Cumulative stats

### Phase 3: Radio Playlists (Required for Chart System)
1. Radio playlist CRUD endpoints
2. Radio playlist upload (compiled)
3. Radio playlist upload (uncompiled)
4. Line-by-line upload API
5. Radio playlist UI pages

### Phase 4: Subscription & Billing
1. Recurly SDK integration
2. Account provisioning
3. Subscription management (create/upgrade/downgrade)
4. Billing info management
5. Feature gating by tier

### Phase 5: Content Management
1. Articles CRUD + approval workflow
2. Reviews CRUD + approval workflow
3. Categories & Tags management
4. Article/Review display pages

### Phase 6: Admin & Misc
1. ACL management UI
2. Advertisement management
3. Contact form
4. Station application form
5. Static pages

### Phase 7: Nice-to-Haves
1. iTunes integration (evaluate if still needed)
2. Print-friendly charts
3. Cashbox reports
4. Number ones display
5. QR code generation
6. Google Analytics
7. Contacts export

---

## 9. EFFORT ESTIMATES

| Phase | Estimated Scope | Dependencies |
|-------|-----------------|--------------|
| Phase 1: Auth & Users | ~15-20 endpoints, 5-8 pages | Email infrastructure |
| Phase 2: Charts | ~15 endpoints, 5-6 pages | Phase 3 (radio playlists) |
| Phase 3: Radio Playlists | ~8 endpoints, 3-4 pages | None |
| Phase 4: Billing | ~8 endpoints, 3-4 pages | Recurly SDK, Phase 1 |
| Phase 5: Content | ~12 endpoints, 6-8 pages | Phase 1 (auth for approval) |
| Phase 6: Admin | ~10 endpoints, 4-5 pages | Phase 1 |
| Phase 7: Nice-to-Haves | ~10 endpoints, misc | Various |

---

## 10. RISK ASSESSMENT

### High Risk
- **Chart system** is the core product. Without it, the app cannot replace the legacy system. This is the most complex subsystem to rewrite.
- **Recurly integration** is revenue-critical. Existing subscribers must migrate cleanly.
- **Radio playlist upload** feeds the chart system. Without it, charts can't be generated.

### Medium Risk
- **Email infrastructure** is required for user registration and password resets. Without it, no new users can sign up.
- **Staff reporting checks** are operationally important for weekly workflow.

### Low Risk
- Content management (articles/reviews) can be deferred if editorial workflow is not immediately needed.
- iTunes integration may be deprecated (evaluate current usage).
- QR codes, GA, static pages are cosmetic/operational.

---

## Appendix: File Count Comparison

| Metric | Legacy (CakePHP) | Revamp (Rust/Next.js) |
|--------|-------------------|----------------------|
| Controllers/API handlers | 38 | 23 modules |
| Models | 71 | 84 |
| Views/Pages | 422 templates | 29 pages |
| Plugins/Dependencies | 6 custom | 30+ crates |
| Test files | ~0 (no test suite) | 28 files (~7,200 lines) |
| Custom components | 9 | 126 React components |
| Email templates | 7 (HTML + text) | 0 |
