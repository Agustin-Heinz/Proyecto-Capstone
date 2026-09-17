import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="hero">
      <div className="wrap">
        <h1>Conectamos la atención fonoaudiológica en un solo lugar</h1>
        <p>
          Encuentra a tu fonoaudiólogo, revisa su disponibilidad real y agenda
          tu próxima sesión en minutos, sin llamadas ni esperas.
        </p>
        <div className="hero-cta-row">
          {/* Cambiamos el button por Link */}
          <Link to="/directorio" className="btn-primary" style={{ textDecoration: 'none' }}>
            Prueba ahora
          </Link>
        </div>
        <div className="hero-photos">
          <div>👂</div>
          <div>🗣️</div>
          <div>🧒</div>
          <div>🎙️</div>
        </div>
      </div>
    </div>
  );
}