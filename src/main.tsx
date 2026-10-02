import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/AppProviders';
import { App } from '@/app/App';
import '@/styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <AppProviders>
    <App />
  </AppProviders>
);
