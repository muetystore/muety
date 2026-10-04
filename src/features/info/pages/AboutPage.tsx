import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Award, Compass, ShieldCheck, UserCheck, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  useDocumentTitle('About MUETY | Silk Heritage & Leadership');

  const leaders = [
    {
      name: 'Mohan R',
      role: 'Founder',
      title: 'Founder of MUETY',
      points: [
        'Leads brand vision and long-term strategy.',
        'Focuses on innovation, growth and customer experience.',
        'Goal: build MUETY into a trusted fashion brand.'
      ]
    },
    {
      name: 'Thilakeswaran K',
      role: 'Founder',
      title: 'Founder of MUETY',
      points: [
        'Contributes to business development and brand growth.',
        'Focuses on operations, partnerships and opportunities.',
        'Supports MUETY’s sustainable growth.'
      ]
    },
    {
      name: 'Kishore K',
      role: 'CEO',
      title: 'CEO of MUETY',
      points: [
        'Oversees day-to-day operations.',
        'Coordinates teams and ensures execution.',
        'Focuses on performance, efficiency and business growth.'
      ]
    }
  ];

  return (
    <div className="about-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Hero Banner */}
      <div style={{ backgroundColor: '#090d16', color: '#ffffff', padding: '5rem 1.5rem 4.5rem', textAlign: 'center', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.18em', color: '#d4af37', textTransform: 'uppercase' }}>
            HERITAGE • CRAFTSMANSHIP • ELEGANCE
          </span>
          <h1 style={{ color: '#ffffff', fontSize: 'clamp(2.25rem, 5vw, 3.25rem)', marginTop: '10px', marginBottom: '1.25rem', lineHeight: 1.15, fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
            The Story of MUETY
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.15rem', lineHeight: 1.75, maxWidth: '680px', margin: '0 auto' }}>
            A refined online home for sarees, heritage textiles, and ethnic luxury crafted for modern elegance.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '4rem', maxWidth: '960px' }}>
        {/* Core Narrative */}
        <div style={{ fontSize: '1.1rem', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '2.5rem', fontSize: '1.15rem' }}>
            <strong>MUETY</strong> is dedicated to honoring traditional Indian textile heritage. We curate pure Mulberry and Kanchipuram silk sarees hand-woven by master artisans, alongside hand-crafted ethnic wear created for life’s grandest celebrations.
          </p>

          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            margin: '3rem 0',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid rgba(212, 175, 55, 0.2)'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80" 
              alt="MUETY Pure Handloom Silk Saree Weaving"
              style={{ width: '100%', height: '440px', objectFit: 'cover' }}
            />
          </div>

          <h2 style={{ fontSize: '2.25rem', color: 'var(--brand-primary)', marginBottom: '1.5rem', fontFamily: 'var(--font-heading)', textAlign: 'center', fontWeight: 800 }}>
            The Pillars of MUETY Artistry
          </h2>

          <div className="grid-2" style={{ gap: '2rem', margin: '2rem 0' }}>
            <div className="card" style={{ padding: '2rem', border: '1px solid var(--brand-border)' }}>
              <Compass size={32} color="#d4af37" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.6rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                Authentic Handloom Weaving
              </h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Every saree in our collection is created using traditional handloom techniques, interweaving pure silk threads with certified zari motifs.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem', border: '1px solid var(--brand-border)' }}>
              <Award size={32} color="#d4af37" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.25rem', marginBottom: '0.6rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                Uncompromising Material Purity
              </h4>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                We source only pure natural silk fibers and gold-finished zari, ensuring each drape possesses heirloom quality and lustrous weight.
              </p>
            </div>
          </div>

          {/* Leadership & Founders Section */}
          <div style={{ marginTop: '5rem', marginBottom: '4rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
                FASHION HOUSE ATELIER
              </span>
              <h2 style={{ fontSize: '2.25rem', color: 'var(--brand-primary)', marginTop: '6px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
                Leadership & Founders
              </h2>
              <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: '600px', margin: '8px auto 0' }}>
                Guiding MUETY’s journey toward sustainable growth, artisan empowerment, and timeless fashion excellence.
              </p>
            </div>

            <div className="grid-3" style={{ gap: '2rem' }}>
              {leaders.map((leader, idx) => (
                <div 
                  key={idx} 
                  className="card" 
                  style={{
                    padding: '2.25rem 1.75rem',
                    backgroundColor: '#090d16',
                    color: '#ffffff',
                    border: '1px solid rgba(212, 175, 55, 0.3)',
                    borderRadius: 'var(--radius-xl)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 15px 35px -10px rgba(9, 13, 22, 0.5)'
                  }}
                >
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(212, 175, 55, 0.12)',
                    border: '1.5px solid #d4af37',
                    color: '#d4af37',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem'
                  }}>
                    <Crown size={26} />
                  </div>

                  <h3 style={{ color: '#ffffff', fontSize: '1.4rem', fontFamily: 'var(--font-heading)', margin: 0, fontWeight: 800 }}>
                    {leader.name}
                  </h3>
                  
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    letterSpacing: '0.1em',
                    color: '#d4af37',
                    textTransform: 'uppercase',
                    marginTop: '4px',
                    marginBottom: '1.25rem',
                    display: 'block'
                  }}>
                    {leader.role}
                  </span>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.88rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                    {leader.points.map((pt, pIdx) => (
                      <li key={pIdx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: '#d4af37', fontWeight: 800 }}>•</span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '4rem' }}>
            <Link to="/products" className="btn btn-primary btn-lg" style={{ fontWeight: 700, padding: '14px 28px' }}>
              Explore the MUETY Saree Collection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
