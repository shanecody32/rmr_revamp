//! Album view types for different use cases.

mod list;
mod detail;
mod summary;

pub use list::{AlbumListView, AlbumListViewEnriched};
pub use detail::AlbumDetailView;
pub use summary::AlbumSummary;
