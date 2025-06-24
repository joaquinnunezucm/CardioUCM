import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";

function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null);

  useEffect(() => {
    axios.get(`http://localhost:3001/api/validate-reset-token/${token}`)
      .then(() => setTokenValid(true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirm) {
      Swal.fire("Error", "Las contraseñas no coinciden.", "error");
      return;
    }
    setLoading(true);
    try {
      await axios.post("http://localhost:3001/api/reset-password", { token, newPassword });
      Swal.fire("Éxito", "Contraseña restablecida correctamente.", "success").then(() => {
        navigate("/login");
      });
    } catch {
      Swal.fire("Error", "No se pudo restablecer la contraseña.", "error");
    }
    setLoading(false);
  };

  if (tokenValid === null) return <div className="text-center mt-10">Verificando enlace...</div>;
  if (!tokenValid) return <div className="text-center mt-10 text-red-500">Enlace inválido o expirado.</div>;

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <form className="bg-white p-8 rounded shadow w-96" onSubmit={handleSubmit}>
        <h2 className="text-xl font-bold mb-4 text-center">Restablecer contraseña</h2>
        <input
          type="password"
          className="w-full p-3 border border-gray-300 rounded mb-4"
          placeholder="Nueva contraseña"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          required
        />
        <input
          type="password"
          className="w-full p-3 border border-gray-300 rounded mb-4"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Restablecer"}
        </button>
      </form>
    </div>
  );
}

export default ResetPasswordPage;