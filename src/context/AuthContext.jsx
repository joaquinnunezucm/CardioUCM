// src/context/AuthContext.jsx
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
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- useEffect COMBINADO para el ciclo de vida de la página ---
  useEffect(() => {
    // Función para la ALERTA antes de salir
    const handleBeforeUnload = (event) => {
      if (user) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    // Función para DESTRUIR la sesión al salir
    const handlePageHide = (event) => {
      // event.persisted es true si la página puede ser restaurada desde caché (ej. back/forward cache).
      // Solo queremos limpiar si el usuario realmente se va.
      if (event.persisted) return;

      // Si hay un usuario, limpiamos sessionStorage. Esta es la garantía.
      if (user) {
        console.log('Evento pagehide detectado: Limpiando sesión.');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide); // El listener crucial

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide); // Limpieza
    };
  }, [user]);

  // useEffect para cargar la sesión al inicio
  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const storedToken = sessionStorage.getItem('token');
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser && (parsedUser.rol === 'administrador' || parsedUser.rol === 'superadministrador')) {
          setUser(parsedUser);
          setToken(storedToken);
        } else {
          sessionStorage.clear();
        }
      } catch (error) {
        sessionStorage.clear();
      }
    }
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
          setUser(data.usuario);
          setToken(data.token);
          sessionStorage.setItem('user', JSON.stringify(data.usuario));
          sessionStorage.setItem('token', data.token);
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
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user && !!token, loading }}>
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