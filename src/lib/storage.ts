import { supabase } from './supabase';

export type StorageBucket = 'universal-attendance';

export type StorageFolder =
  | 'workers'
  | 'sites'
  | 'attendance'
  | 'food'
  | 'payments'
  | 'commission'
  | 'documents';

export const DEFAULT_STORAGE_BUCKET: StorageBucket = 'universal-attendance';

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
];

export const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_DOCUMENT_MIME_TYPES,
];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface StorageFileValidationResult {
  valid: boolean;
  error?: string;
}

export interface StorageUploadOptions {
  file: File | Blob;
  fileName?: string;
  folder: StorageFolder;
  entityId: string;
  subFolder?: string;
  bucket?: StorageBucket;
  isPrivate?: boolean;
}

export interface StorageBase64UploadOptions {
  base64Data: string; // e.g. "data:image/png;base64,..." or raw base64
  fileName: string;
  folder: StorageFolder;
  entityId: string;
  subFolder?: string;
  bucket?: StorageBucket;
  isPrivate?: boolean;
}

export interface StorageUploadResult {
  path: string | null;
  bucket: string;
  fullUrl?: string | null;
  error: Error | null;
}

/**
 * Sanitizes a filename to prevent path traversal and unsafe characters.
 */
export function sanitizeFileName(fileName: string): string {
  // Remove directory paths
  const baseName = fileName.replace(/^.*[\\/]/, '');
  // Replace non-alphanumeric (except dot, dash, underscore) with underscore
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Ensure no leading dots to prevent hidden files
  return sanitized.replace(/^\.+/, '');
}

/**
 * Validates a file against allowed MIME types and file size limits.
 */
export function validateFile(file: File | Blob, customMaxSizeBytes?: number): StorageFileValidationResult {
  const mimeType = file.type;

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type "${mimeType}". Allowed types: JPG, PNG, WEBP, PDF.`,
    };
  }

  const isDocument = ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType);
  const maxSizeBytes = customMaxSizeBytes || (isDocument ? MAX_DOCUMENT_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES);

  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File size exceeds the limit of ${maxSizeMB} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Constructs a safe, deterministic storage path.
 * Format: {folder}/{entityId}/{subFolder}/{fileName}
 */
export function buildStoragePath(
  folder: StorageFolder,
  entityId: string,
  fileName: string,
  subFolder?: string
): string {
  const safeEntityId = sanitizeFileName(entityId);
  const safeFileName = sanitizeFileName(fileName);
  const timestamp = Date.now();
  const nameParts = safeFileName.split('.');
  const ext = nameParts.length > 1 ? nameParts.pop() : '';
  const nameWithoutExt = nameParts.join('.');
  const uniqueFileName = `${nameWithoutExt}_${timestamp}${ext ? `.${ext}` : ''}`;

  if (subFolder) {
    const safeSubFolder = sanitizeFileName(subFolder);
    return `${folder}/${safeEntityId}/${safeSubFolder}/${uniqueFileName}`;
  }

  return `${folder}/${safeEntityId}/${uniqueFileName}`;
}

/**
 * Converts a base64 Data URL string to a Blob.
 */
export function base64ToBlob(base64Data: string): { blob: Blob; mimeType: string } {
  let mimeType = 'image/png';
  let rawBase64 = base64Data;

  if (base64Data.startsWith('data:')) {
    const matches = base64Data.match(/^data:([^;]+);base64,(.*)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1]!;
      rawBase64 = matches[2]!;
    }
  }

  const byteCharacters = atob(rawBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return { blob: new Blob([byteArray], { type: mimeType }), mimeType };
}

export const storageService = {
  /**
   * Uploads a File or Blob to Supabase Storage.
   */
  async uploadFile(options: StorageUploadOptions): Promise<StorageUploadResult> {
    const bucket = options.bucket || DEFAULT_STORAGE_BUCKET;
    const rawFileName = options.fileName || (options.file instanceof File ? options.file.name : 'upload.bin');

    const validation = validateFile(options.file);
    if (!validation.valid) {
      return {
        path: null,
        bucket,
        error: new Error(validation.error || 'File validation failed.'),
      };
    }

    const path = buildStoragePath(options.folder, options.entityId, rawFileName, options.subFolder);

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, options.file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error(`Error uploading file to storage bucket "${bucket}" path "${path}":`, error);
        return { path: null, bucket, error };
      }

      return {
        path: data.path,
        bucket,
        error: null,
      };
    } catch (err: any) {
      console.error(`Exception uploading file to storage bucket "${bucket}":`, err);
      return { path: null, bucket, error: err };
    }
  },

  /**
   * Uploads a base64 Data URL string to Supabase Storage.
   */
  async uploadBase64(options: StorageBase64UploadOptions): Promise<StorageUploadResult> {
    try {
      const { blob } = base64ToBlob(options.base64Data);
      return await this.uploadFile({
        file: blob,
        fileName: options.fileName,
        folder: options.folder,
        entityId: options.entityId,
        subFolder: options.subFolder,
        bucket: options.bucket,
        isPrivate: options.isPrivate,
      });
    } catch (err: any) {
      console.error('Exception parsing base64 file upload:', err);
      return {
        path: null,
        bucket: options.bucket || DEFAULT_STORAGE_BUCKET,
        error: err,
      };
    }
  },

  /**
   * Generates a signed URL for private file access.
   */
  async createSignedUrl(
    path: string,
    expiresInSeconds = 3600,
    bucket = DEFAULT_STORAGE_BUCKET
  ): Promise<{ signedUrl: string | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);

      if (error) {
        console.error(`Error creating signed URL for path "${path}":`, error);
        return { signedUrl: null, error };
      }

      return { signedUrl: data.signedUrl, error: null };
    } catch (err: any) {
      console.error(`Exception creating signed URL for path "${path}":`, err);
      return { signedUrl: null, error: err };
    }
  },

  /**
   * Retrieves the public URL for public bucket files.
   */
  getPublicUrl(path: string, bucket = DEFAULT_STORAGE_BUCKET): { publicUrl: string } {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { publicUrl: data.publicUrl };
  },

  /**
   * Deletes a file from Supabase Storage.
   */
  async deleteFile(path: string, bucket = DEFAULT_STORAGE_BUCKET): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) {
        console.error(`Error deleting storage file "${path}":`, error);
        return { error };
      }
      return { error: null };
    } catch (err: any) {
      console.error(`Exception deleting storage file "${path}":`, err);
      return { error: err };
    }
  },

  /**
   * Lists files inside a directory path in Supabase Storage.
   */
  async listFiles(
    folderPath: string,
    bucket = DEFAULT_STORAGE_BUCKET
  ): Promise<{ data: any[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        console.error(`Error listing files in "${folderPath}":`, error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (err: any) {
      console.error(`Exception listing files in "${folderPath}":`, err);
      return { data: null, error: err };
    }
  },
};
