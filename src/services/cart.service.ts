import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';
import { cartRepository } from '../repositories/cart.repository';
import { AddToCartInput, UpdateCartItemInput, Tx } from '../types/cart';

// ─── Service ──────────────────────────────────────────────────────────────────

export const cartService = {
  async getCart(userId: number) {
    const cart = await cartRepository.findCartByUserId(userId);

    if (!cart) {
      return null;
    }

    return cart;
  },

  async addItem(userId: number, input: AddToCartInput) {
    const { product_id, quantity, store_id } = input;

    // Verify user is verified
    const user = await cartRepository.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.is_verified) {
      throw new AppError('Please verify your email before adding items to cart', 403);
    }

    // Check stock availability
    const inventory = await cartRepository.findStoreInventory(store_id, product_id);
    if (!inventory) {
      throw new AppError('Product is not available at this store', 404);
    }

    const cartItem = await prisma.$transaction(async (tx: Tx) => {
      // Find or create cart
      let cart = await cartRepository.findCartByUserId(userId, tx);

      if (cart && cart.store_id !== store_id) {
        throw new AppError(
          'Your cart contains items from another store. Please clear your cart first.',
          400
        );
      }

      if (!cart) {
        cart = await cartRepository.createCart(userId, store_id, tx) as any;
      }

      // Check if item already exists in cart
      const existingItem = await cartRepository.findCartItemByCartAndProduct(
        cart!.id,
        product_id,
        tx
      );

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantity;

        if (newQuantity > inventory.stock) {
          throw new AppError(
            `Insufficient stock. Available: ${inventory.stock}, in cart: ${existingItem.quantity}`,
            400
          );
        }

        const updated = await cartRepository.updateCartItemQuantity(
          existingItem.id,
          newQuantity,
          tx
        );
        return updated;
      }

      // New item — validate stock
      if (quantity > inventory.stock) {
        throw new AppError(
          `Insufficient stock. Available: ${inventory.stock}`,
          400
        );
      }

      const created = await cartRepository.createCartItem(
        { cart_id: cart!.id, product_id, quantity },
        tx
      );
      return created;
    });

    logger.info(`Cart item added: user=${userId}, product=${product_id}, qty=${input.quantity}`);
    return cartItem;
  },

  async updateItem(userId: number, cartItemId: number, input: UpdateCartItemInput) {
    const { quantity } = input;

    const cartItem = await cartRepository.findCartItemById(cartItemId);
    if (!cartItem) throw new AppError('Cart item not found', 404);

    // Verify ownership
    if (cartItem.cart.user_id !== userId) {
      throw new AppError('Cart item not found', 404);
    }

    // Validate stock
    const inventory = await cartRepository.findStoreInventory(
      cartItem.cart.store_id,
      cartItem.product_id
    );

    if (!inventory || quantity > inventory.stock) {
      throw new AppError(
        `Insufficient stock. Available: ${inventory?.stock ?? 0}`,
        400
      );
    }

    const updated = await cartRepository.updateCartItemQuantity(cartItemId, quantity);

    logger.info(`Cart item updated: id=${cartItemId}, qty=${quantity}`);
    return updated;
  },

  async deleteItem(userId: number, cartItemId: number) {
    const cartItem = await cartRepository.findCartItemById(cartItemId);
    if (!cartItem) throw new AppError('Cart item not found', 404);

    // Verify ownership
    if (cartItem.cart.user_id !== userId) {
      throw new AppError('Cart item not found', 404);
    }

    await prisma.$transaction(async (tx: Tx) => {
      await cartRepository.deleteCartItem(cartItemId, tx);

      // If cart is now empty, delete it
      const remaining = await cartRepository.countCartItems(cartItem.cart.id, tx);
      if (remaining === 0) {
        await cartRepository.deleteCart(cartItem.cart.id, tx);
      }
    });

    logger.info(`Cart item deleted: id=${cartItemId}, user=${userId}`);
  }
};
