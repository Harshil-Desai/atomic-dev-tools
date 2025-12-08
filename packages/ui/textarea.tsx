import * as React from 'react';
import { cn } from './lib/utils';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[100px] w-full rounded-md border border-border bg-card/70 px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground/70 font-mono",
        "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60",
        "hover:border-primary/40 transition-all duration-200 resize-y",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";