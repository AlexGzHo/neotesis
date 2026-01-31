import React from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', isLoading = false, disabled = false, ...props }) => {
  const baseStyles = "py-3 px-7 rounded-full font-bold inline-flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-base border-none";
  
  const variants = {
    primary: "bg-accent hover:bg-accent-hover text-white shadow-glow hover:scale-105",
    secondary: "bg-gray-100 hover:bg-gray-200 text-primary",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30",
    ghost: "bg-transparent hover:bg-gray-50 text-gray-500",
    outline: "bg-transparent border-2 border-accent text-accent hover:bg-accent hover:text-white"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <i className="fas fa-spinner fa-spin"></i> : children}
    </button>
  );
};
