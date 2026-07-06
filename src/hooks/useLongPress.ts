import { useRef, useCallback, useState, useEffect } from 'react';

interface LongPressOptions {
  onLongPress: (event?: any) => void;
  onClick?: (event?: any) => void;
  ms?: number;
  moveTolerance?: number;
  disabled?: boolean;
}

export function useLongPress({ onLongPress, onClick, ms = 450, moveTolerance = 10, disabled = false }: LongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const [isPressed, setIsPressed] = useState(false);

  const clearPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPressed(false);
  }, []);

  useEffect(() => clearPress, [clearPress]);

  const start = useCallback((event: React.PointerEvent) => {
    // Ignore right-clicks
    if (event.pointerType === "mouse" && event.button !== 0) return;

    isLongPressActive.current = false;
    startPos.current = { x: event.clientX, y: event.clientY };
    setIsPressed(true);
    
    if (!disabled) {
      timeoutRef.current = setTimeout(() => {
        isLongPressActive.current = true;
        onLongPress(event);
        setIsPressed(false);
        startPos.current = null;
      }, ms);
    }
  }, [onLongPress, ms, disabled]);

  const move = useCallback((event: React.PointerEvent) => {
    if (!startPos.current && !timeoutRef.current) return;
    
    const dx = Math.abs(event.clientX - (startPos.current?.x || 0));
    const dy = Math.abs(event.clientY - (startPos.current?.y || 0));
    
    // Cancel if user moves past the threshold (scrolling/dragging)
    if (dx > moveTolerance || dy > moveTolerance) {
      clearPress();
    }
  }, [moveTolerance, clearPress]);

  const stop = useCallback((event: React.PointerEvent) => {
    const wasLongPress = isLongPressActive.current;
    const wasPressed = isPressed; // if true, it wasn't cancelled by movement
    clearPress();

    // Only trigger tap actions if the long-press timer didn't fire and the press wasn't cancelled by movement
    if (!wasLongPress && wasPressed) {
      if (onClick) {
        onClick(event);
      }
    }
  }, [isPressed, onClick, clearPress]);

  return {
    onPointerDown: start,
    onPointerMove: move,
    onPointerUp: stop,
    onPointerCancel: clearPress,
    onPointerLeave: clearPress,
    style: { touchAction: 'pan-y' } as React.CSSProperties,
    'data-pressed': isPressed,
    isPressed
  };
}
