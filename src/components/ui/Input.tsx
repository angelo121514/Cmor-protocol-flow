import React, { type InputHTMLAttributes, forwardRef, useId } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className = "", ...props }, ref) => {
    const generatedId = useId();
    const inputId = props.id || props.name || generatedId;
    return (
      <div className="w-full">
        {label && (
          <label className="label" htmlFor={inputId}>
            {label}
            {props.required && <span aria-hidden="true" className="text-error ml-1">*</span>}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            className={`input ${icon ? "pl-10" : ""} ${
              error ? "border-error focus:ring-error" : ""
            } ${className}`}
            {...props}
            id={inputId}
          />
        </div>
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
        {helperText && !error && (
          <p className="mt-1 text-sm text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
