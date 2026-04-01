/**
 * AI History Service Layer
 * 
 * Encapsulates AI recognition history-related business logic
 * - Get user history
 * - Delete history with ownership verification
 */

import {
  getUserAIRecognitionHistory,
  deleteAIRecognitionHistory,
} from '../db';
import { logger } from '../_core/logger';
import { TRPCError } from '@trpc/server';

/**
 * Get user AI recognition history
 */
export async function getUserHistory(
  userId: number,
  limit?: number,
  requestId?: string
): Promise<any[]> {
  try {
    logger.info(
      '[AIHistoryService] Fetching user AI history',
      `User ID: ${userId}, Limit: ${limit || 'default'}`,
      { userId, limit, requestId }
    );

    const history = await getUserAIRecognitionHistory(userId, limit);

    logger.info(
      '[AIHistoryService] User AI history fetched',
      `Found ${history.length} records`,
      { userId, count: history.length, limit, requestId }
    );

    return history;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[AIHistoryService] Failed to fetch user AI history',
      { error: errorMessage, userId, requestId }
    );
    throw error;
  }
}

/**
 * Delete AI recognition history with ownership verification
 */
export async function deleteHistory(
  userId: number,
  historyId: number,
  requestId?: string
): Promise<void> {
  try {
    logger.info(
      '[AIHistoryService] Deleting AI history',
      `History ID: ${historyId}`,
      { userId, historyId, requestId }
    );

    // Verify ownership by checking if history belongs to user
    const history = await getUserAIRecognitionHistory(userId);
    const record = history.find((h: any) => h.id === historyId);

    if (!record) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Access denied',
      });
    }

    await deleteAIRecognitionHistory(userId, historyId);

    logger.info(
      '[AIHistoryService] AI history deleted',
      `History ID: ${historyId}`,
      { userId, historyId, requestId }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      '[AIHistoryService] Failed to delete AI history',
      { error: errorMessage, userId, historyId, requestId }
    );
    throw error;
  }
}
