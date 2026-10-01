import { useState } from 'react';
import { Stethoscope, UserCircle, CalendarCheck, Folder, BarChart2, MapPin, Star } from 'lucide-react';

export default function Audience() {
  // Guardamos si está seleccionado 'profesional' o 'paciente'
  const [audience, setAudience] = useState('profesional');

  // Tarjetas  según las imágenes de referencia
  const features = {
    profesional: [
      { ico: <CalendarCheck size={22} color="#1273d4" />, text: 'Agenda automática y recordatorios para tus pacientes' },
      { ico: <Folder size={22} color="#1273d4" />, text: 'Fichas clínicas organizadas y accesibles' },
      { ico: <BarChart2 size={22} color="#1273d4" />, text: 'Reportes de progreso y estadísticas' }
    ],
    paciente: [
      { ico: <MapPin size={22} color="#1273d4" />, text: 'Busca y compara fonoaudiólogos cerca de ti' },
      { ico: <Star size={22} color="#1273d4" />, text: 'Revisa valoraciones y experiencias de otros pacientes' },
      { ico: <CalendarCheck size={22} color="#1273d4" />, text: 'Agenda tu hora en segundos, sin llamada' }
    ]
  };

  const esProfesional = audience === 'profesional';

 return (
    <section 
      className="audience-section" 
      style={{ 
        background: 'linear-gradient(180deg, #b3d0ff 0%, #9fc3ff 100%)', 
        padding: '50px 20px 90px',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        border: 'none',
        margin: 0
      }}
    >
      <div className="wrap" style={{ maxWidth: '980px', margin: '0 auto', textAlign: 'center' }}>
        
        {/* Título Principal */}
        <h2 
          style={{ 
            fontSize: 'clamp(32px, 4.2vw, 48px)', 
            fontWeight: '800', 
            color: '#0f2342', 
            margin: '0 0 14px 0',
            letterSpacing: '-0.8px'
          }}
        >
          ¿Qué podemos ofrecerte?
        </h2>

        {/* Subtítulo 1 */}
        <h3 
          style={{ 
            fontSize: 'clamp(20px, 2.5vw, 26px)', 
            fontWeight: '800', 
            color: '#0f2342', 
            margin: '0 0 10px 0',
            letterSpacing: '-0.3px'
          }}
        >
          Una experiencia pensada para cada persona
        </h3>

        {/* Subtítulo 2 */}
        <p 
          style={{ 
            fontSize: '15px', 
            color: '#475569', 
            maxWidth: '520px', 
            margin: '0 auto 38px auto', 
            lineHeight: '1.5' 
          }}
        >
          Explora las herramientas y beneficios disponibles para profesionales
          <br />
          y pacientes.
        </p>

        {/* Contenedor Principal (Cambia de color entre Fonoaudiólogo y Paciente) */}
        <div 
          style={{ 
            backgroundColor: esProfesional ? '#e8f1ff' : '#1273d4', 
            borderRadius: '28px', 
            padding: '34px 36px 40px', 
            boxShadow: '0 12px 30px rgba(15, 35, 66, 0.08)',
            transition: 'background-color 0.3s ease',
            textAlign: 'left',
            marginBottom: '34px'
          }}
        >
          {/* Encabezado dentro del contenedor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
            {esProfesional ? (
              <div 
                style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  backgroundColor: '#1273d4', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <Stethoscope size={22} color="#ffffff" />
              </div>
            ) : (
              <div 
                style={{ 
                  width: '42px', 
                  height: '42px', 
                  borderRadius: '12px', 
                  backgroundColor: 'transparent', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}
              >
                <UserCircle size={28} color="#ffffff" />
              </div>
            )}

            <span 
              style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                color: esProfesional ? '#0f2342' : '#ffffff',
                transition: 'color 0.3s ease'
              }}
            >
              {esProfesional ? 'Para fonoaudiólogos' : 'Para pacientes'}
            </span>
          </div>

          {/* Las 3 tarjetas blancas horizontales */}
          <div 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
              gap: '18px' 
            }}
          >
            {features[audience].map((f, index) => (
              <div 
                key={index} 
                style={{ 
                  backgroundColor: '#ffffff', 
                  borderRadius: '18px', 
                  padding: '20px 22px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  boxShadow: '0 4px 14px rgba(15, 35, 66, 0.05)'
                }}
              >
                <div 
                  style={{ 
                    width: '46px', 
                    height: '46px', 
                    minWidth: '46px',
                    borderRadius: '12px', 
                    backgroundColor: '#e0f2fe', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}
                >
                  {f.ico}
                </div>
                <p 
                  style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    fontWeight: '500', 
                    color: '#1e293b', 
                    lineHeight: '1.4' 
                  }}
                >
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Botones inferiores de cambio (Fonoaudiólogo / Paciente) */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button 
            onClick={() => setAudience('profesional')}
            style={{ 
              backgroundColor: esProfesional ? '#1273d4' : '#dff2fe', 
              color: esProfesional ? '#ffffff' : '#1273d4', 
              border: 'none', 
              borderRadius: '999px', 
              padding: '13px 42px', 
              fontSize: '15px', 
              fontWeight: '700', 
              cursor: 'pointer',
              boxShadow: esProfesional ? '0 6px 16px rgba(18, 115, 212, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Fonoaudiólogo
          </button>

          <button 
            onClick={() => setAudience('paciente')}
            style={{ 
              backgroundColor: !esProfesional ? '#1273d4' : '#dff2fe', 
              color: !esProfesional ? '#ffffff' : '#1273d4', 
              border: 'none', 
              borderRadius: '999px', 
              padding: '13px 54px', 
              fontSize: '15px', 
              fontWeight: '700', 
              cursor: 'pointer',
              boxShadow: !esProfesional ? '0 6px 16px rgba(18, 115, 212, 0.3)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            Paciente
          </button>
        </div>

      </div>
    </section>
  );
}