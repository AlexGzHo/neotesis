import React from 'react';

export const Input = ({ label, error, className = '', containerClassName = '', icon, ...props }) => {
  return (
    <div className={`mb-4 ${containerClassName}`}>
      {label && <label className="block mb-2 text-sm font-bold text-primary">{label}</label>}
      <div className="relative flex items-center">
        {icon && <i className={`${icon} absolute left-4 text-gray text-lg`}></i>}
        <input
          className={`w-full p-4 ${icon ? 'pl-12' : ''} border ${error ? 'border-red-400' : 'border-border'} rounded-xl text-base transition-all focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent bg-white placeholder:text-gray/40 ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-red-500 text-xs mt-1 ml-1">{error}</span>}
    </div>
  );
};
