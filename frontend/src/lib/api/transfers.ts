'use client'

import type {
    TransferPreview,
    TransferResult,
} from '@/types/api/common';
import { api } from './config';

// ========== Song Transfer Operations ==========

/**
 * Preview the impact of transferring a song to a different album.
 */
export const previewSongTransferAlbum = async (
    songId: number,
    targetAlbumId: number
): Promise<TransferPreview> => {
    const response = await api.get<TransferPreview>(
        `/transfers/songs/${songId}/transfer-album/preview`,
        { params: { target_album_id: targetAlbumId } }
    );
    return response.data;
};

/**
 * Transfer a song to a different album.
 * Updates album associations and cascades to playlists and archives.
 */
export const transferSongToAlbum = async (
    songId: number,
    targetAlbumId: number
): Promise<TransferResult> => {
    const response = await api.post<TransferResult>(
        `/transfers/songs/${songId}/transfer-album`,
        { target_album_id: targetAlbumId },
        { timeout: 60000 }
    );
    return response.data;
};

/**
 * Preview the impact of transferring a song to a different band.
 */
export const previewSongTransferBand = async (
    songId: number,
    targetBandId: number
): Promise<TransferPreview> => {
    const response = await api.get<TransferPreview>(
        `/transfers/songs/${songId}/transfer-band/preview`,
        { params: { target_band_id: targetBandId } }
    );
    return response.data;
};

/**
 * Transfer a song to a different band.
 * Updates song's band_id and cascades to playlists, archives, and aliases.
 */
export const transferSongToBand = async (
    songId: number,
    targetBandId: number
): Promise<TransferResult> => {
    const response = await api.post<TransferResult>(
        `/transfers/songs/${songId}/transfer-band`,
        { target_band_id: targetBandId },
        { timeout: 60000 }
    );
    return response.data;
};

/**
 * Remove a song from an album (for compilations where songs can be on multiple albums).
 */
export const removeSongFromAlbum = async (
    songId: number,
    albumId: number
): Promise<TransferResult> => {
    const response = await api.post<TransferResult>(
        `/transfers/songs/${songId}/remove-from-album`,
        { album_id: albumId }
    );
    return response.data;
};

// ========== Album Transfer Operations ==========

/**
 * Preview the impact of transferring an album to a different band.
 */
export const previewAlbumTransferBand = async (
    albumId: number,
    targetBandId: number,
    transferSongs: boolean = true
): Promise<TransferPreview> => {
    const response = await api.get<TransferPreview>(
        `/transfers/albums/${albumId}/transfer-band/preview`,
        { params: { target_band_id: targetBandId, transfer_songs: transferSongs } }
    );
    return response.data;
};

/**
 * Transfer an album to a different band.
 * Optionally transfers all songs on the album to the new band as well.
 */
export const transferAlbumToBand = async (
    albumId: number,
    targetBandId: number,
    transferSongs: boolean = true
): Promise<TransferResult> => {
    const response = await api.post<TransferResult>(
        `/transfers/albums/${albumId}/transfer-band`,
        { target_band_id: targetBandId, transfer_songs: transferSongs },
        { timeout: 120000 } // 2 minute timeout for album transfers with songs
    );
    return response.data;
};
