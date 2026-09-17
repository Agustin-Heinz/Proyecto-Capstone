export default function Header() {
  return (
    <header className="app-header">
      <div className="row">
        {/* Aquí luego agregaremos la lógica del botón "Atrás" */}
        <button className="logo">
          <span className="mark">🗣️</span> FonoTrack
        </button>
        <div className="header-spacer"></div>
        <button className="header-cta">Ingresar</button>
      </div>
    </header>
  );
}