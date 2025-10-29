/**
 * Utility functions for handling image attachments in OpenCode Web
 */

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

// Allowed image file extensions
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];

/**
 * Check if a file is a valid image file
 * @param file - File to validate
 * @returns true if file is a valid image
 */
export function isImageFile(file: File): boolean {
  // Check MIME type first
  if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return true;
  }

  // Fallback to extension check
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  return extension ? ALLOWED_IMAGE_EXTENSIONS.includes(extension) : false;
}

/**
 * Convert an image file to base64 data URL
 * @param file - Image file to convert
 * @returns Promise resolving to base64 data URL string
 */
export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Validate image file size
 * @param file - File to validate
 * @param maxSizeMB - Maximum allowed size in megabytes (default: 10MB)
 * @returns true if file size is within limit
 */
export function validateImageSize(file: File, maxSizeMB: number = 10): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Format file size for display
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
