import { categoryRepository } from '../repositories/category.repository';
import { AppError } from '../utils/AppError';
import { cloudinaryUpload, cloudinaryDelete, buildCloudinaryFolder } from '../helpers/cloudinary.helper';

export const categoryService = {
    getCategories(search?: string) {
        return categoryRepository.findAll(search);
    },

    async getCategoryById(id: number) {
        const category = await categoryRepository.findById(id);
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

        let uploadedImage: { secureUrl: string; publicId: string } | null = null;
        try {
            if (file) {
                const folder = buildCloudinaryFolder('categories', `temp-${Date.now()}`, 'images');
                uploadedImage = await cloudinaryUpload(file.buffer, folder);
            }
            return await categoryRepository.create({
                name,
                ...(uploadedImage && { image_url: uploadedImage.secureUrl, public_id: uploadedImage.publicId })
            });
        } catch (error) {
            if (uploadedImage) {
                await cloudinaryDelete(uploadedImage.publicId).catch(() => null);
            }
            throw error;
        }
    },

    async updateCategory(id: number, name: string, file?: Express.Multer.File) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new AppError('Category not found', 404);
        }

        const existing = await categoryRepository.findByName(name);
        if (existing && existing.id !== id) {
            throw new AppError('Category with this name already exists', 400);
        }

        let uploadedImage: { secureUrl: string; publicId: string } | null = null;
        try {
            if (file) {
                const folder = buildCloudinaryFolder('categories', id.toString(), 'images');
                uploadedImage = await cloudinaryUpload(file.buffer, folder);
            }
            return await categoryRepository.update(id, {
                name,
                ...(uploadedImage && { image_url: uploadedImage.secureUrl, public_id: uploadedImage.publicId })
            });
        } catch (error) {
            if (uploadedImage) {
                await cloudinaryDelete(uploadedImage.publicId).catch(() => null);
            }
            throw error;
        }
    },

    async deleteCategory(id: number) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new AppError('Category not found', 404);
        }

        return categoryRepository.softDelete(id);
    }
};
