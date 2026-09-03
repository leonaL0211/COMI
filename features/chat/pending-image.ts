/**
 * Client-side helpers for the composer's pending image attachment.
 * This is a cheap pre-check only — server/attachments/image-processing.ts
 * re-validates MIME (by reading the real file header, not trusting
 * File.type) and size, and does the actual resize/compress. Duplicated
 * here rather than imported because this file ships to the browser and
 * the server module pulls in `sharp` (Node-only).
 */

export const maxClientUploadBytes = 15 * 1024 * 1024;
const allowedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export type PendingImage = {
  file: File;
  previewUrl: string;
};

export function validateImageFile(file: File): string | null {
  if (!allowedImageMimeTypes.has(file.type)) {
    return "只支持 JPG、PNG 或 WebP 图片。";
  }

  if (file.size > maxClientUploadBytes) {
    return "图片太大了，请选一张小一点的（15MB 以内）。";
  }

  return null;
}

/** Resolves to the raw base64 payload (the `data:...;base64,` prefix stripped). */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        reject(new Error("Failed to read file."));
        return;
      }

      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };

    reader.readAsDataURL(file);
  });
}
