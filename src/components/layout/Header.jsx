import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../common/Button';
import { AuthModal } from '../auth/AuthModal';
import { useAuth } from '../../context/AuthContext';

export const Header = () => {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const { isAuthenticated, user, logout } = useAuth();
    const location = useLocation();

    const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);
    const openAuth = () => setIsAuthModalOpen(true);
    const closeAuth = () => setIsAuthModalOpen(false);

    const navLinks = [
        { name: 'Inicio', path: '/' },
        { name: 'Herramientas de Cita', path: '/citation-tools' },
        { name: 'Muestra', path: '/sample-calculator' },
        { name: 'Chat con PDF', path: '/ai-chat' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <header className="bg-white/80 backdrop-blur-xl border-b border-border sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center relative">
                <Link to="/" className="text-2xl font-extrabold text-primary cursor-pointer flex items-center gap-2 tracking-tight transition-opacity hover:opacity-80">
                    <i className="fas fa-graduation-cap"></i> Neotesis <span className="text-accent">Perú</span>
                </Link>

                <nav className={`flex items-center ${isMobileOpen ? 'mobile-open' : ''}`}>
                    <div
                        className={`nav-overlay ${isMobileOpen ? 'block' : 'hidden'}`}
                        onClick={toggleMobileMenu}
                    ></div>

                    <button
                        className="bg-accent hover:bg-accent-hover text-white p-3 rounded-lg transition-all duration-300 ml-auto md:hidden z-[60] flex items-center justify-center shadow-lg border-none"
                        onClick={toggleMobileMenu}
                        aria-label="Menú"
                    >
                        <span className="material-icons-round">menu</span>
                    </button>

                    <ul className={`hidden md:flex gap-10 list-none md:items-center ${isMobileOpen ? 'flex' : ''}`}>
                        {navLinks.map((link) => (
                            <li key={link.path}>
                                <Link
                                    to={link.path}
                                    className={`text-dark font-semibold text-sm transition-all hover:text-accent cursor-pointer relative after:content-[''] after:absolute after:-bottom-2 after:left-0 after:w-0 after:h-0.5 after:bg-accent after:transition-all after:duration-300 hover:after:w-full ${isActive(link.path) ? 'text-accent after:w-full' : ''}`}
                                    onClick={() => setIsMobileOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            </li>
                        ))}
                        <li className="md:ml-auto flex items-center gap-4">
                            {isAuthenticated ? (
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-end hidden lg:flex">
                                        <span className="text-xs font-bold text-primary leading-none">{user?.name}</span>
                                        <span className="text-[10px] text-gray uppercase tracking-widest mt-1">Estudiante</span>
                                    </div>
                                    <button
                                        onClick={logout}
                                        className="w-10 h-10 bg-bg-light hover:bg-red-50 text-gray hover:text-red-500 rounded-xl flex items-center justify-center transition-all border-none cursor-pointer"
                                        title="Cerrar Sesión"
                                    >
                                        <span className="material-icons-round">logout</span>
                                    </button>
                                </div>
                            ) : (
                                <Button
                                    variant="primary"
                                    className="py-2.5 px-6 text-sm"
                                    onClick={openAuth}
                                >
                                    <i className="fas fa-user-circle"></i> Ingresar
                                </Button>
                            )}
                        </li>
                    </ul>
                </nav>
            </div>

            <AuthModal isOpen={isAuthModalOpen} onClose={closeAuth} />
        </header>
    );
};

