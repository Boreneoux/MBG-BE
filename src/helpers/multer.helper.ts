import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { cwd } from 'process';

/**
 * @contoh
 * // Memory storage for Cloudinary upload
 * multerUpload('', 'IMG-EVENT').single('image')
 *
 * // Disk storage with custom formats
 * multerUpload('src/uploads', 'IMG-EVENT', ['jpg', 'png'], 'disk').array('images', 5)
 */

export function multerUpload(
  directory: string,
  uniqueFileName: string,
  allowedFileFormat: string[] = ['jpg', 'jpeg', 'png', 'webp'],
  storageType: 'disk' | 'memory' = 'memory'
) {
  const storage =
    storageType === 'disk'
      ? multer.diskStorage({
          destination(_req, _file, cb) {
            const mainDirectory = path.join(cwd());
            cb(null, `${mainDirectory}/${directory}`);
          },
          filename(_req, file, cb) {
            const ext = file.originalname.split('.').pop()?.toLowerCase();
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            cb(null, `${uniqueFileName}-${uniqueSuffix}.${ext}`);
          }
        })
      : multer.memoryStorage();

  function fileFilter(
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) {
    const ext = file.originalname.split('.').pop()?.toLowerCase();

    if (!ext || !allowedFileFormat.includes(ext)) {
      return cb(new Error('Format file not accepted'));
    }

    cb(null, true);
  }

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 1 * 1024 * 1024 } // 1 MB
  });
}
