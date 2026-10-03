/**
 * MUETYSTORE — Cloudinary Media Service (Stage 02D)
 * 
 * Centralized Media Authority for Product, Category, and Gallery Assets.
 * 
 * SECURITY DIRECTIVE:
 * - Only expose client-safe VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET.
 * - NEVER expose CLOUDINARY_API_SECRET in frontend source, Firestore, or Git.
 * - Supports signed server upload architecture via signatureEndpoint when configured.
 */

import { env } from '@/lib/config/env';

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface CloudinaryUploadResponse {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export interface TransformationOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit' | 'pad';
  quality?: 'auto' | 'auto:good' | 'auto:best' | 'auto:eco' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
  aspectRatio?: string;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Validates file type, size, and integrity prior to upload.
 */
export function validateImageFile(fileOrDataUrl: File | Blob | string): ImageValidationResult {
  if (!fileOrDataUrl) {
    return { valid: false, error: 'No image file or data supplied.' };
  }

  // Handle File or Blob object
  if (typeof File !== 'undefined' && fileOrDataUrl instanceof File) {
    if (fileOrDataUrl.size > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File size (${(fileOrDataUrl.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 10MB.` };
    }
    if (!ALLOWED_MIME_TYPES.includes(fileOrDataUrl.type.toLowerCase())) {
      return { valid: false, error: `Invalid file type (${fileOrDataUrl.type || 'unknown'}). Allowed formats: JPEG, PNG, WEBP.` };
    }
    return { valid: true };
  }

  if (typeof Blob !== 'undefined' && fileOrDataUrl instanceof Blob) {
    if (fileOrDataUrl.size > MAX_FILE_SIZE_BYTES) {
      return { valid: false, error: `File size (${(fileOrDataUrl.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 10MB.` };
    }
    if (fileOrDataUrl.type && !ALLOWED_MIME_TYPES.includes(fileOrDataUrl.type.toLowerCase())) {
      return { valid: false, error: `Invalid file type (${fileOrDataUrl.type}). Allowed formats: JPEG, PNG, WEBP.` };
    }
    return { valid: true };
  }

  // Handle string (Data URL or HTTP URL)
  if (typeof fileOrDataUrl === 'string') {
    if (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://')) {
      return { valid: true };
    }

    if (fileOrDataUrl.startsWith('data:')) {
      const mimeMatch = fileOrDataUrl.match(/^data:([a-zA-Z0-9-+/]+);base64,/);
      if (!mimeMatch) {
        return { valid: false, error: 'Malformed base64 image data URL.' };
      }
      const mimeType = mimeMatch[1].toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return { valid: false, error: `Invalid base64 image format (${mimeType}). Allowed: JPEG, PNG, WEBP.` };
      }

      // Estimate byte length from base64 string
      const base64Length = fileOrDataUrl.length - mimeMatch[0].length;
      const estimatedBytes = (base64Length * 3) / 4;
      if (estimatedBytes > MAX_FILE_SIZE_BYTES) {
        return { valid: false, error: `Image data (${(estimatedBytes / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 10MB.` };
      }
      return { valid: true };
    }
  }

  return { valid: false, error: 'Unsupported media asset format.' };
}

/**
 * Uploads a single media asset to Cloudinary.
 * Deterministic folders:
 * - Products: muety/products/{productId}/
 * - Categories: muety/categories/{categoryId}/
 */
export async function uploadToCloudinary(
  fileOrDataUrl: File | Blob | string,
  options?: {
    productId?: string;
    categoryId?: string;
    folder?: string;
    publicId?: string;
  }
): Promise<CloudinaryUploadResponse> {
  const validation = validateImageFile(fileOrDataUrl);
  if (!validation.valid) {
    throw new Error(`Cloudinary Image Validation Failed: ${validation.error}`);
  }

  // If already hosted URL, return as-is
  if (typeof fileOrDataUrl === 'string' && (fileOrDataUrl.startsWith('http://') || fileOrDataUrl.startsWith('https://'))) {
    return {
      url: fileOrDataUrl,
      publicId: extractCloudinaryPublicId(fileOrDataUrl) || ''
    };
  }

  const cloudName = env.cloudinary.cloudName || 'muety-atelier';
  const uploadPreset = env.cloudinary.uploadPreset || 'muety_products_preset';

  // Determine folder structure
  let folder = options?.folder;
  if (!folder) {
    if (options?.productId) {
      const cleanId = options.productId.replace(/[^a-zA-Z0-9_-]/g, '_');
      folder = `muety/products/${cleanId}`;
    } else if (options?.categoryId) {
      const cleanId = options.categoryId.replace(/[^a-zA-Z0-9_-]/g, '_');
      folder = `muety/categories/${cleanId}`;
    } else {
      folder = 'muety/media';
    }
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();

  if (typeof fileOrDataUrl === 'string') {
    formData.append('file', fileOrDataUrl);
  } else {
    formData.append('file', fileOrDataUrl);
  }

  formData.append('upload_preset', uploadPreset);
  if (folder) {
    formData.append('folder', folder);
  }
  if (options?.publicId) {
    formData.append('public_id', options.publicId);
  }

  // Support Signed Upload API endpoint if configured
  if (env.cloudinary.signatureEndpoint) {
    try {
      const sigRes = await fetch(env.cloudinary.signatureEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder, public_id: options?.publicId })
      });
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        if (sigData.signature && sigData.timestamp && sigData.api_key) {
          formData.append('signature', sigData.signature);
          formData.append('timestamp', String(sigData.timestamp));
          formData.append('api_key', sigData.api_key);
        }
      }
    } catch {
      // Fall back to client unsigned upload preset
    }
  }

  try {
    const res = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errorText = await res.text();
      let parseMsg = '';
      try {
        const errJson = JSON.parse(errorText);
        parseMsg = errJson?.error?.message || '';
      } catch {}
      throw new Error(`Cloudinary API Error (${res.status}): ${parseMsg || errorText || 'Upload failed'}`);
    }

    const data = await res.json();

    return {
      url: data.secure_url || data.url,
      publicId: data.public_id || '',
      width: data.width,
      height: data.height,
      format: data.format,
      bytes: data.bytes
    };
  } catch (err: any) {
    console.error('Cloudinary Upload Exception:', err);
    throw new Error(`Cloudinary Upload Failed: ${err?.message || 'Network or API error'}`);
  }
}

/**
 * Uploads multiple product images to Cloudinary in sequence or parallel.
 */
export async function uploadProductImagesToCloudinary(
  images: (File | Blob | string)[],
  productId: string
): Promise<string[]> {
  if (!images || images.length === 0) return [];

  const uploadPromises = images.map(async (img, idx) => {
    try {
      const res = await uploadToCloudinary(img, {
        productId,
        publicId: `image_${idx + 1}_${Date.now()}`
      });
      return res.url;
    } catch (err: any) {
      console.warn(`Failed to upload image at index ${idx} to Cloudinary:`, err);
      // If it's already a valid string URL, preserve it; otherwise rethrow
      if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
        return img;
      }
      throw err;
    }
  });

  return await Promise.all(uploadPromises);
}

/**
 * Helper to construct responsive Cloudinary URLs with dynamic image transformations.
 * Example:
 * getCloudinaryUrl("https://res.cloudinary.com/demo/image/upload/sample.jpg", { width: 600, height: 800, crop: 'fill' })
 */
export function getCloudinaryUrl(
  urlOrPublicId: string,
  options?: TransformationOptions
): string {
  if (!urlOrPublicId) return '';

  if (!options || Object.keys(options).length === 0) {
    return urlOrPublicId;
  }

  const params: string[] = [];

  if (options.crop) params.push(`c_${options.crop}`);
  else if (options.width || options.height) params.push('c_fill');

  if (options.width) params.push(`w_${options.width}`);
  if (options.height) params.push(`h_${options.height}`);
  if (options.aspectRatio) params.push(`ar_${options.aspectRatio}`);
  
  params.push(`f_${options.format || 'auto'}`);
  params.push(`q_${options.quality || 'auto'}`);

  const transformStr = params.join(',');

  // If already a Cloudinary URL
  if (urlOrPublicId.includes('/image/upload/')) {
    return urlOrPublicId.replace('/image/upload/', `/image/upload/${transformStr}/`);
  }

  // If public ID only
  const cloudName = env.cloudinary.cloudName || 'muety-atelier';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformStr}/${urlOrPublicId}`;
}

/**
 * Extracts public ID from a Cloudinary URL.
 */
export function extractCloudinaryPublicId(url: string): string | null {
  if (!url || !url.includes('/image/upload/')) return null;
  try {
    const parts = url.split('/image/upload/');
    if (parts.length < 2) return null;
    let path = parts[1];
    // Strip transformations if present (e.g. v12345/ or c_fill.../)
    path = path.replace(/^[a-z]_[^/]+\//g, '').replace(/^v\d+\//, '');
    // Strip file extension
    const dotIndex = path.lastIndexOf('.');
    if (dotIndex !== -1) {
      path = path.substring(0, dotIndex);
    }
    return path;
  } catch {
    return null;
  }
}
