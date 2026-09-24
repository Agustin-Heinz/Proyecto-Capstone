import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom'
import './index.css'

// Componentes Públicos
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Directory from './pages/Directory'
import Detail from './pages/Detail'
import Booking from './pages/Booking'
import Contact from './pages/Contact'
import Payment from './pages/Payment'
import Confirmation from './pages/Confirmation'
import PanelPacientes from './pages/PanelPacientes'
import PanelReportes from './pages/PanelReportes'
import Login from './pages/Login'
import Register from './pages/Register'

// Componentes del Panel (¡Con la nueva agenda importada!)
import DashboardLayout from './components/DashboardLayout'
import PanelAgenda from './pages/PanelAgenda'
import PanelAgendaSemanal from './pages/PanelAgendaSemanal'
import PanelPerfil from './pages/PanelPerfil'

// Plantilla Pública
function PublicLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        {/* GRUPO 1: Sitio Público (Llevan el Header y Footer normal) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/directorio" element={<Directory />} />
          <Route path="/profesional/:id" element={<Detail />} />
          <Route path="/reserva/:profId/:servId" element={<Booking />} />
          <Route path="/contacto/:profId/:servId" element={<Contact />} />
          <Route path="/pago/:profId/:servId" element={<Payment />} />
          <Route path="/confirmacion/:profId/:servId" element={<Confirmation />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
        </Route>

        {/* GRUPO 2: Panel de Administración (Lleva la barra lateral) */}
        <Route path="/panel" element={<DashboardLayout />}>
          {/* Ruta por defecto (El inicio del panel) */}
          <Route index element={<PanelAgenda />} />
          
          {/* NUEVA RUTA: El calendario semanal al ir a /panel/agenda */}
          <Route path="agenda" element={<PanelAgendaSemanal />} />
          <Route path="pacientes" element={<PanelPacientes />} />
          <Route path="reportes" element={<PanelReportes />} />
          <Route path="perfil" element={<PanelPerfil />} />
        </Route>

      </Routes>
    </BrowserRouter>
  )
}

export default App