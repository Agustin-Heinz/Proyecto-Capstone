import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Directory from './pages/Directory' // 1. Importamos la nueva página
import Detail from './pages/Detail'
import Booking from './pages/Booking'
import Contact from './pages/Contact'
import Payment from './pages/Payment'
import Confirmation from './pages/Confirmation'

function App() {
  return (
    <BrowserRouter>
      <Header />
      
      <Routes>
        <Route path="/" element={<Home />} />
        {/* 2. Registramos la ruta del directorio */}
        <Route path="/directorio" element={<Directory />} />
        <Route path="/profesional/:id" element={<Detail />} />
        <Route path="/reserva/:profId/:servId" element={<Booking />} />
        <Route path="/contacto/:profId/:servId" element={<Contact />} />
        <Route path="/pago/:profId/:servId" element={<Payment />} />
        <Route path="/confirmacion/:profId/:servId" element={<Confirmation />} />
      </Routes>

      <Footer />
    </BrowserRouter>
  )
}

export default App