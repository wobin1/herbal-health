import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  configured = true;
}

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export async function uploadImageToCloudinary(
  bytes: Buffer,
  folder: string,
): Promise<CloudinaryUploadResult> {
  ensureConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `herbal-health/${folder}`, resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(error instanceof Error ? error : new Error('Cloudinary upload failed'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(bytes);
  });
}
