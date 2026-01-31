# Plan: Add Playlist Relations to Bands & Incorporate into Band Merge

## Problem

1. `bands.rs` has two broken relations:
   - **Line 111**: `StaffMemberPlaylists` references `super::staff_member_playlists::Entity` — this module doesn't exist. Should be `super::staff_playlists::Entity`.
   - **Line 113**: `StaffMemberPlaylistArchives` references `super::radio_playlist_archives::Entity` (duplicate of line 107). Should be `super::staff_playlist_archives::Entity`.

2. The `bands.rs` model is missing the `Related<>` impl blocks for `staff_playlists` and `staff_playlist_archives`.

3. The `albums.rs` model has no relations to `staff_playlists` or `staff_playlist_archives`, even though those tables have `album_id` columns.

4. The band merge function (`merge_bands` in `band_service.rs`) already handles `radio_playlists` and `radio_playlist_archives` (steps 11-12), but does **not** handle `staff_playlists` or `staff_playlist_archives`. These records would be orphaned when source bands are deleted.

## Current State

### Playlist tables and their FK columns:

| Table | band_id | album_id | song_id | Other FKs |
|-------|---------|----------|---------|-----------|
| `radio_playlists` | ✓ | ✓ | ✓ | radio_station_id |
| `radio_playlist_archives` | ✓ | ✓ | ✓ | radio_station_id, week_ending |
| `staff_playlists` | ✓ | ✓ | ✓ | staff_member_id, user_id |
| `staff_playlist_archives` | ✓ | ✓ | ✓ | staff_member_id, user_id, week_ending |

### Existing model relations:

| Model | radio_playlists | radio_playlist_archives | staff_playlists | staff_playlist_archives |
|-------|----------------|------------------------|-----------------|------------------------|
| `bands.rs` | ✓ | ✓ | BROKEN | BROKEN |
| `albums.rs` | ✓ | ✓ | MISSING | MISSING |
| `songs.rs` | ✓ | ✓ | ✓ | ✓ |

### Merge function coverage:

| Table | Handled in merge_bands? |
|-------|------------------------|
| `radio_playlists` | ✓ (step 11, `playlists_updated` stat) |
| `radio_playlist_archives` | ✓ (step 12, `playlist_archives_updated` stat) |
| `staff_playlists` | **NO** |
| `staff_playlist_archives` | **NO** |

---

## Step 1: Fix bands.rs relations

**File:** `backend/src/models/bands.rs`

Fix the two broken Relation enum variants (lines 111-114):

```rust
// Change FROM:
#[sea_orm(has_many = "super::staff_member_playlists::Entity")]
StaffMemberPlaylists,
#[sea_orm(has_many = "super::radio_playlist_archives::Entity")]
StaffMemberPlaylistArchives,

// Change TO:
#[sea_orm(has_many = "super::staff_playlists::Entity")]
StaffPlaylists,
#[sea_orm(has_many = "super::staff_playlist_archives::Entity")]
StaffPlaylistArchives,
```

Add `Related<>` impl blocks (after the existing `RadioRawDatas` Related block, ~line 224):

```rust
impl Related<super::staff_playlists::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::StaffPlaylists.def()
    }
}

impl Related<super::staff_playlist_archives::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::StaffPlaylistArchives.def()
    }
}
```

---

## Step 2: Add staff playlist relations to albums.rs

**File:** `backend/src/models/albums.rs`

Add two new variants to the Relation enum (before the closing `}`):

```rust
#[sea_orm(has_many = "super::staff_playlists::Entity")]
StaffPlaylists,
#[sea_orm(has_many = "super::staff_playlist_archives::Entity")]
StaffPlaylistArchives,
```

Add `Related<>` impl blocks:

```rust
impl Related<super::staff_playlists::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::StaffPlaylists.def()
    }
}

impl Related<super::staff_playlist_archives::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::StaffPlaylistArchives.def()
    }
}
```

---

## Step 3: Add staff playlist merge steps to band_service.rs merge_bands()

**File:** `backend/src/services/band_service.rs`

### 3a. Add imports

Add to the imports at the top of the file:

```rust
use crate::models::staff_playlists::{Entity as StaffPlaylist, Column as StaffPlaylistColumn};
use crate::models::staff_playlist_archives::{Entity as StaffPlaylistArchive, Column as StaffPlaylistArchiveColumn};
```

### 3b. Add stats fields to MergeStats

Add two new fields:

```rust
pub struct MergeStats {
    // ... existing fields ...
    pub staff_playlists_updated: u32,
    pub staff_playlist_archives_updated: u32,
}
```

### 3c. Add merge steps (after step 13 "Update raw data", before step 14 "Delete source bands")

Insert two new merge steps using the same pattern as the existing radio playlist merge (simple `band_id` reassignment, move all):

**Step 14 (new): Update staff playlists**
```rust
for from_id in &from_ids {
    let staff_pls = StaffPlaylist::find()
        .filter(StaffPlaylistColumn::BandId.eq(*from_id))
        .all(txn)
        .await?;

    for pl in staff_pls {
        let mut active: crate::models::staff_playlists::ActiveModel = pl.into();
        active.band_id = Set(Some(target_id));
        active.update(txn).await?;
        stats.staff_playlists_updated += 1;
    }
}
```

**Step 15 (new): Update staff playlist archives**
```rust
for from_id in &from_ids {
    let staff_archives = StaffPlaylistArchive::find()
        .filter(StaffPlaylistArchiveColumn::BandId.eq(*from_id))
        .all(txn)
        .await?;

    for arch in staff_archives {
        let mut active: crate::models::staff_playlist_archives::ActiveModel = arch.into();
        active.band_id = Set(Some(target_id));
        active.update(txn).await?;
        stats.staff_playlist_archives_updated += 1;
    }
}
```

The existing "Delete source bands" and "Get merged band" steps become steps 16 and 17.

---

## Step 4: Update frontend MergePreview to show new stats

**File:** `frontend/src/app/bands/components/BandMergeComparison/MergePreview.tsx`

The MergePreview component shows a summary of what will happen. If it displays merge stats from the API response, add the two new stat fields. If the preview is pre-merge (informational only), no changes needed — the stats are post-merge metadata.

Check whether the frontend types need updating to include the new stats fields. Since the stats come from the API response as JSON, TypeScript interfaces should be updated if they exist.

---

## Files Modified

| File | Step | Change |
|------|------|--------|
| `backend/src/models/bands.rs` | 1 | Fix 2 broken relation variants, add 2 Related impls |
| `backend/src/models/albums.rs` | 2 | Add 2 relation variants, add 2 Related impls |
| `backend/src/services/band_service.rs` | 3 | Add 2 imports, 2 MergeStats fields, 2 merge steps |
| `frontend/.../MergePreview.tsx` | 4 | Add new stats to display (if applicable) |

---

## Verification

1. `cargo check` — 0 new errors (fixes the pre-existing staff_member_playlists error)
2. Band merge: staff_playlists and staff_playlist_archives records move from source to target band
3. Band merge: radio_playlists and radio_playlist_archives still work as before
4. No orphaned playlist records after band deletion
