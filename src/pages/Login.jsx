import { useState } from "react";
import { useAuth } from "../context/AuthContext"; // Importar useAuth
import { Link } from "react-router-dom"; // Para el enlace "Olvidó su contraseña"


function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth(); // Usar el login del contexto

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password); // Llamar a la función login del contexto

    if (!result.success) {
      setError(result.message || "Ocurrió un error desconocido.");
    }
    // La navegación en caso de éxito la maneja el AuthContext
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form className="bg-white p-8 rounded shadow-md w-96" onSubmit={handleLogin}>
        <h2 className="text-2xl font-bold mb-6 text-center">Login Admin</h2>

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-gray-700">Correo electrónico</label>
          <input
            type="email"
            className="w-full p-2 border rounded mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700">Contraseña</label>
          <input
            type="password"
            className="w-full p-2 border rounded mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="mb-4 text-right">
          {/* <Link to="/forgot-password" className="text-sm text-blue-500 hover:underline">
            ¿Olvidó su contraseña?
          </Link> */}
          {/* La funcionalidad de "Olvidó su contraseña" es compleja y requiere más backend */}
          <a href="#" onClick={(e) => {e.preventDefault(); alert("Funcionalidad no implementada. Contacte al superadministrador.")}} className="text-sm text-blue-500 hover:underline">
            ¿Olvidó su contraseña?
          </a>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          disabled={loading}
        >
          {loading ? 'Ingresando...' : 'Iniciar sesión'}
        </button>
      </form>
    </div>
  );
}

export default Login;