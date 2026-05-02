import { prisma } from '../config/prisma-client.config';
import { AppError } from '../utils/AppError';
import logger from '../config/logger.config';
import { cartRepository } from '../repositories/cart.repository';
import { AddToCartInput, UpdateCartItemInput, Tx } from '../types/cart';
import { Prisma } from '../../generated/prisma/client';

// ─── Service ──────────────────────────────────────────────────────────────────

export const cartService = {
  async getCart(userId: string) {
    const cart = await cartRepository.findCartByUserId(userId);

    if (!cart) {
      return null;
    }

    const now = new Date();
    const discounts = await prisma.discount.findMany({
      where: {
        store_id: cart.store_id,
        is_active: true,
        deleted_at: null,
        OR: [{ started_at: null }, { started_at: { lte: now } }],
        AND: [{ OR: [{ expired_at: null }, { expired_at: { gte: now } }] }]
      }
    });

    const enrichedCartItems = cart.cart_items.map((item) => {
      const unitPrice = new Prisma.Decimal(item.product.price);
      let discountAmount = new Prisma.Decimal(0);
      let discountId: string | undefined;
      let isBogo = false;

      const applicable = discounts.filter(
        d => d.product_id === item.product_id || d.product_id === null
      );

      for (const d of applicable) {
        if (d.type === 'buy_one_get_one') {
          const freeQty = Math.floor(item.quantity / 2);
          const bogoDiscount = unitPrice.mul(freeQty);
          if (bogoDiscount.gt(discountAmount)) {
            discountAmount = bogoDiscount;
            discountId = d.id;
            isBogo = true;
          }
        } else if (d.type === 'percentage' && d.value) {
          const pct = d.value.div(100);
          let pctDiscount = unitPrice.mul(item.quantity).mul(pct);
          if (d.max_discount_value) {
            pctDiscount = Prisma.Decimal.min(pctDiscount, d.max_discount_value);
          }
          if (pctDiscount.gt(discountAmount)) {
            discountAmount = pctDiscount;
            discountId = d.id;
            isBogo = false;
          }
        } else if (d.type === 'nominal' && d.value) {
          if (d.value.gt(discountAmount)) {
            discountAmount = d.value;
            discountId = d.id;
            isBogo = false;
          }
        }
      }

      return {
        ...item,
        discount_amount: discountAmount,
        discount_id: discountId,
        is_bogo_item: isBogo,
        original_total_price: unitPrice.mul(item.quantity),
        total_price: unitPrice.mul(item.quantity).sub(discountAmount)
      };
    });

    return {
      ...cart,
      cart_items: enrichedCartItems
    };
  },

  async addItem(userId: string, input: AddToCartInput) {
    const { product_id, quantity, store_id } = input;

    // Verify user is verified
    const user = await cartRepository.findUserById(userId);
    if (!user) throw new AppError('User not found', 404);
    if (!user.is_verified) {
      throw new AppError(
        'Please verify your email before adding items to cart',
        403
      );
    }

    // Check stock availability
    const inventory = await cartRepository.findStoreInventory(
      store_id,
      product_id
    );
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
        cart = (await cartRepository.createCart(userId, store_id, tx)) as any;
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

    logger.info(
      `Cart item added: user=${userId}, product=${product_id}, qty=${input.quantity}`
    );
    return cartItem;
  },

  async updateItem(
    userId: string,
    cartItemId: string,
    input: UpdateCartItemInput
  ) {
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

    const updated = await cartRepository.updateCartItemQuantity(
      cartItemId,
      quantity
    );

    logger.info(`Cart item updated: id=${cartItemId}, qty=${quantity}`);
    return updated;
  },

  async deleteItem(userId: string, cartItemId: string) {
    const cartItem = await cartRepository.findCartItemById(cartItemId);
    if (!cartItem) throw new AppError('Cart item not found', 404);

    // Verify ownership
    if (cartItem.cart.user_id !== userId) {
      throw new AppError('Cart item not found', 404);
    }

    await prisma.$transaction(async (tx: Tx) => {
      await cartRepository.deleteCartItem(cartItemId, tx);

      // If cart is now empty, delete it
      const remaining = await cartRepository.countCartItems(
        cartItem.cart.id,
        tx
      );
      if (remaining === 0) {
        await cartRepository.deleteCart(cartItem.cart.id, tx);
      }
    });

    logger.info(`Cart item deleted: id=${cartItemId}, user=${userId}`);
  }
};
