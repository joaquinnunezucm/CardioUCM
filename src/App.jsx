import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home";
import Emergencia from "./pages/Emergencia";
import RCP from "./pages/RCP";
import UbicacionDEA from "./pages/UbicacionDEA";
import Educacion from "./pages/Educacion";
import Noticias from "./pages/Noticias";
import FAQ from "./pages/FAQ";

// Nuevas páginas que debes crear
import Login from "./pages/Login";        // Login.jsx
import Dashboard from "./pages/Dashboard"; // Dashboard.jsx

function App() {
  const isAuthenticated = localStorage.getItem('loggedIn') === "true";

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/" element={<Home />} />
        <Route path="/emergencia" element={<Emergencia />} />
        <Route path="/rcp" element={<RCP />} />
        <Route path="/dea" element={<UbicacionDEA />} />
        <Route path="/educacion" element={<Educacion />} />
        <Route path="/noticias" element={<Noticias />} />
        <Route path="/faq" element={<FAQ />} />
        
        {/* Nueva ruta para Login */}
        <Route path="/login" element={<Login />} />
        
        {/* Nueva ruta protegida para el Dashboard */}
        <Route path="/admin" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />

        {/* Redirigir todo lo desconocido a Home o Login (opcional) */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;