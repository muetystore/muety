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
            SILK HERITAGE & ATELIER CRAFTSMANSHIP
          </span>
          <h1 style={{ color: '#ffffff', fontSize: '3rem', marginTop: '8px', marginBottom: '1.25rem', lineHeight: 1.15, fontFamily: 'var(--font-heading)' }}>
            The Story of MUETY
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: '1.15rem', lineHeight: 1.7 }}>
            Celebrating timeless Indian handloom artistry, authentic pure silk weaves, and royal temple jewelry.
          </p>
        </div>
      </div>

      <div className="container" style={{ marginTop: '4rem', maxWidth: '900px' }}>
        {/* Core Narrative */}
        <div style={{ fontSize: '1.1rem', lineHeight: 1.85, color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '2rem' }}>
            <strong>MUETY</strong> is dedicated to honoring traditional Indian textile heritage. We curate pure Mulberry and Kanchipuram silk sarees hand-woven by master artisans, alongside hand-crafted temple jewelry created for life’s grandest celebrations.
          </p>

          <div style={{
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
            margin: '3rem 0',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <img 
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=80" 
              alt="MUETY Pure Handloom Silk Saree Weaving"
              style={{ width: '100%', height: '420px', objectFit: 'cover' }}
            />
          </div>

          <h2 style={{ fontSize: '2rem', color: 'var(--brand-primary)', marginBottom: '1.25rem', fontFamily: 'var(--font-heading)' }}>
            The Pillars of MUETY Artistry
          </h2>

          <div className="grid-2" style={{ gap: '2rem', margin: '2rem 0' }}>
            <div className="card" style={{ padding: '2rem' }}>
              <Compass size={28} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Authentic Handloom Weaving</h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                Every saree in our collection is created using traditional handloom techniques, interweaving pure silk threads with genuine zari motifs.
              </p>
            </div>

            <div className="card" style={{ padding: '2rem' }}>
              <Award size={28} color="var(--brand-accent)" style={{ marginBottom: '1rem' }} />
              <h4 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Uncompromising Material Purity</h4>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
                We source only pure natural silk fibers and certified gold-finished zari, ensuring each drape possesses heirloom quality and lustrous weight.
              </p>
            </div>
          </div>

          <p style={{ marginBottom: '2.5rem' }}>
            When you choose MUETY, you support traditional artisan weaving communities and receive a piece of living cultural heritage tailored for modern elegance.
          </p>

          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/products" className="btn btn-accent btn-lg">
              Explore the MUETY Saree Collection
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

