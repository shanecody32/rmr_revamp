// Bands API
export {
    fetchSimilarBands,
    mergeBands,
    fetchBandById,
    fetchBands,
    createBand,
    updateBand,
    fetchBandsList,
    fetchBandDetail,
    fetchBandDiscographySummary,
} from './bands';
export type { SimilarBand, SimilarityParams } from './bands';

// Songs API
export {
    fetchSongs,
    createSong,
    mergeSongs,
    fetchSongById,
    updateSong,
    deleteSong,
    fetchSimilarSongs,
} from './songs';
export type { SimilarSong } from './songs';

// Albums API
export {
    fetchAlbumById,
    fetchAlbums,
    createAlbum,
    updateAlbum,
    mergeAlbums,
    fetchSimilarAlbums,
    fetchUnknownAlbum,
    fetchAlbumSongs,
} from './albums';
export type { SimilarAlbum, UnknownAlbumResponse, AlbumSong } from './albums';

// Radio Stations API
export {
    fetchRadioStationById,
    fetchRadioStations,
    createRadioStation,
    mergeRadioStations,
    fetchSimilarRadioStations,
} from './radio-stations';
export type { SimilarRadioStation } from './radio-stations';
