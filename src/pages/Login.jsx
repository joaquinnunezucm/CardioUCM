import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_BASE_URL } from "../utils/api";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth(); 
  const navigate = useNavigate(); 
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);


  useEffect(() => {
    if (user) {

      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);


  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    if (!result.success) {
      setError(result.message || "Ocurrió un error desconocido.");
      setLoading(false);
    }

  };

  // Ruta de la imagen 
  const backgroundImageUrl = '/compresiones_1.jpg';


  return (
    <>
      <div 
        className="flex items-center justify-center h-screen bg-gray-200 relative overflow-hidden"
      >
        <div
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            opacity: 0.25,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
        ></div>

          <form 
          className="bg-white p-8 rounded-lg shadow-xl w-96 relative z-10"
          onSubmit={handleLogin}
        >
          <div className="flex justify-center mb-4">
            <img 
              src="/Escudo_UCM.png" 
              alt="Logo de la Universidad"
              className="h-16 w-auto" 
            />
          </div>
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-700">Login</h2>

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

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-1">Contraseña</label>
            <div className="relative mt-1"> 
              <input
                type={showPassword ? "text" : "password"}
                className="w-full p-3 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-gray-800"
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <i className={showPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
              </button>
            </div>
          </div>

          <div className="mb-6 text-right">
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

        {showForgotPasswordModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-96">
              <h3 className="text-lg font-bold mb-4 text-center">Recuperar contraseña</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const emailValue = e.target.email.value;
                  try {
                    await fetch(`${API_BASE_URL}/api/forgot-password`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: emailValue }),
                    });
                    alert("Si el correo existe, recibirás un enlace para restablecer tu contraseña.");
                    setShowForgotPasswordModal(false);
                  } catch {
                    alert("No se pudo enviar el correo. Intenta más tarde.");
                  }
                }}
              >
                <input
                  type="email"
                  name="email"
                  className="w-full p-3 border border-gray-300 rounded-md mb-4"
                  placeholder="Tu correo electrónico"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="px-4 py-2 bg-gray-300 rounded"
                    onClick={() => setShowForgotPasswordModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
export default Login;