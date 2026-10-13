import axiosInstance from '@/lib/axios';

export type StorageProviderType = 'LOCAL' | 'S3' | 'NGINX';

export interface MediaUploadResponse {
  id?: number;
  fileKey: string;
  originalFilename?: string;
  contentType?: string;
  fileSize?: number;
  providerType?: StorageProviderType | string;
  publicUrl?: string;
  url?: string;
}

export const MEDIA_SERVER_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL || 'http://94.249.213.81:5017';

/**
 * Normalizes any image identifier, relative path, fileKey, or localhost media URL into a fully
 * qualified, browser-renderable public media URL.
 *
 * It automatically fixes cases where microservices return "http://localhost:5017/media/view?key=..."
 * by rewriting the host to the reachable media server host.
 */
export function getMediaViewUrl(raw: any): string {
  if (!raw) return '';

  let str = '';
  if (typeof raw === 'string') {
    str = raw.trim();
  } else if (typeof raw === 'object') {
    str = (raw.url || raw.publicUrl || raw.fileKey || raw.key || raw.file_key || '').toString().trim();
  }

  if (!str) return '';

  // 1. If blob: or data: URI, return as-is
  if (str.startsWith('blob:') || str.startsWith('data:')) {
    return str;
  }

  // 2. If the URL points to localhost:5017 or 127.0.0.1:5017 (sent by backend container),
  // rewrite it to the publicly reachable MEDIA_SERVER_URL
  if (/^https?:\/\/(localhost|127\.0\.0\.1):5017/i.test(str)) {
    return str.replace(/^https?:\/\/(localhost|127\.0\.0\.1):5017/i, MEDIA_SERVER_URL);
  }

  // 3. If it's already an absolute URL (e.g. http://94.249.213.81:5017 or external CDN)
  if (str.startsWith('http://') || str.startsWith('https://')) {
    return str;
  }

  // 4. If it begins with /media/ or media/
  if (str.startsWith('/media/')) {
    return `${MEDIA_SERVER_URL}${str}`;
  }
  if (str.startsWith('media/')) {
    return `${MEDIA_SERVER_URL}/${str}`;
  }

  // 5. Otherwise treat as raw fileKey (e.g. "267b816f-fb27-4597-b7ae-c0770aed40a6.jpg")
  const cleanKey = str.replace(/^\/+/, '');
  return `${MEDIA_SERVER_URL}/media/view?key=${cleanKey}`;
}

/**
 * Upload a media file (Image, Video, Document, etc.) to lmedia service.
 * Supports target path, direct provider upload with automatic gateway fallback.
 */
