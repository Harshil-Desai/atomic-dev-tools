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
        'bg-primary text-primary-foreground border border-primary/20',
        'hover:bg-primary/90 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10',
        'active:scale-[0.98] focus-visible:ring-primary/50'
      ),
      secondary: cn(
        'bg-secondary text-secondary-foreground border border-secondary/30',
        'hover:bg-secondary/80 hover:border-secondary/50',
        'active:scale-[0.98] focus-visible:ring-secondary/50'
      ),
      outline: cn(
        'border border-border bg-transparent text-foreground',
        'hover:border-foreground hover:bg-foreground/5',
        'active:bg-foreground/10 focus-visible:ring-foreground/50',
        'transition-all duration-200'
      ),
      ghost: cn(
        'text-muted-foreground bg-transparent',
        'hover:text-foreground hover:bg-foreground/10',
        'active:bg-foreground/20 focus-visible:ring-foreground/50',
        'rounded-md transition-colors duration-150'
      ),
      destructive: cn(
        'bg-muted text-foreground border border-border',
        'hover:bg-muted/70 hover:border-border/80',
        'active:scale-[0.98] focus-visible:ring-border/50',
        'transition-all duration-200 shadow-sm'
      ),
      link: cn(
        'text-foreground bg-transparent p-0 underline-offset-4',
        'hover:text-muted-foreground hover:underline',
        'focus-visible:ring-foreground/50 focus-visible:outline-none',
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
          return 'text-primary-foreground';
        case 'secondary':
          return 'text-secondary-foreground';
        default:
          return 'text-foreground';
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
        className='absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent'
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
      if (variant === 'default') return 'bg-primary-foreground/30';
      return 'bg-foreground/20';
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