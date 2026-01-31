import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../common/Button';
import { Input } from '../common/Input';

export const AuthModal = ({ isOpen, onClose }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const { login, register, loading, error: authError } = useAuth();
    const [localError, setLocalError] = useState('');

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setLocalError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError('');

        if (isLogin) {
            const result = await login(formData.email, formData.password);
            if (result.success) onClose();
            else setLocalError(result.message || 'Error al iniciar sesión');
        } else {
            if (!formData.name) return setLocalError('El nombre es requerido');
            const result = await register(formData.name, formData.email, formData.password);
            if (result.success) onClose();
            else setLocalError(result.message || 'Error al registrarse');
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-primary/40 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            ></div>

            {/* Modal Container to ensure centering */}
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Modal */}
                <div className="bg-white w-full max-w-md rounded-3xl shadow-premium overflow-hidden relative z-10 animate-slideUp border border-border/50">
                    <div className="px-10 pt-12 pb-6 text-center">
                        <div className="w-20 h-20 bg-accent/5 text-accent rounded-3xl flex items-center justify-center mx-auto mb-8 transition-transform hover:scale-110">
                            <span className="material-symbols-outlined text-4xl font-bold">
                                {isLogin ? 'login' : 'person_add'}
                            </span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-primary mb-3 tracking-tight">
                            {isLogin ? '¡Hola de nuevo!' : 'Crea tu cuenta'}
                        </h2>
                        <p className="text-gray/80 text-base leading-relaxed">
                            {isLogin
                                ? 'Accede a tus herramientas académicas con un solo clic.'
                                : 'Únete a la plataforma líder en asistencia de tesis.'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="px-10 py-5 flex flex-col gap-5">
                        {!isLogin && (
                            <Input
                                label="Nombre Completo"
                                name="name"
                                placeholder="Ej: Juan Pérez"
                                icon="fas fa-user"
                                value={formData.name}
                                onChange={handleChange}
                                required
                            />
                        )}
                        <Input
                            label="Correo Electrónico"
                            name="email"
                            type="email"
                            placeholder="tu@correo.com"
                            icon="fas fa-envelope"
                            value={formData.email}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Contraseña"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            icon="fas fa-lock"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />

                        {(localError || authError) && (
                            <div className="text-red-500 text-xs bg-red-50 p-3 rounded-xl border border-red-100 flex items-center gap-2 animate-fadeIn">
                                <i className="fas fa-exclamation-circle"></i>
                                {localError || authError?.message}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full justify-center h-12 text-sm mt-2"
                            isLoading={loading}
                        >
                            {isLogin ? 'Iniciar Sesión' : 'Registrarse Ahora'}
                        </Button>
                    </form>

                    <div className="px-10 pb-12 pt-4 text-center border-t border-border/30 bg-gray-50/30">
                        <p className="text-sm text-gray font-medium">
                            {isLogin ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
                            <button
                                className="text-accent font-bold ml-1.5 hover:underline cursor-pointer bg-transparent border-none"
                                onClick={() => setIsLogin(!isLogin)}
                            >
                                {isLogin ? 'Regístrate gratis' : 'Inicia sesión'}
                            </button>
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 text-gray hover:text-primary transition-colors bg-transparent border-none cursor-pointer"
                    >
                        <span className="material-icons-round">close</span>
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
