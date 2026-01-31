import React from 'react';

export const LoadingSpinner = ({ text, className = '' }) => {
    return (
        <div className={`flex flex-col items-center justify-center p-4 text-accent gap-2 ${className}`}>
            <span className="text-4xl animate-spin">
                <i className="fas fa-spinner"></i>
            </span>
            {text && <p className="font-semibold text-sm animate-pulse">{text}</p>}
        </div>
    );
};
