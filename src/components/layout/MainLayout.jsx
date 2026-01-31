import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';

export const MainLayout = ({ children }) => {
    const location = useLocation();
    const isChatPage = location.pathname === '/ai-chat';

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 flex flex-col relative">
                {children}
            </main>
            {!isChatPage && <Footer />}
        </div>
    );
};
