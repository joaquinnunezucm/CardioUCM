import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const AuthContext = createContext(null);

axios.interceptors.request.use(
  config => {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  // PIEZA CLAVE 1: El estado 'loading' empieza en 'true'.
  const [loading, setLoading] = useState(true); 
  const navigate = useNavigate();

  // useEffect para cargar la sesión UNA SOLA VEZ al inicio de la aplicación.
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Validamos que el usuario y el rol existan.
        if (parsedUser && (parsedUser.rol === 'administrador' || parsedUser.rol === 'superadministrador')) {
          setUser(parsedUser);
          setToken(storedToken);
        } else {
          // Si los datos son inválidos, limpiamos todo.
          sessionStorage.clear();
        }
      } catch (error) {
        sessionStorage.clear();
      }
    }
    
    // PIEZA CLAVE 2: setLoading(false) se llama AL FINAL, después de toda la lógica.
    // Esto le dice a la aplicación: "Ok, ya terminé de verificar. Pueden continuar".
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok && data.usuario && data.token) {
        if (data.usuario.rol === 'administrador' || data.usuario.rol === 'superadministrador') {
          sessionStorage.setItem('user', JSON.stringify(data.usuario));
          sessionStorage.setItem('token', data.token);
          setUser(data.usuario);
          setToken(data.token);
          navigate('/admin', { replace: true });
          return { success: true };
        } else {
          return { success: false, message: 'No tiene permisos para acceder.' };
        }
      } else {
        return { success: false, message: data.message || 'Error en el login.' };
      }
    } catch (err) {
      return { success: false, message: 'Error de conexión.' };
    }
  };

  const logout = () => {
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    setUser(null);
    setToken(null);
    navigate('/login');
  };

  // PIEZA CLAVE 3: El valor que proveemos ahora incluye 'loading'.
  const value = { user, token, login, logout, isAuthenticated: !!user && !!token, loading };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};