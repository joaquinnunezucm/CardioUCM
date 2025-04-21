import { BrowserRouter, Routes, Route } from "react-router-dom";
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
