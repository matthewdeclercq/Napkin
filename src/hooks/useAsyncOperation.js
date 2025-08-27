import { useState, useCallback, useEffect, useRef } from 'react';
import { withErrorHandling, getUserFriendlyErrorMessage } from '../utils/errorHandling';

/**
 * Custom hook for handling async operations with loading states and error handling
 * @param {Function} operation - The async operation function
 * @param {Object} options - Configuration options
 * @returns {Object} Hook state and handlers
 */
export function useAsyncOperation(operation, options = {}) {
  const {
    onSuccess,
    onError,
    showErrorToast = true,
    operationName = 'operation',
    allowConcurrent = false // Allow multiple concurrent calls
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    // For loadNapkins, allow concurrent calls to prevent blocking
    if (!allowConcurrent && isLoading) {
      if (__DEV__) {
        console.warn(`[${operationName}] Operation already in progress, skipping duplicate call`);
      }
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await withErrorHandling(
        () => operation(...args),
        operationName,
        { showUserMessage: showErrorToast }
      );

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (error) {
      const userMessage = getUserFriendlyErrorMessage(error);
      setError(userMessage);

      if (onError) {
        onError(error);
      }

      throw error; // Re-throw so calling code can handle if needed
    } finally {
      setIsLoading(false);
    }
  }, [operation, onSuccess, onError, showErrorToast, operationName, allowConcurrent]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  // Fallback mechanism to prevent loading states from getting stuck
  const loadingStartTime = useRef(null);

  useEffect(() => {
    if (isLoading) {
      loadingStartTime.current = Date.now();

      const timeoutId = setTimeout(() => {
        if (__DEV__) {
          console.warn(`[${operationName}] Operation has been loading for 30+ seconds, this might indicate an issue`);
        }
        // Don't automatically reset loading state, but warn about it
      }, 30000);

      return () => clearTimeout(timeoutId);
    } else {
      loadingStartTime.current = null;
    }
  }, [isLoading, operationName]);

  return {
    execute,
    isLoading,
    error,
    resetError
  };
}
