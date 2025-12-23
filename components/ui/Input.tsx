import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="flex flex-col mb-4">
      {label && <label className="text-sm font-semibold text-brand-blue mb-1">{label}</label>}
      <input
        className={`border-2 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all duration-200 
        ${error ? 'border-brand-red' : 'border-gray-300'} ${className}`}
        {...props}
      />
      {error && <span className="text-brand-red text-xs mt-1">{error}</span>}
    </div>
  );
};