import { Prisma } from '../../generated/prisma/client';
import { productRepository } from '../repositories/product.repository';
import { AppError } from '../utils/AppError';
import {
  cloudinaryUpload,
  cloudinaryDelete,
  buildCloudinaryFolder
} from '../helpers/cloudinary.helper';
import { generateUniqueSlug } from '../utils/slug.helper';

export const productService = {
  async getProducts(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    storeId?: string;
    sort?: string;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const [products, total] = await productRepository.findAll({
      skip,
      take: limit,
      search: params.search,
      categoryId: params.categoryId,
      storeId: params.storeId,
      sort: params.sort
    });

    return {
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async getProductById(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return product;
  },

  async getProductBySlug(slug: string) {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    return product;
  },

  async createProduct(data: any, files?: Express.Multer.File[]) {
    const existing = await productRepository.findByName(data.name);
    if (existing) {
      throw new AppError('Product with this name already exists', 400);
    }

    const uploadedImages: { secureUrl: string; publicId: string }[] = [];

    try {
      if (files && files.length > 0) {
        const folder = buildCloudinaryFolder(
          'products',
          `temp-${Date.now()}`,
          'images'
        );
        for (const file of files) {
          const result = await cloudinaryUpload(file.buffer, folder);
          uploadedImages.push(result);
        }
      }

      const slug = await generateUniqueSlug(data.name, s =>
        productRepository.findBySlug(s).then(Boolean)
      );

      const createData: Prisma.ProductCreateInput = {
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        weight: data.weight,
        category: { connect: { id: data.category_id } }
      };

      const primaryIndex =
        data.primaryIndex !== undefined ? parseInt(data.primaryIndex) : 0;
      return await productRepository.create(
        createData,
        uploadedImages,
        primaryIndex
      );
    } catch (error) {
      if (uploadedImages.length > 0) {
        await Promise.all(
          uploadedImages.map(img =>
            cloudinaryDelete(img.publicId).catch(() => null)
          )
        );
      }
      throw error;
    }
  },

  async updateProduct(slug: string, data: any, files?: Express.Multer.File[]) {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new AppError('Product not found', 404);
    }
    const id = product.id;

    if (data.name) {
      const existing = await productRepository.findByName(data.name);
      if (existing && existing.id !== id) {
        throw new AppError('Product with this name already exists', 400);
      }
    }

    const uploadedImages: { secureUrl: string; publicId: string }[] = [];

    try {
      if (files && files.length > 0) {
        const folder = buildCloudinaryFolder('products', id, 'images');
        for (const file of files) {
          const result = await cloudinaryUpload(file.buffer, folder);
          uploadedImages.push(result);
        }
      }

      const nameChanged = data.name && data.name !== product.name;
      const newSlug = nameChanged
        ? await generateUniqueSlug(data.name, s =>
            productRepository.findBySlug(s).then(Boolean)
          )
        : undefined;

      const updateData: Prisma.ProductUpdateInput = {
        ...(data.name && {
          name: data.name,
          ...(newSlug && { slug: newSlug })
        }),
        ...(data.description !== undefined && {
          description: data.description
        }),
        ...(data.price && { price: data.price }),
        ...(data.weight && { weight: data.weight }),
        ...(data.category_id && {
          category: { connect: { id: data.category_id } }
        })
      };

      const primaryIndex =
        data.primaryIndex !== undefined
          ? parseInt(data.primaryIndex)
          : undefined;

      let deleteImageIds: string[] | undefined = undefined;
      if (data.deleteImageIds) {
        const idsArray = Array.isArray(data.deleteImageIds)
          ? data.deleteImageIds
          : [data.deleteImageIds];
        deleteImageIds = idsArray.map((id: string) => String(id));
      }

      return await productRepository.update(
        id,
        updateData,
        uploadedImages,
        primaryIndex,
        deleteImageIds
      );
    } catch (error) {
      if (uploadedImages.length > 0) {
        await Promise.all(
          uploadedImages.map(img =>
            cloudinaryDelete(img.publicId).catch(() => null)
          )
        );
      }
      throw error;
    }
  },

  async deleteProduct(slug: string) {
    const product = await productRepository.findBySlug(slug);
    if (!product) {
      throw new AppError('Product not found', 404);
    }

    return productRepository.softDelete(product.id);
  }
};
