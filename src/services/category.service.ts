import { categoryRepository } from '../repositories/category.repository';
import { AppError } from '../utils/AppError';
import {
  cloudinaryUpload,
  cloudinaryDelete,
  buildCloudinaryFolder
} from '../helpers/cloudinary.helper';
import { generateUniqueSlug } from '../utils/slug.helper';

export const categoryService = {
  getCategories(search?: string) {
    return categoryRepository.findAll(search);
  },

  async getCategoryById(id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    return category;
  },

  async getCategoryBySlug(slug: string) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    return category;
  },

  async createCategory(name: string, file?: Express.Multer.File) {
    const existing = await categoryRepository.findByName(name);
    if (existing) {
      throw new AppError('Category with this name already exists', 400);
    }

    const slug = await generateUniqueSlug(name, s =>
      categoryRepository.findBySlug(s).then(Boolean)
    );

    let uploadedImage: { secureUrl: string; publicId: string } | null = null;
    try {
      if (file) {
        const folder = buildCloudinaryFolder(
          'categories',
          `temp-${Date.now()}`,
          'images'
        );
        uploadedImage = await cloudinaryUpload(file.buffer, folder);
      }
      return await categoryRepository.create({
        name,
        slug,
        ...(uploadedImage && {
          image_url: uploadedImage.secureUrl,
          public_id: uploadedImage.publicId
        })
      });
    } catch (error) {
      if (uploadedImage) {
        await cloudinaryDelete(uploadedImage.publicId).catch(() => null);
      }
      throw error;
    }
  },

  async updateCategory(slug: string, name: string, file?: Express.Multer.File) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw new AppError('Category not found', 404);
    }
    const id = category.id;

    const existing = await categoryRepository.findByName(name);
    if (existing && existing.id !== id) {
      throw new AppError('Category with this name already exists', 400);
    }

    const nameChanged = name && name !== category.name;
    const newSlug = nameChanged
      ? await generateUniqueSlug(name, s =>
          categoryRepository.findBySlug(s).then(Boolean)
        )
      : undefined;

    let uploadedImage: { secureUrl: string; publicId: string } | null = null;
    try {
      if (file) {
        const folder = buildCloudinaryFolder('categories', id, 'images');
        uploadedImage = await cloudinaryUpload(file.buffer, folder);
      }
      return await categoryRepository.update(id, {
        name,
        ...(newSlug && { slug: newSlug }),
        ...(uploadedImage && {
          image_url: uploadedImage.secureUrl,
          public_id: uploadedImage.publicId
        })
      });
    } catch (error) {
      if (uploadedImage) {
        await cloudinaryDelete(uploadedImage.publicId).catch(() => null);
      }
      throw error;
    }
  },

  async deleteCategory(slug: string) {
    const category = await categoryRepository.findBySlug(slug);
    if (!category) {
      throw new AppError('Category not found', 404);
    }

    return categoryRepository.softDelete(category.id);
  }
};
