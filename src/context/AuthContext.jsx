// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';

const AuthContext = createContext(null);

// --- Axios Interceptor: Modificado para usar sessionStorage ---
axios.interceptors.request.use(
  config => {
    // Leemos el token de sessionStorage
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);
// --- Fin Axios Interceptor ---

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // No inicializar desde storage aquí, se hará en useEffect
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // --- NUEVO: Hook para la alerta de cierre de sesión ---
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      // Solo mostramos la alerta si hay un usuario logueado
      if (user) {
        event.preventDefault();
        event.returnValue = ''; // Activa la alerta nativa del navegador
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Limpieza al desmontar el componente
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]); // Este efecto depende del estado del usuario

  // --- useEffect Modificado para usar sessionStorage ---
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
          // Limpiamos en caso de datos inválidos
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('token');
        }
      } catch (error) {
        console.error("Error parsing stored user/token:", error);
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // --- Función Login Modificada para usar sessionStorage y replace: true ---
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
          // Guardamos en sessionStorage
          sessionStorage.setItem('user', JSON.stringify(data.usuario));
          sessionStorage.setItem('token', data.token);
          
          // Navegamos REEMPLAZANDO la ruta del historial
          navigate('/admin', { replace: true }); 
          return { success: true };
        } else {
          return { success: false, message: 'No tiene permisos para acceder.' };
        }
      } else {
        return { success: false, message: data.message || 'Error en el login o token no recibido.' };
      }
    } catch (err) {
      console.error("AuthContext login error:", err);
      return { success: false, message: 'Error de conexión con el servidor.' };
    }
  };

  // --- Función Logout Modificada para usar sessionStorage ---
  const logout = () => {
    setUser(null);
    setToken(null);
    // Removemos de sessionStorage
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