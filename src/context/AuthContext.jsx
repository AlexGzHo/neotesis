import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSecureFetch } from '../hooks/useSecureFetch';
import { API_ENDPOINTS } from '../services/api';

const AuthContext = createContext();

const TOKEN_KEY = 'neotesis_token';
const USER_KEY = 'neotesis_user';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const { secureFetch, loading, error } = useSecureFetch();

    useEffect(() => {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            setIsAuthenticated(true);
        }
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            console.log('Initiating V2 Login for:', email);
            const response = await fetch(API_ENDPOINTS.AUTH.LOGIN, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password }),
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                // Check if it's the index.html fallback (starts with <!)
                if (text.trim().startsWith('<')) {
                    console.error('V2 Login Failed: Received HTML instead of JSON. Check Backend Port/Proxy.');
                    return { success: false, message: 'Error de conexión: El servidor no responde correctamente.' };
                }
                throw new Error("Respuesta no válida del servidor (No es JSON)");
            }

            const data = await response.json();

            if (response.ok && data.success) {
                const { token, user } = data;
                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                setToken(token);
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
            return { success: false, message: data.message || 'Error al iniciar sesión' };
        } catch (err) {
            console.error('V2 Login Error:', err);
            return { success: false, message: err.message || 'Error de conexión' };
        }
    }, []);

    const register = useCallback(async (name, email, password) => {
        try {
            const response = await fetch(API_ENDPOINTS.AUTH.REGISTER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const text = await response.text();
            let data;
            try {
                data = text ? JSON.parse(text) : {};
            } catch (e) {
                console.error('Error parsing JSON response:', e);
                return { success: false, message: 'Error de comunicación con el servidor' };
            }

            if (response.ok && data.success) {
                const { token, user } = data;
                localStorage.setItem(TOKEN_KEY, token);
                localStorage.setItem(USER_KEY, JSON.stringify(user));
                setToken(token);
                setUser(user);
                setIsAuthenticated(true);
                return { success: true };
            }
            return { success: false, message: data.message || 'Error al registrarse' };
        } catch (err) {
            console.error('Register error:', err);
            return { success: false, message: err.message || 'Error de conexión' };
        }
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, isAuthenticated, login, register, logout, loading, error }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
