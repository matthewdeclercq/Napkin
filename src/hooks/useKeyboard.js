import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

/**
 * Custom hook to handle keyboard visibility changes
 * @returns {boolean} isKeyboardVisible - Whether the keyboard is currently visible
 */
export function useKeyboard() {
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    // Cleanup listeners on unmount
    return () => {
      showListener?.remove();
      hideListener?.remove();
    };
  }, []);

  return isKeyboardVisible;
}
