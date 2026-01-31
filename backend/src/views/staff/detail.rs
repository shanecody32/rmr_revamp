//! Full staff detail view with all relations.
//!
//! Used for individual staff pages where complete data is needed.

use crate::models::staff_members::Model as StaffMemberModel;
use crate::models::staff_images::Model as StaffImageModel;
use crate::models::staff_links::Model as StaffLinkModel;
use crate::models::staff_addresses::Model as StaffAddressModel;
use crate::models::staff_phone_numbers::Model as StaffPhoneModel;
use crate::models::sub_genres::Model as SubGenreModel;
use crate::models::radio_stations::Model as RadioStationModel;
use serde::Serialize;
use utoipa::ToSchema;

/// Complete staff data with all related entities.
///
/// This view includes full model data plus resolved relations.
/// Playlists are heavy and loaded separately via dedicated endpoints.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct StaffDetailView {
    /// Full staff member model data (flattened into response)
    #[serde(flatten)]
    pub staff: StaffMemberModel,

    /// Associated radio station
    #[serde(skip_serializing_if = "Option::is_none")]
    pub station: Option<RadioStationModel>,

    /// Staff images
    #[serde(skip_serializing_if = "Option::is_none")]
    pub images: Option<Vec<StaffImageModel>>,

    /// Staff links (social media, websites)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<Vec<StaffLinkModel>>,

    /// Staff addresses
    #[serde(skip_serializing_if = "Option::is_none")]
    pub addresses: Option<Vec<StaffAddressModel>>,

    /// Staff phone numbers
    #[serde(skip_serializing_if = "Option::is_none")]
    pub phone_numbers: Option<Vec<StaffPhoneModel>>,

    /// Associated sub-genres (calculated from playlist history)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sub_genres: Option<Vec<SubGenreModel>>,

    /// Reference to the new profile (if this profile was archived via transfer)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transferred_to: Option<StaffTransferLink>,

    /// Reference to the old profile (if this profile was created via transfer)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transferred_from: Option<StaffTransferLink>,
}

/// Minimal info about a transferred profile for linking.
#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct StaffTransferLink {
    pub id: u32,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub on_air_name: Option<String>,
    pub radio_station_id: Option<u32>,
    pub station_name: Option<String>,
}

impl StaffDetailView {
    /// Create a new detail view with minimal data (no relations loaded).
    pub fn new(staff: StaffMemberModel) -> Self {
        Self {
            staff,
            station: None,
            images: None,
            links: None,
            addresses: None,
            phone_numbers: None,
            sub_genres: None,
            transferred_to: None,
            transferred_from: None,
        }
    }

    /// Set the station for this view.
    pub fn with_station(mut self, station: RadioStationModel) -> Self {
        self.station = Some(station);
        self
    }

    /// Set the images for this view.
    pub fn with_images(mut self, images: Vec<StaffImageModel>) -> Self {
        self.images = Some(images);
        self
    }

    /// Set the links for this view.
    pub fn with_links(mut self, links: Vec<StaffLinkModel>) -> Self {
        self.links = Some(links);
        self
    }

    /// Set the addresses for this view.
    pub fn with_addresses(mut self, addresses: Vec<StaffAddressModel>) -> Self {
        self.addresses = Some(addresses);
        self
    }

    /// Set the phone numbers for this view.
    pub fn with_phone_numbers(mut self, phones: Vec<StaffPhoneModel>) -> Self {
        self.phone_numbers = Some(phones);
        self
    }

    /// Set the sub-genres for this view.
    pub fn with_sub_genres(mut self, sub_genres: Vec<SubGenreModel>) -> Self {
        self.sub_genres = Some(sub_genres);
        self
    }

    /// Set the transferred_to link for this view.
    pub fn with_transferred_to(mut self, link: StaffTransferLink) -> Self {
        self.transferred_to = Some(link);
        self
    }

    /// Set the transferred_from link for this view.
    pub fn with_transferred_from(mut self, link: StaffTransferLink) -> Self {
        self.transferred_from = Some(link);
        self
    }
}
