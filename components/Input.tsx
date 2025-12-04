import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1 w-full">
      {label && <label className="text-sm font-medium text-slate-300">{label}</label>}
      <input 
        className={`bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 py-2 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
};