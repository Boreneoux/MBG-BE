import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { Tx } from '../types/cart';

type Db = Tx | typeof prisma;

export const cartRepository = {
  findCartByUserId(userId: string, db: Db = prisma) {
    return db.cart.findUnique({
      where: { user_id: userId },
      include: {
        cart_items: {
          include: {
            product: {
              include: { product_images: { where: { is_primary: true } } }
            }
          }
        },
        store: { select: { id: true, name: true } }
      }
    });
  },

  findCartItemById(id: string, db: Db = prisma) {
    return db.cartItem.findUnique({
      where: { id },
      include: {
        cart: { select: { id: true, user_id: true, store_id: true } },
        product: { select: { id: true, name: true } }
      }
    });
  },

  findCartItemByCartAndProduct(
    cartId: string,
    productId: string,
    db: Db = prisma
  ) {
    return db.cartItem.findUnique({
      where: { cart_id_product_id: { cart_id: cartId, product_id: productId } }
    });
  },

  createCart(userId: string, storeId: string, db: Db = prisma) {
    return db.cart.create({
      data: { user_id: userId, store_id: storeId }
    });
  },

  createCartItem(
    data: { cart_id: string; product_id: string; quantity: number },
    db: Db = prisma
  ) {
    return db.cartItem.create({
      data,
      include: {
        product: {
          include: { product_images: { where: { is_primary: true } } }
        }
      }
    });
  },

  updateCartItemQuantity(id: string, quantity: number, db: Db = prisma) {
    return db.cartItem.update({
      where: { id },
      data: { quantity },
      include: {
        product: {
          include: { product_images: { where: { is_primary: true } } }
        }
      }
    });
  },

  deleteCartItem(id: string, db: Db = prisma) {
    return db.cartItem.delete({ where: { id } });
  },

  countCartItems(cartId: string, db: Db = prisma) {
    return db.cartItem.count({ where: { cart_id: cartId } });
  },

  deleteCart(id: string, db: Db = prisma) {
    return db.cart.delete({ where: { id } });
  },

  findStoreInventory(storeId: string, productId: string, db: Db = prisma) {
    return db.storeInventory.findUnique({
      where: {
        store_id_product_id: { store_id: storeId, product_id: productId }
      }
    });
  },

  findUserById(userId: string, db: Db = prisma) {
    return db.user.findUnique({
      where: { id: userId },
      select: { id: true, is_verified: true }
    });
  }
};
