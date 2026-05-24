import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { EncounterProvider } from './context/EncounterContext';
import { Root } from './Root';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EncounterProvider>
        <Root />
      </EncounterProvider>
    </AuthProvider>
  </StrictMode>,
);
