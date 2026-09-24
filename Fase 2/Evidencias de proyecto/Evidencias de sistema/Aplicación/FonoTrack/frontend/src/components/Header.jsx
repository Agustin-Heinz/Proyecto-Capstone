import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="app-header">
      <div className="row">
        <Link to="/" className="logo" style={{ textDecoration: 'none' }}>
          <span className="mark">🗣️</span> FonoTrack
        </Link>
        <div className="header-spacer"></div>
        <Link to="/login" className="header-cta" style={{ textDecoration: 'none' }}>
          Ingresar
        </Link>
      </div>
    </header>
  );
}