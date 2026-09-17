import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="app-header">
      <div className="row">
        {/* Usamos Link para que al hacer clic en el logo, nos lleve a la ruta raíz "/" */}
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <span className="mark">🗣️</span> FonoTrack
        </Link>
        <div className="header-spacer"></div>
        <button className="header-cta">Ingresar</button>
      </div>
    </header>
  );
}