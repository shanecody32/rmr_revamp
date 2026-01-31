//! Band view types for different use cases.

mod list;
mod detail;
mod summary;

pub use list::{BandListView, BandListViewEnriched};
pub use detail::BandDetailView;
pub use summary::BandSummary;
