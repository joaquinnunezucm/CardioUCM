// src/pages/Login.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

// Importar el CSS si creas un archivo CSS separado (Opción 2)
// import './Login.css'; 

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || "Ocurrió un error desconocido.");
    }
    setLoading(false);
  };

  // URL de tu imagen (desde la carpeta public)
  const backgroundImageUrl = '/public/compresiones_1.jpg'; // Ajusta la ruta a tu imagen


  return (
    <>
      {/* Contenedor principal para el fondo */}
      <div 
        className="flex items-center justify-center h-screen bg-gray-200 relative overflow-hidden"
        // Opción 1: Estilos en línea para el pseudo-elemento (menos ideal pero funciona)
        // Es más limpio usar un archivo CSS, pero para un ejemplo rápido:
        style={{
          '--bg-image-url': `url(${backgroundImageUrl})` // Pasamos la URL como variable CSS
        }}
        // Para aplicar el fondo con un pseudo-elemento, necesitarías una clase y CSS externo
        // o usar styled-components. Con Tailwind puro, se complica un poco para pseudo-elementos.
        // Vamos a simplificar usando un div de fondo separado por ahora, que es más fácil con Tailwind.
      >
        {/* Div para la imagen de fondo con opacidad */}
        <div
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            opacity: 0.25, // Ajusta la opacidad (0.0 a 1.0) - 0.15 es 15% opaco
            backgroundSize: 'cover', // Cubre todo el área
            backgroundPosition: 'center', // Centra la imagen
            backgroundRepeat: 'no-repeat',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0, // Detrás del formulario
          }}
        ></div>

        {/* Formulario de Login (asegúrate que tenga un z-index mayor si es necesario) */}
        <form 
          className="bg-white p-8 rounded-lg shadow-xl w-96 relative z-10" // Añadido rounded-lg, shadow-xl, z-10
          onSubmit={handleLogin}
        >
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-700">Login Admin</h2>

          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-1">Correo electrónico</label>
            <input
              type="email"
              className="w-full p-3 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sucorreo@ejemplo.com"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-4"> {/* Reducido el mb-6 a mb-4 */}
            <label className="block text-gray-700 text-sm font-semibold mb-1">Contraseña</label>
            <input
              type="password"
              className="w-full p-3 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              disabled={loading}
            />
          </div>

          <div className="mb-6 text-right"> {/* Aumentado el mb-4 a mb-6 */}
            <button
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline focus:outline-none"
            >
              ¿Olvidó su contraseña?
            </button>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-blue-400 transition-colors"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Ingresando...
              </div>
            ) : 'Iniciar sesión'}
          </button>
        </form>
      </div>
      
      
    </>
  );
}
export default Login;