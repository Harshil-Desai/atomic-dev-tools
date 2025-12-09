import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from './lib/utils';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'children'> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link' | 'secondary';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  ripple?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'md', isLoading = false, ripple = false, children, disabled, ...props },
    ref,
  ) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (ripple && !disabled && !isLoading) {
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
          x,
          y,
          id: Date.now(),
        };

        setRipples((prev) => [...prev, newRipple]);

        setTimeout(() => {
          setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);
      }

      if (props.onClick && !disabled && !isLoading) {
        props.onClick(e);
      }
    };

    const baseStyles =
      'inline-flex items-center justify-center relative rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:pointer-events-none overflow-hidden interactive';

    const variants = {
      default: cn(
        // Primary button with white
        'bg-white text-black border border-white/20',
        'hover:bg-gray-200 hover:border-white/40 hover:shadow-md hover:shadow-white/10',
        'active:scale-[0.98] focus-visible:ring-white/50'
      ),
      secondary: cn(
        // Secondary button with medium grey
        'bg-[#404040] text-[#F2F2F2] border border-[#404040]/30',
        'hover:border-[#404040]/50 hover:bg-[#4A4A4A]',
        'active:scale-[0.98] focus-visible:ring-[#404040]/50'
      ),
      outline: cn(
        // Outline with grey border
        'border border-[#333333] bg-transparent text-[#D9D9D9]',
        'hover:border-white hover:text-white hover:bg-white/5',
        'active:bg-white/10 focus-visible:ring-white/50',
        'transition-all duration-200'
      ),
      ghost: cn(
        // Ghost with muted colors
        'text-[#999999] bg-transparent',
        'hover:text-[#F2F2F2] hover:bg-white/10',
        'active:bg-white/20 focus-visible:ring-white/50',
        'rounded-md transition-colors duration-150'
      ),
      destructive: cn(
        // Destructive with dark grey
        'bg-[#2A2A2A] text-[#F2F2F2] border border-[#333333]',
        'hover:bg-[#1C1C1C] hover:border-[#404040]',
        'active:scale-[0.98] focus-visible:ring-[#404040]/50',
        'transition-all duration-200 shadow-sm'
      ),
      link: cn(
        // Link with white color
        'text-white bg-transparent p-0 underline-offset-4',
        'hover:text-[#D9D9D9] hover:underline',
        'focus-visible:ring-white/50 focus-visible:outline-none',
        'transition-colors duration-150'
      ),
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-10 w-10 p-0',
    };

    const getSpinnerSize = () => {
      switch (size) {
        case 'sm':
          return 'h-3 w-3';
        case 'lg':
          return 'h-5 w-5';
        case 'icon':
          return 'h-4 w-4';
        default:
          return 'h-4 w-4';
      }
    };

    const getSpinnerColor = () => {
      switch (variant) {
        case 'default':
          return 'text-black';
        case 'secondary':
          return 'text-white';
        case 'destructive':
          return 'text-white';
        case 'outline':
          return 'text-white';
        case 'ghost':
          return 'text-white';
        case 'link':
          return 'text-white';
        default:
          return 'text-white';
      }
    };

    const spinner = (
      <svg
        className={cn('animate-spin', getSpinnerSize(), getSpinnerColor(), variant !== 'link' && 'mr-2')}
        xmlns='http://www.w3.org/2000/svg'
        fill='none'
        viewBox='0 0 24 24'
      >
        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        ></path>
      </svg>
    );

    const shimmerEffect = variant === 'default' && !disabled && !isLoading && (
      <motion.div
        className='absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-gray-300/30 to-transparent'
        style={{ transform: 'translateZ(0)' }}
        initial={{ x: '-100%' }}
        animate={{ x: '200%' }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'linear',
        }}
      />
    );

    const getRippleColor = () => {
      switch (variant) {
        case 'default':
          return 'bg-black/30';
        case 'secondary':
          return 'bg-white/20';
        case 'destructive':
          return 'bg-white/20';
        case 'outline':
          return 'bg-white/20';
        case 'ghost':
          return 'bg-white/20';
        case 'link':
          return 'bg-white/20';
        default:
          return 'bg-white/20';
      }
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], variant !== 'link' && sizes[size], className)}
        disabled={disabled || isLoading}
        onClick={handleClick}
        whileHover={!disabled && !isLoading && variant !== 'link' ? { scale: 1.02, y: -1 } : {}}
        whileTap={!disabled && !isLoading && variant !== 'link' ? { scale: 0.98, y: 0 } : {}}
        initial={false}
        {...props}
      >
        {shimmerEffect}
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            className={cn('absolute rounded-full pointer-events-none', getRippleColor())}
            initial={{ width: 0, height: 0, x: ripple.x, y: ripple.y }}
            animate={{ width: 300, height: 300, x: ripple.x - 150, y: ripple.y - 150, opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        ))}
        {isLoading && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {spinner}
          </motion.span>
        )}
        <span className={cn('relative z-10 inline-flex items-center gap-2', isLoading && 'opacity-70')}>
          {children}
        </span>
      </motion.button>
    );
  },
);

Button.displayName = 'Button';