/* import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Emergencia from "./pages/Emergencia";
import RCP from "./pages/RCP";
import UbicacionDEA from "./pages/UbicacionDEA";
import Educacion from "./pages/Educacion";
import Noticias from "./pages/Noticias";
import FAQ from "./pages/FAQ";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/emergencia" element={<Emergencia />} />
        <Route path="/rcp" element={<RCP />} />
        <Route path="/dea" element={<UbicacionDEA />} />
        <Route path="/educacion" element={<Educacion />} />
        <Route path="/noticias" element={<Noticias />} />
        <Route path="/faq" element={<FAQ />} />
      </Routes>
    </BrowserRouter>
    
  );
}

export default App;
 */


// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import RCP from "./pages/RCP";
import DEA from "./pages/UbicacionDEA";
import Educacion from "./pages/Educacion";
// Agrega las demás vistas si ya las tienes: Noticias, FAQ, etc.

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rcp" element={<RCP />} />
        <Route path="/dea" element={<DEA />} />
        <Route path="/educacion" element={<Educacion />} />
        {/* Agrega más rutas según tu app */}
      </Routes>
    </Router>
  );
}

export default App;
