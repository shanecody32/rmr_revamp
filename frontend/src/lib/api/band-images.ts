import type { BandImage } from '@/types/api';

import { api } from './config';

export interface BandImageUploadParams {
  bandId: number;
  mainImage: File;
  thumbnail: File;
  order?: number;
}

export const bandImagesApi = {
  // Upload band image with thumbnail
  async upload(params: BandImageUploadParams): Promise<BandImage> {
    const formData = new FormData();
    formData.append('band_id', params.bandId.toString());
    formData.append('image', params.mainImage);
    formData.append('thumbnail', params.thumbnail);
    if (params.order !== undefined) {
      formData.append('order', params.order.toString());
    }

    const url = '/band_images/upload';

    try {
      const { data } = await api.post<BandImage>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return data;
    } catch (error) {
      console.error('Upload API error:', error);
      throw error;
    }
  },

  // List band images
  async list(bandId?: number): Promise<BandImage[]> {
    const url = `/band_images/${bandId}/list`;
    const { data } = await api.get<BandImage[]>(url);
    return data;
  },

  // Get single band image
  async get(id: number): Promise<BandImage> {
    const { data } = await api.get<BandImage>(`/band_images/${id}`);
    return data;
  },

  // Update band image order
  async updateOrder(id: number, order: number): Promise<BandImage> {
    const { data } = await api.patch<BandImage>(`/band_images/${id}`, { order });
    return data;
  },

  // Delete band image
  async delete(id: number): Promise<void> {
    await api.delete(`/band_images/${id}`);
  },

  // Reorder multiple images
  async reorderImages(updates: Array<{ id: number; order: number }>): Promise<void> {
    await api.post('/band_images/reorder', { updates });
  },
};