import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { API_BASE_URL } from '../utils/api';

// Componente reutilizable para mostrar los requisitos de la contraseña
const PasswordRequirement = ({ isValid, text }) => (
  <div className={`text-sm ${isValid ? 'text-green-600' : 'text-red-600'}`}>
    <i className={`fas ${isValid ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
    {text}
  </div>
);


function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  
  // Estados para los campos y la carga
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  // Estados para la visibilidad de las contraseñas
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Estado para la validación en tiempo real de la nueva contraseña
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
  });

  // Efecto para validar el token al cargar la página
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/validate-reset-token/${token}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false));
  }, [token]);
  
  // Manejador para el cambio en el campo de nueva contraseña
  const handleNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    // Actualizar validación en tiempo real
    setPasswordValidation({
      length: value.length >= 8,
      uppercase: /[A-Z]/.test(value),
      lowercase: /[a-z]/.test(value),
      number: /[0-9]/.test(value),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Validar que la nueva contraseña sea fuerte
    const isStrong = Object.values(passwordValidation).every(Boolean);
    if (!isStrong) {
      Swal.fire("Contraseña insegura", "La nueva contraseña no cumple con todos los requisitos de seguridad.", "error");
      return;
    }
    
    // 2. Validar que las contraseñas coincidan
    if (newPassword !== confirm) {
      Swal.fire("Error", "Las contraseñas no coinciden.", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/reset-password`, { token, newPassword });
      Swal.fire("Éxito", "Tu contraseña ha sido restablecida correctamente.", "success").then(() => {
        navigate("/login");
      });
    } catch (error) {
      const errorMessage = error.response?.data?.message || "No se pudo restablecer la contraseña. El enlace puede haber expirado.";
      Swal.fire("Error", errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  if (tokenValid === null) return <div className="text-center mt-10">Verificando enlace...</div>;
  if (!tokenValid) return <div className="text-center mt-10 text-red-500">Enlace inválido o expirado. Por favor, solicita uno nuevo.</div>;

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form className="bg-white p-8 rounded-lg shadow-xl w-96" onSubmit={handleSubmit}>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Restablecer contraseña</h2>
        
        {/* Campo Nueva Contraseña */}
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-1">Nueva contraseña</label>
          <div className="relative">
            <input
              type={showNewPassword ? "text" : "password"}
              className="w-full p-3 pr-10 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
              placeholder="Escribe tu nueva contraseña"
              value={newPassword}
              onChange={handleNewPasswordChange}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-gray-800"
              title={showNewPassword ? "Ocultar" : "Mostrar"}
            >
              <i className={showNewPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
            </button>
          </div>
          {/* Lista de requisitos */}
          <div className="mt-2 pl-1 space-y-1">
            <PasswordRequirement isValid={passwordValidation.length} text="Mínimo 8 caracteres." />
            <PasswordRequirement isValid={passwordValidation.uppercase} text="Una letra mayúscula." />
            <PasswordRequirement isValid={passwordValidation.lowercase} text="Una letra minúscula." />
            <PasswordRequirement isValid={passwordValidation.number} text="Un número." />
          </div>
        </div>

        {/* Campo Confirmar Contraseña */}
        <div className="mb-6">
           <label className="block text-gray-700 text-sm font-semibold mb-1">Confirmar contraseña</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="w-full p-3 pr-10 border border-gray-300 rounded-md mt-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
              placeholder="Vuelve a escribir la contraseña"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
             <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-600 hover:text-gray-800"
              title={showConfirmPassword ? "Ocultar" : "Mostrar"}
            >
              <i className={showConfirmPassword ? "fas fa-eye-slash" : "fas fa-eye"}></i>
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:bg-blue-400 transition-colors"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Restablecer contraseña"}
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;