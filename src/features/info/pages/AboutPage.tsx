import React from 'react';
import { useDocumentTitle } from '@/shared/hooks/useDocumentTitle';
import { Award, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  useDocumentTitle('About');

  return (
    <div className="about-page animate-fade-in" style={{ paddingBottom: '6rem' }}>
      {/* Hero Banner */}
      <div style={{ backgroundColor: '#0f172a', color: '#ffffff', padding: '4.5rem 0 4rem', textAlign: 'center' }}>
        <div className="container" style={{ maxWidth: '750px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.15em', color: '#d4af37', textTransform: 'uppercase' }}>
            ATELIER HERITAGE & VISION
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '3rem', marginTop: '8px', marginBottom: '1.25rem', lineHeight: 1.15 }}>
            The Story of MUETY
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.15rem', lineHeight: 1.7 }}>
            Founded on the ideals of architectural minimalism, uncompromising material integrity, and lifelong craftsmanship.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '4rem', maxWidth: '900px' }}>
        {/* Core Narrative */}
        <div style={{ fontSize: '1.1rem', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '2rem' }}>
            <strong>MUETY</strong> was founded as an antidote to disposable trends. We believe that true luxury lies not in ostentatious logos, but in the weight of surgical-grade stainless steel, the tactile warmth of vegetable-tanned Tuscan leather, and the unyielding precision of an automatic mechanical movement.
          </p>

          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            margin: '3rem 0',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=80" 
              alt="MUETY Leather Craftsmanship"
              style={{ width: '100%', height: '420px', objectFit: 'cover' }}
            />
          </div>

          <h2 style={{ fontSize: '2rem', color: 'var(--brand-primary)', marginBottom: '1.25rem' }}>
            The Pillars of the MUETY Atelier
          </h2>

          <div className="grid-2" style={{ gap: '2rem', margin: '2rem 0' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <Compass size={28} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Swiss & Japanese Calibers</h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                Every MUETY automatic timepiece utilizes high-beat movements regulated in five positions for chronometric precision.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <Award size={28} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Tuscan Full-Grain</h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                Our leathers are sourced exclusively from certified Italian tanneries utilizing natural tree barks and oils without toxic chromium.
              </p>
            </div>
          </div>

          <p style={{ marginBottom: '2.5rem' }}>
            When you hold a MUETY creation, you hold an artifact designed to outlast the season. We stand behind each piece with our lifetime craftsmanship guarantee and white-glove global concierge support.
          </p>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/products" className="btn btn-accent btn-lg">
              Explore the MUETY Repertory
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
