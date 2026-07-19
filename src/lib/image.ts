"use client";

interface CompressedImage {
  /** Raw base64 JPEG — no `data:` URL prefix. */
  data: string;
  mimeType: "image/jpeg";
}

/**
 * Downscales a picked photo and re-encodes it as JPEG base64.
 *
 * Three reasons this isn't just a FileReader:
 * - A modern phone photo base64s to several MB, past Next.js's default 1MB
 *   server-action body limit.
 * - iPhones hand back HEIC, which Gemini won't accept; drawing through a
 *   canvas re-encodes it to JPEG (Safari decodes HEIC natively).
 * - Food identification gains nothing from 4000px, and the smaller payload
 *   is meaningfully faster to upload on mobile data.
 */
export async function fileToCompressedBase64(
  file: File,
  { maxDimension = 1024, quality = 0.8 }: { maxDimension?: number; quality?: number } = {},
): Promise<CompressedImage> {
  const source = await loadImage(file);

  const { width: sourceWidth, height: sourceHeight } = getDimensions(source);
  if (!sourceWidth || !sourceHeight) {
    throw new Error("Could not read that image.");
  }

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not read that image.");
  context.drawImage(source, 0, 0, width, height);

  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    source.close();
  }

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return { data: dataUrl.slice(dataUrl.indexOf(",") + 1), mimeType: "image/jpeg" };
}

function getDimensions(source: ImageBitmap | HTMLImageElement) {
  return source instanceof HTMLImageElement
    ? { width: source.naturalWidth, height: source.naturalHeight }
    : { width: source.width, height: source.height };
}

/**
 * `createImageBitmap` is preferred because `imageOrientation: "from-image"`
 * applies EXIF rotation — without it, photos taken in portrait land sideways
 * on the canvas. Falls back to an <img> where it isn't available.
 */
async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> path below.
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
}
