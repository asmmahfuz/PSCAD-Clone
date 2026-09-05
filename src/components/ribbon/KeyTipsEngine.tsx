import { useState, useEffect, useCallback } from 'react';

export interface KeyTipActionMap {
  [key: string]: () => void;
}

export function useKeyTips(actions: KeyTipActionMap) {
  const [showKeytips, setShowKeytips] = useState<boolean>(false);
  const [activeKeySequence, setActiveKeySequence] = useState<string>('');

  const dismissKeytips = useCallback(() => {
    setShowKeytips(false);
    setActiveKeySequence('');
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle KeyTips on standalone Alt key press
      if (e.key === 'Alt') {
        e.preventDefault();
        setShowKeytips((prev) => !prev);
        setActiveKeySequence('');
        return;
      }

      if (!showKeytips) return;

      // Dismiss on Escape
      if (e.key === 'Escape') {
        dismissKeytips();
        return;
      }

      // If keytips active, capture character
      const char = e.key.toUpperCase();
      if (actions[char]) {
        e.preventDefault();
        actions[char]();
        dismissKeytips();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKeytips, actions, dismissKeytips]);

  return {
    showKeytips,
    activeKeySequence,
    dismissKeytips,
    setShowKeytips,
  };
}
