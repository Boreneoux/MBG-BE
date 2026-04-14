import { categoryRepository } from '../repositories/category.repository';
import { AppError } from '../utils/AppError';

export class CategoryService {
    async getCategories(search?: string) {
        return categoryRepository.findAll(search);
    }

    async getCategoryById(id: number) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new AppError('Category not found', 404);
        }
        return category;
    }

    async createCategory(name: string) {
        const existing = await categoryRepository.findByName(name);
        if (existing) {
            throw new AppError('Category with this name already exists', 400);
        }

        return categoryRepository.create({ name });
    }

    async updateCategory(id: number, name: string) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new AppError('Category not found', 404);
        }

        const existing = await categoryRepository.findByName(name);
        if (existing && existing.id !== id) {
            throw new AppError('Category with this name already exists', 400);
        }

        return categoryRepository.update(id, { name });
    }

    async deleteCategory(id: number) {
        const category = await categoryRepository.findById(id);
        if (!category) {
            throw new AppError('Category not found', 404);
        }

        return categoryRepository.softDelete(id);
    }
}

export const categoryService = new CategoryService();
