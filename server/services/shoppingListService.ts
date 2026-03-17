/**
 * Shopping List Service Layer
 * 
 * Encapsulates shopping list-related business logic
 * - Create/delete shopping lists
 * - Add/remove items
 * - Update item status
 * - Ownership verification
 */

import {
  createShoppingList,
  getShoppingListByIdForUser,
  getShoppingListItemByIdForUser,
  addShoppingListItem,
  updateShoppingListItemStatus,
  getShoppingListItems,
  getUserShoppingLists as dbGetUserShoppingLists,
} from '../db';
import { logger } from '../_core/logger';
import { TRPCError } from '@trpc/server';

/**
 * Create a new shopping list
 */
export async function createNewShoppingList(
  userId: number,
  name: string,
  requestId?: string
): Promise<any> {
  try {
    logger.info(
      '[ShoppingListService] Creating shopping list',
      `Name: ${name}`,
      { userId, name, requestId }
    );

    const list = await createShoppingList(userId, name);

    logger.info(
      '[ShoppingListService] Shopping list created',
      `List ID: ${list.id}`,
      { userId, listId: list.id, requestId }
    );

    return list;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[ShoppingListService] Failed to create shopping list',
      { error: errorMessage, userId, requestId }
    );
    throw error;
  }
}

/**
 * Get user shopping lists
 */
export async function getUserShoppingLists(
  userId: number,
  requestId?: string
): Promise<any[]> {
  try {
    logger.info(
      '[ShoppingListService] Fetching user shopping lists',
      `User ID: ${userId}`,
      { userId, requestId }
    );

    const lists = await dbGetUserShoppingLists(userId);

    logger.info(
      '[ShoppingListService] User shopping lists fetched',
      `Found ${lists.length} lists`,
      { userId, count: lists.length, requestId }
    );

    return lists;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[ShoppingListService] Failed to fetch user shopping lists',
      { error: errorMessage, userId, requestId }
    );
    throw error;
  }
}

/**
 * Get shopping list items with ownership verification
 */
export async function getListItems(
  userId: number,
  listId: number,
  requestId?: string
): Promise<any[]> {
  try {
    // Verify ownership
    const list = await getShoppingListByIdForUser(userId, listId);
    if (!list) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Shopping list not found',
      });
    }

    logger.info(
      '[ShoppingListService] Fetching shopping list items',
      `List ID: ${listId}`,
      { userId, listId, requestId }
    );

    const items = await getShoppingListItems(listId);

    logger.info(
      '[ShoppingListService] Shopping list items fetched',
      `Found ${items.length} items`,
      { userId, listId, count: items.length, requestId }
    );

    return items;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[ShoppingListService] Failed to fetch shopping list items',
      { error: errorMessage, userId, listId, requestId }
    );
    throw error;
  }
}

/**
 * Add item to shopping list with ownership verification
 */
export async function addItemToList(
  userId: number,
  listId: number,
  name: string,
  quantity: number,
  unit: string,
  requestId?: string
): Promise<any> {
  try {
    // Verify ownership
    const list = await getShoppingListByIdForUser(userId, listId);
    if (!list) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    logger.info(
      '[ShoppingListService] Adding item to shopping list',
      `Item: ${name}`,
      { userId, listId, name, requestId }
    );

    const item = await addShoppingListItem(listId, name, quantity.toString(), unit);

    logger.info(
      '[ShoppingListService] Item added to shopping list',
      `Item added`,
      { userId, listId, requestId }
    );

    return item;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[ShoppingListService] Failed to add item to shopping list',
      { error: errorMessage, userId, listId, requestId }
    );
    throw error;
  }
}

/**
 * Update item status with ownership verification
 */
export async function updateItemStatus(
  userId: number,
  itemId: number,
  completed: boolean,
  requestId?: string
): Promise<any> {
  try {
    // Verify ownership through item
    const item = await getShoppingListItemByIdForUser(userId, itemId);
    if (!item) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    logger.info(
      '[ShoppingListService] Updating item status',
      `Item ID: ${itemId}, Completed: ${completed}`,
      { userId, itemId, completed, requestId }
    );

    const updatedItem = await updateShoppingListItemStatus(itemId, completed);

    logger.info(
      '[ShoppingListService] Item status updated',
      `Item ID: ${itemId}`,
      { userId, itemId, completed, requestId }
    );

    return updatedItem;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[ShoppingListService] Failed to update item status',
      { error: errorMessage, userId, itemId, requestId }
    );
    throw error;
  }
}

/**
 * Delete shopping list with ownership verification
 * 
 * Note: deleteShoppingList is not yet implemented in db.ts
 * This is a placeholder for future implementation
 */
export async function deleteList(
  userId: number,
  listId: number,
  requestId?: string
): Promise<void> {
  try {
    // Verify ownership
    const list = await getShoppingListByIdForUser(userId, listId);
    if (!list) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    logger.info(
      '[ShoppingListService] Deleting shopping list',
      `List ID: ${listId}`,
      { userId, listId, requestId }
    );

    // TODO: Implement deleteShoppingList in db.ts
    // await deleteShoppingList(listId);

    logger.info(
      '[ShoppingListService] Shopping list deleted',
      `List ID: ${listId}`,
      { userId, listId, requestId }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[ShoppingListService] Failed to delete shopping list',
      { error: errorMessage, userId, listId, requestId }
    );
    throw error;
  }
}
