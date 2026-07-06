import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { useLongPress } from '../hooks/useLongPress';
import { cn } from '../lib/utils';

interface LongPressWrapperProps extends Omit<HTMLMotionProps<"div">, 'onClick' | 'onDragStart' | 'onDragEnd' | 'onDrag'> {
  onLongPress: () => void;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function LongPressWrapper({ onLongPress, onClick, disabled, className, children, ...props }: LongPressWrapperProps) {
  const { isPressed, ...longPressProps } = useLongPress({
    onLongPress,
    onClick,
    disabled
  });

  return (
    <motion.div 
      {...longPressProps} 
      {...(props as any)}
      className={cn(
        className,
        isPressed && "scale-[0.98] opacity-90 transition-all duration-200"
      )}
    >
      {children}
    </motion.div>
  );
}
