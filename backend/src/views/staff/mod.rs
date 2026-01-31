//! Staff member view types for different use cases.

mod list;
mod detail;
mod summary;

pub use list::{StaffListView, StaffListViewEnriched};
pub use detail::{StaffDetailView, StaffTransferLink};
pub use summary::StaffSummary;
