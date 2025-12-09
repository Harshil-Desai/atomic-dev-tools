import * as React from 'react';
import { cn } from './lib/utils';

const baseCard = "rounded-lg border border-border bg-card backdrop-blur-sm transition-all duration-200 hover-lift";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(baseCard, "border-border/60 hover:border-primary/40", className)} {...props} />
  )
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-4 sm:p-5 md:p-6 pb-2 sm:pb-2.5 md:pb-3", className)} {...props} />
  )
);

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-base sm:text-lg font-semibold tracking-tight text-foreground", className)} {...props} />
  )
);

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed", className)} {...props} />
  )
);

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-4 sm:p-5 md:p-6 pt-0", className)} {...props} />
  )
);

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-4 sm:p-5 md:p-6 pt-2 sm:pt-2.5 md:pt-3", className)} {...props} />
  )
);

// Glass-style card (most used in tools)
export const GlassCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        baseCard,
        "bg-card/70 glass border-primary/20 hover:border-primary/50 shadow-xl",
        className
      )}
      {...props}
    />
  )
);
GlassCard.displayName = 'GlassCard';

// Error-style card
export const ErrorCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        baseCard,
        "border-primary/50 bg-primary/5 text-primary",
        className
      )}
      {...props}
    />
  )
);
ErrorCard.displayName = 'ErrorCard';

// Dashed placeholder card
export const PlaceholderCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        baseCard,
        "border-dashed border-primary/30 bg-card/50 text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
PlaceholderCard.displayName = 'PlaceholderCard';