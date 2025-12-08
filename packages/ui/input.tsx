import * as React from 'react';
import { cn } from './lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-card/70 px-3 py-2 text-sm text-foreground",
          "placeholder:text-muted-foreground/70",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/60",
          "hover:border-primary/40 transition-all duration-200",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

// File input variant
export const FileInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="file"
        ref={ref}
        className={cn(
          'flex h-10 w-full rounded-md border border-border bg-card px-3 py-1.5',
          'text-sm text-foreground file:text-foreground',
          'transition-all duration-200 ease-out',
          'file:mr-4 file:py-1 file:px-3 file:rounded-md',
          'file:border file:border-primary/30 file:bg-primary/10',
          'file:text-sm file:font-medium file:text-primary',
          'hover:file:bg-primary/20 hover:border-secondary/60',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary/50',
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-card',
          'file:cursor-pointer file:transition-colors',
          className,
        )}
        {...props}
      />
    );
  },
);

FileInput.displayName = 'FileInput';

// Search input variant
export const SearchInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <Input
          ref={ref}
          type="search"
          className={cn('pl-10', className)}
          {...props}
        />
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';

// Label component for inputs
export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'text-sm font-medium text-foreground mb-2 block',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className
      )}
      {...props}
    />
  )
);
Label.displayName = 'Label';

// Input with label wrapper
interface InputGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const InputGroup = React.forwardRef<HTMLDivElement, InputGroupProps>(
  ({ className, label, error, hint, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)} {...props}>
        {label && <Label>{label}</Label>}
        {children}
        {error && (
          <p className="text-sm text-accent flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="text-xs text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
InputGroup.displayName = 'InputGroup';

// Input with leading icon
interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  position?: 'left' | 'right';
}

export const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ className, icon, position = 'left', ...props }, ref) => {
    return (
      <div className="relative">
        {icon && position === 'left' && (
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <div className="text-muted-foreground">
              {icon}
            </div>
          </div>
        )}
        <Input
          ref={ref}
          className={cn(
            position === 'left' ? 'pl-10' : 'pr-10',
            className
          )}
          {...props}
        />
        {icon && position === 'right' && (
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
            <div className="text-muted-foreground">
              {icon}
            </div>
          </div>
        )}
      </div>
    );
  }
);
InputWithIcon.displayName = 'InputWithIcon';