import { v2 as cloudinary } from 'cloudinary';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET
} from '../config/main.config';

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

export interface ICloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

export async function cloudinaryUpload(
  file: Buffer,
  folder: string
): Promise<ICloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder }, (error, result) => {
        if (error || !result) return reject(error);

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id
        });
      })
      .end(file);
  });
}

export async function cloudinaryDelete(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}

export function buildCloudinaryFolder(
  entity: 'users' | 'products' | 'stores',
  entityId: string,
  type: string
) {
  return `${entity}/${entityId}/${type}`;
}
