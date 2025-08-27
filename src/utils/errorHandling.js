/**
 * Error handling utilities for consistent error management
 */

export class NapkinError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', originalError = null) {
    super(message);
    this.name = 'NapkinError';
    this.code = code;
    this.originalError = originalError;
  }
}

export const ErrorCodes = {
  STORAGE_LOAD_FAILED: 'STORAGE_LOAD_FAILED',
  STORAGE_SAVE_FAILED: 'STORAGE_SAVE_FAILED',
  FORMULA_EVALUATION_ERROR: 'FORMULA_EVALUATION_ERROR',
  INVALID_CELL_REFERENCE: 'INVALID_CELL_REFERENCE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Wraps async operations with consistent error handling
 * @param {Function} operation - The async operation to execute
 * @param {string} operationName - Name of the operation for logging
 * @param {Object} options - Error handling options
 * @returns {Promise} Result of the operation or throws NapkinError
 */
export async function withErrorHandling(operation, operationName = 'operation', options = {}) {
  const {
    showUserMessage = true,
    logError = true,
    rethrow = true
  } = options;

  try {
    return await operation();
  } catch (error) {
    const napkinError = normalizeError(error, operationName);

    if (logError) {
      console.error(`[${operationName}] Error:`, {
        message: napkinError.message,
        code: napkinError.code,
        originalError: napkinError.originalError
      });
    }

    if (showUserMessage && typeof window !== 'undefined') {
      // In a real app, you might want to show a toast or notification here
      console.warn(`[${operationName}] User-facing error:`, napkinError.message);
    }

    if (rethrow) {
      throw napkinError;
    }

    return null;
  }
}

/**
 * Normalizes different error types into NapkinError
 * @param {Error} error - The original error
 * @param {string} context - Context where the error occurred
 * @returns {NapkinError} Normalized error
 */
export function normalizeError(error, context = 'unknown') {
  // If it's already a NapkinError, return as is
  if (error instanceof NapkinError) {
    return error;
  }

  // Handle AsyncStorage errors
  if (error?.message?.includes('AsyncStorage')) {
    return new NapkinError(
      'Failed to save or load data. Please try again.',
      ErrorCodes.STORAGE_SAVE_FAILED,
      error
    );
  }

  // Handle mathjs/formula errors
  if (error?.message?.includes('mathjs') || context === 'formula') {
    return new NapkinError(
      'Invalid formula. Please check your formula syntax.',
      ErrorCodes.FORMULA_EVALUATION_ERROR,
      error
    );
  }

  // Handle network errors
  if (error?.message?.includes('network') || error?.code === 'NETWORK_ERROR') {
    return new NapkinError(
      'Network connection failed. Please check your connection.',
      ErrorCodes.NETWORK_ERROR,
      error
    );
  }

  // Default error
  return new NapkinError(
    error?.message || 'An unexpected error occurred. Please try again.',
    ErrorCodes.UNKNOWN_ERROR,
    error
  );
}

/**
 * Creates a user-friendly error message
 * @param {Error} error - The error to format
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyErrorMessage(error) {
  const normalizedError = error instanceof NapkinError ? error : normalizeError(error);

  switch (normalizedError.code) {
    case ErrorCodes.STORAGE_LOAD_FAILED:
      return 'Failed to load your data. Your changes may not be saved.';
    case ErrorCodes.STORAGE_SAVE_FAILED:
      return 'Failed to save your changes. Please try again.';
    case ErrorCodes.FORMULA_EVALUATION_ERROR:
      return 'Formula error. Please check your formula and try again.';
    case ErrorCodes.INVALID_CELL_REFERENCE:
      return 'Invalid cell reference. Please check your formula.';
    case ErrorCodes.NETWORK_ERROR:
      return 'Connection failed. Please check your internet connection.';
    case ErrorCodes.PERMISSION_DENIED:
      return 'Permission denied. Please check app permissions.';
    default:
      return normalizedError.message || 'An unexpected error occurred.';
  }
}

/**
 * Logs error for debugging while providing user-friendly message
 * @param {Error} error - The error to handle
 * @param {string} context - Context where error occurred
 */
export function handleError(error, context = 'unknown') {
  const normalizedError = normalizeError(error, context);

  // Log technical details for debugging
  console.error(`[${context}] Error:`, {
    message: normalizedError.message,
    code: normalizedError.code,
    stack: normalizedError.stack,
    originalError: normalizedError.originalError
  });

  // Return user-friendly message
  return getUserFriendlyErrorMessage(normalizedError);
}
