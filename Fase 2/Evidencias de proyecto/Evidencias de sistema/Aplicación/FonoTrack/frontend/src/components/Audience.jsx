import { useState } from 'react';

export default function Audience() {
  // Guardamos si está seleccionado 'paciente' o 'profesional'
  const [audience, setAudience] = useState('paciente');

  // Los datos de tus tarjetas extraídos de tu código original
  const features = {
    paciente: [
      { ico: '🔎', text: 'Encuentra al fonoaudiólogo indicado según especialidad y comuna' },
      { ico: '📅', text: 'Agenda online 24/7 y cancela si algo cambia' },
      { ico: '💳', text: 'Paga tu sesión de forma segura, sin filas' }
    ],
    profesional: [
      { ico: '📅', text: 'Agenda automática y recordatorios para tus pacientes' },
      { ico: '📋', text: 'Fichas clínicas organizadas y accesibles' },
      { ico: '📊', text: 'Reportes de progreso y estadísticas de tu consulta' }
    ]
  };

  return (
    <div className="audience-section">
      <div className="wrap">
        <h2>¿Qué podemos hacer por ti?</h2>
        
        <div className="toggle-row">
          <button 
            className={audience === 'profesional' ? 'active' : ''} 
            onClick={() => setAudience('profesional')}
          >
            Fonoaudiólogo
          </button>
          <button 
            className={audience === 'paciente' ? 'active' : ''} 
            onClick={() => setAudience('paciente')}
          >
            Paciente
          </button>
        </div>

        <div className="audience-sub">
          {audience === 'paciente' 
            ? 'Encuentra a tu profesional ideal y agenda directo, sin intermediarios.' 
            : 'No te traemos pacientes, pero sí te ahorramos el trabajo de gestionarlos.'}
        </div>

        <div className="feature-cards">
          {features[audience].map((f, index) => (
            <div className="feature-card" key={index}>
              <div className="ico">{f.ico}</div>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}