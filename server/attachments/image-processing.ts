import sharp from "sharp";

/**
 * Image Input MVP limits — see docs/ROADMAP.md / DELIVERY report for the
 * rationale. Keep these three numbers in sync with what's documented
 * there if they ever change.
 */
export const maxUploadBytes = 15 * 1024 * 1024; // 15 MB raw upload, pre-compression
export const maxLongEdgePx = 1600; // resize target before the model ever sees it
export const targetCompressedBytes = 1024 * 1024; // ~1 MB, matches the capability-test ceiling

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ImageProcessingError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

export type ProcessedImage = {
  /** Always JPEG — every accepted format is normalized on the way in. */
  buffer: Buffer;
  mimeType: "image/jpeg";
  width: number;
  height: number;
};

export function isAllowedImageMimeType(value: unknown): value is string {
  return typeof value === "string" && allowedMimeTypes.has(value);
}

/**
 * Validates and compresses an uploaded image. Always normalizes to JPEG
 * (transparency, if any, is flattened onto white) so both the storage
 * object and the vision request payload have one predictable format.
 *
 * `declaredMimeType` is only used to fail fast with a clear error before
 * doing any real work — the actual format check that matters is
 * `sharp(...).metadata()`, which reads the real file header rather than
 * trusting the client's Content-Type.
 */
export async function processUploadedImage(
  raw: Buffer,
  declaredMimeType: string,
): Promise<ProcessedImage> {
  if (!isAllowedImageMimeType(declaredMimeType)) {
    throw new ImageProcessingError(
      "Only JPEG, PNG, and WebP images are supported.",
    );
  }

  if (raw.byteLength === 0) {
    throw new ImageProcessingError("Image file is empty.");
  }

  if (raw.byteLength > maxUploadBytes) {
    throw new ImageProcessingError(
      `Image exceeds the ${Math.round(maxUploadBytes / (1024 * 1024))}MB upload limit.`,
    );
  }

  let metadata: sharp.Metadata;

  try {
    metadata = await sharp(raw).metadata();
  } catch {
    throw new ImageProcessingError("Image file could not be read.");
  }

  if (!metadata.format || !["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new ImageProcessingError(
      "Only JPEG, PNG, and WebP images are supported.",
    );
  }

  // Iteratively step down JPEG quality if the resize alone doesn't get a
  // typical photo under the target size — this is a fixed, small ladder,
  // not an unbounded retry loop.
  const qualitySteps = [82, 65, 50];
  let lastBuffer: Buffer | null = null;
  let outputWidth = 0;
  let outputHeight = 0;

  try {
    for (const quality of qualitySteps) {
      const pipeline = sharp(raw)
        .rotate() // apply EXIF orientation, then strip it
        .resize({
          width: maxLongEdgePx,
          height: maxLongEdgePx,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality, mozjpeg: true });

      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
      lastBuffer = data;
      outputWidth = info.width;
      outputHeight = info.height;

      if (data.byteLength <= targetCompressedBytes) {
        break;
      }
    }
  } catch {
    // metadata() above can succeed on a file whose header parses fine but
    // whose pixel data is corrupt/truncated — the real decode only
    // happens here. Same user-facing outcome as a metadata() failure:
    // a clean 400, not an uncaught 500.
    throw new ImageProcessingError("Image file could not be read.");
  }

  if (!lastBuffer) {
    throw new ImageProcessingError("Image could not be processed.", 500);
  }

  return {
    buffer: lastBuffer,
    mimeType: "image/jpeg",
    width: outputWidth,
    height: outputHeight,
  };
}
