import { Link } from 'react-router-dom';
import Hero1 from '../assets/Hero1.jpeg';
import Hero2 from '../assets/Hero2.jpeg';
import Hero3 from '../assets/Hero3.jpeg';
import Hero4 from '../assets/Hero4.jpeg';

export default function Hero() {
  const fotosClinicas = [
    {
      url: Hero1,
      alt: "Evaluación auditiva y otoscopía"
    },
    {
      url: Hero2,
      alt: "Terapia de habla y articulación infantil"
    },
    {
      url: Hero3,
      alt: "Actividades de estimulación cognitiva y lenguaje"
    },
    {
      url: Hero4,
      alt: "Atención fonoaudiológica pediátrica"
    }
  ];

  return (
    <div
      className="hero"
      style={{
        background: 'linear-gradient(180deg, #f8fbff 0%, #dceaff 55%, #b3d0ff 100%)',
        padding: '70px 20px 50px',
        textAlign: 'center',
        border: 'none',
        margin: 0
      }}
    >
      <div className="wrap" style={{ maxWidth: '980px', margin: '0 auto' }}>

        <h1
          style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: 'clamp(32px, 4.5vw, 52px)',
            fontWeight: '400',
            color: '#111827',
            lineHeight: '1.22',
            margin: '0 auto 24px',
            maxWidth: '880px',
            letterSpacing: '-0.8px'
          }}
        >
          Conectamos la <strong style={{ fontWeight: '800' }}>atención</strong>
          <br />
          <strong style={{ fontWeight: '800' }}>fonoaudiológica</strong> en <strong style={{ fontWeight: '800' }}>un solo lugar.</strong>
        </h1>

        <p
          style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: '18px',
            color: '#1f2937',
            lineHeight: '1.5',
            maxWidth: '780px',
            margin: '0 auto 34px',
            fontWeight: '400'
          }}
        >
          Gestiona tus sesiones clínicas o encuentra y agenda tu próxima atención de forma rápida,
          simple y transparente en la ciudad de Santiago.
        </p>

        <div className="hero-cta-row" style={{ marginBottom: '48px' }}>
          <Link
            to="/directorio"
            style={{
              display: 'inline-block',
              textDecoration: 'none',
              backgroundColor: '#1577ea',
              color: '#ffffff',
              fontSize: '18px',
              fontWeight: '700',
              padding: '15px 54px',
              borderRadius: '999px',
              boxShadow: '0 6px 18px rgba(21, 119, 234, 0.28)',
              transition: 'transform 0.2s ease'
            }}
          >
            Prueba Ahora
          </Link>
        </div>

        {/*  4 fotografías con marco blanco */}
        <div className="hero-photos-grid">
          {fotosClinicas.map((foto, index) => (
            <div
              key={index}
              style={{
                height: '230px',
                overflow: 'hidden',
                backgroundColor: '#e2e8f0'
              }}
            >
              <img
                src={foto.url}
                alt={foto.alt}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}