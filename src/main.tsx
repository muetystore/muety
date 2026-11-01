import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/AppProviders';
import { App } from '@/app/App';
import '@/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>
);

// Register Service Worker in production for offline resilience & PWA compliance
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration note:', err);
    });
  });
}
