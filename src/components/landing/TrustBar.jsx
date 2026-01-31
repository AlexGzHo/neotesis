import React from 'react';

export const TrustBar = () => {
    return (
        <div className="bg-white py-8 border-t border-b border-border">
            <div className="max-w-7xl mx-auto text-center">
                <h3 className="uppercase text-xs tracking-widest text-gray mb-6">Nuestra experiencia avalada en:</h3>
                <div className="flex flex-wrap justify-center gap-8">
                    <div className="font-bold text-gray-400 flex items-center gap-2 text-base"><i className="fas fa-university"></i> UNMSM</div>
                    <div className="font-bold text-gray-400 flex items-center gap-2 text-base"><i className="fas fa-university"></i> UCV</div>
                    <div className="font-bold text-gray-400 flex items-center gap-2 text-base"><i className="fas fa-university"></i> USIL</div>
                    <div className="font-bold text-gray-400 flex items-center gap-2 text-base"><i className="fas fa-university"></i> UPC</div>
                </div>
            </div>
        </div>
    );
};
