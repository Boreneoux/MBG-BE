import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../config/prisma-client.config';
import { Tx } from '../types/cart';

type Db = Tx | typeof prisma;

export const cartRepository = {
  findCartByUserId(userId: number, db: Db = prisma) {
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

  findCartItemById(id: number, db: Db = prisma) {
    return db.cartItem.findUnique({
      where: { id },
      include: {
        cart: { select: { id: true, user_id: true, store_id: true } },
        product: { select: { id: true, name: true } }
      }
    });
  },

  findCartItemByCartAndProduct(
    cartId: number,
    productId: number,
    db: Db = prisma
  ) {
    return db.cartItem.findUnique({
      where: { cart_id_product_id: { cart_id: cartId, product_id: productId } }
    });
  },

  createCart(userId: number, storeId: number, db: Db = prisma) {
    return db.cart.create({
      data: { user_id: userId, store_id: storeId }
    });
  },

  createCartItem(
    data: { cart_id: number; product_id: number; quantity: number },
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

  updateCartItemQuantity(id: number, quantity: number, db: Db = prisma) {
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

  deleteCartItem(id: number, db: Db = prisma) {
    return db.cartItem.delete({ where: { id } });
  },

  countCartItems(cartId: number, db: Db = prisma) {
    return db.cartItem.count({ where: { cart_id: cartId } });
  },

  deleteCart(id: number, db: Db = prisma) {
    return db.cart.delete({ where: { id } });
  },

  findStoreInventory(storeId: number, productId: number, db: Db = prisma) {
    return db.storeInventory.findUnique({
      where: { store_id_product_id: { store_id: storeId, product_id: productId } }
    });
  },

  findUserById(userId: number, db: Db = prisma) {
    return db.user.findUnique({
      where: { id: userId },
      select: { id: true, is_verified: true }
    });
  }
};