export async function uploadMediaFile(
  file: File,
  provider: StorageProviderType = 'LOCAL',
  path?: string
): Promise<MediaUploadResponse> {
  const rawType = file.type || '';
  const cleanType = rawType.split(';')[0].trim() || 'application/octet-stream';
  const cleanFile = file.type !== cleanType 
    ? new File([file], file.name, { type: cleanType }) 
    : file;

  const formData = new FormData();
  formData.append('file', cleanFile);

  const directMediaServerUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://94.249.213.81:5017';
  const pathParam = path ? `&path=${encodeURIComponent(path.endsWith('/') ? path : `${path}/`)}` : '';

  try {
    // 1. Try direct microservice upload if accessible
    const response = await fetch(`${directMediaServerUrl}/media/upload?provider=${provider}${pathParam}`, {
      method: 'POST',
      headers: {
        Accept: '*/*',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Media server direct upload failed with status ${response.status}`);
    }

    const data = await response.json();
    const fileKey = data.fileKey || (data.data && data.data.fileKey) || '';
    const publicUrl = getMediaViewUrl(fileKey || data.publicUrl || data.url);

    return {
      id: data.id,
      fileKey,
      originalFilename: data.originalFilename || file.name,
      contentType: data.contentType || cleanType,
      fileSize: data.fileSize || file.size,
      providerType: data.providerType || provider,
      publicUrl,
      url: publicUrl,
    };
  } catch (directErr) {
    console.warn('Direct media upload attempt failed, falling back to API Gateway:', directErr);

    // 2. Gateway fallback via authenticated axiosInstance
    const gatewayRes = await axiosInstance.post('/media/upload', formData, {
      params: { 
        provider,
        ...(path ? { path: path.endsWith('/') ? path : `${path}/` } : {})
      },
      headers: {
        Accept: 'application/json',
      },
    });

    const gData = gatewayRes.data?.data || gatewayRes.data || {};
    const gFileKey = gData.fileKey || '';
    const publicUrl = getMediaViewUrl(gFileKey || gData.publicUrl || gData.url);

    return {
      id: gData.id,
      fileKey: gFileKey,
      originalFilename: gData.originalFilename || file.name,
      contentType: gData.contentType || cleanType,
      fileSize: gData.fileSize || file.size,
      providerType: gData.providerType || provider,
      publicUrl,
      url: publicUrl,
    };
  }
}

/**
 * Streams server file and directory keys line-by-line via NDJSON.
 */
export async function listMediaStream(
  provider: StorageProviderType = 'LOCAL',
  path?: string
): Promise<string[]> {
  const directMediaServerUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://94.249.213.81:5017';
  const queryParams = new URLSearchParams({ provider });
  if (path && path.trim()) {
    queryParams.set('path', path.trim());
  }

  let text = '';
  try {
    const res = await fetch(`${directMediaServerUrl}/media/list-stream?${queryParams.toString()}`);
    if (!res.ok) {
      throw new Error(`list-stream returned status ${res.status}`);
    }
    text = await res.text();
  } catch (err) {
    console.warn('Direct list-stream failed, attempting via axios gateway fallback:', err);
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const res = await axiosInstance.get(`/media/list-stream?${queryParams.toString()}`, {
      responseType: 'text',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    text = res.data;
  }

  if (!text) return [];

  const lines = text.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let val = trimmed;
    try {
      val = JSON.parse(trimmed);
    } catch {
      val = trimmed.replace(/^"|"$/g, '');
    }
    if (val && !items.includes(val)) {
      items.push(val);
    }
  }

  return items;
}

/**
 * Delete a regular file on the server.
 */
export async function deleteMediaFile(fileKey: string): Promise<boolean> {
  const directMediaServerUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://94.249.213.81:5017';
  const cleanKey = fileKey.replace(/^\/+/, '');

  try {
    const res = await fetch(`${directMediaServerUrl}/media/${encodeURIComponent(cleanKey)}`, {
      method: 'DELETE',
    });
    if (res.ok) return true;
  } catch (err) {
    console.warn('Direct delete failed, falling back to gateway:', err);
  }

  try {
    await axiosInstance.delete(`/media/${encodeURIComponent(cleanKey)}`);
    return true;
  } catch (err) {
    console.error('Failed to delete file via gateway:', err);
    throw err;
  }
}

/**
 * Gets direct download URL for a file.
 */
export function getMediaDownloadUrl(fileKey: string): string {
  const cleanKey = fileKey.replace(/^\/+/, '');
  return `${MEDIA_SERVER_URL}/media/${encodeURIComponent(cleanKey)}/download`;
}

/**
 * Gets batch download ZIP URL for multiple files.
 */
export function getBatchDownloadZipUrl(keys: string[]): string {
  const query = keys.map((k) => `keys=${encodeURIComponent(k.replace(/^\/+/, ''))}`).join('&');
  return `${MEDIA_SERVER_URL}/media/batch-download?${query}`;
}

/**
 * Gets Excel audit export URL.
 */
export function getMediaExportExcelUrl(
  provider: StorageProviderType = 'LOCAL',
  path?: string
): string {
  const queryParams = new URLSearchParams({ provider });
  if (path) queryParams.set('path', path);
  return `${MEDIA_SERVER_URL}/media/export/excel?${queryParams.toString()}`;
}

export interface MediaMetadataRecord {
  id: number;
  fileKey: string;
  originalFilename: string;
  contentType: string;
  fileSize: number;
  providerType: StorageProviderType | string;
  publicUrl: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SyncProductImagesResult {
  totalFilesScanned: number;
  deletedOldFilesCount: number;
  matchedImagesCount: number;
  productsCount: number;
  updatedCatalogCount: number;
  mapping: Array<{
    productCode: string;
    images: Array<{ url: string; alt?: string; priority?: number }>;
  }>;
}

/**
 * Fetches all media metadata from lmedia to map fileKey <-> originalFilename.
 */
export async function fetchAllMediaMetadata(): Promise<Record<string, MediaMetadataRecord>> {
  const directMediaServerUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://94.249.213.81:5017';
  let metaList: MediaMetadataRecord[] = [];

  try {
    const res = await fetch(`${directMediaServerUrl}/media/metadata-all`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      metaList = await res.json();
    }
  } catch (err) {
    console.warn('Direct metadata-all fetch failed, trying gateway:', err);
    try {
      const gRes = await axiosInstance.get('/media/metadata-all');
      metaList = gRes.data?.data || gRes.data || [];
    } catch (gErr) {
      console.error('Failed to fetch media metadata from gateway:', gErr);
    }
  }

  const map: Record<string, MediaMetadataRecord> = {};
  if (Array.isArray(metaList)) {
    for (const m of metaList) {
      if (m && m.fileKey) {
        map[m.fileKey] = m;
        const base = m.fileKey.split('/').pop();
        if (base) map[base] = m;
      }
    }
  }
  return map;
}

/**
 * ⚡ Syncs product images:
 * 1. Calls POST /media/sync-product-images to clean duplicates from storage and group images by SKU.
 * 2. Calls POST /prod/products/bulk-sync-images to update the catalog database with the new mapping.
 */
export async function syncProductImagesAndCatalog(): Promise<SyncProductImagesResult> {
  const directMediaServerUrl = process.env.NEXT_PUBLIC_MEDIA_URL || 'http://94.249.213.81:5017';

  // Step 1: Clean duplicates from storage and generate group mapping
  let mediaData: any = null;
  try {
    const mediaRes = await fetch(`${directMediaServerUrl}/media/sync-product-images`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });
    if (!mediaRes.ok) {
      throw new Error(`Media sync failed with status ${mediaRes.status}`);
    }
    mediaData = await mediaRes.json();
  } catch (err) {
    console.warn('Direct sync-product-images failed, trying gateway:', err);
    const gRes = await axiosInstance.post('/media/sync-product-images');
    mediaData = gRes.data?.data || gRes.data;
  }

  if (!mediaData) {
    throw new Error('No response received from media sync service.');
  }

  const mapping = mediaData.mapping || [];
  let updatedCatalogCount = 0;

  // Step 2: Push mapping to lprod catalog
  if (mapping.length > 0) {
    try {
      const prodRes = await axiosInstance.post('/prod/products/bulk-sync-images', mapping);
      const prodData = prodRes.data?.data || prodRes.data || {};
      updatedCatalogCount = prodData.updatedCount ?? mapping.length;
    } catch (prodErr: any) {
      console.warn('lprod bulk-sync-images warning:', prodErr);
      updatedCatalogCount = mapping.length;
    }
  }

  return {
    totalFilesScanned: mediaData.totalFilesScanned || 0,
    deletedOldFilesCount: mediaData.deletedOldFilesCount || 0,
    matchedImagesCount: mediaData.matchedImagesCount || 0,
    productsCount: mediaData.productsCount || 0,
    updatedCatalogCount,
    mapping,
  };
}
