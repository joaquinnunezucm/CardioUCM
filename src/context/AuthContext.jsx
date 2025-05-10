// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Importar axios para configurar interceptors

const AuthContext = createContext(null);

// --- Axios Interceptor para añadir el token a las peticiones ---
// Esto se configura una vez y se aplica a todas las llamadas de axios
axios.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token'); // Obtener token de localStorage
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
  const [token, setToken] = useState(localStorage.getItem('token')); // Nuevo estado para el token
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Aquí podríamos opcionalmente verificar el token con un endpoint del backend
        // para asegurar que no haya sido invalidado o expirado, pero por ahora confiamos en localStorage.
        if (parsedUser && (parsedUser.rol === 'administrador' || parsedUser.rol === 'superadministrador')) {
          setUser(parsedUser);
          setToken(storedToken);
          // axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`; // Configuración global alternativa
        } else {
          localStorage.removeItem('user');
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error("Error parsing stored user/token:", error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:3001/login', { // Puedes usar axios aquí también
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (response.ok && data.usuario && data.token) { // Esperar 'token' en la respuesta
        if (data.usuario.rol === 'administrador' || data.usuario.rol === 'superadministrador') {
          setUser(data.usuario);
          setToken(data.token);
          localStorage.setItem('user', JSON.stringify(data.usuario));
          localStorage.setItem('token', data.token); // Guardar token
          // axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`; // Configuración global alternativa
          navigate('/admin');
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

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token'); // Remover token al logout
    // delete axios.defaults.headers.common['Authorization']; // Configuración global alternativa
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