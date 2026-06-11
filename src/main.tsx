import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { EncounterProvider } from './context/EncounterContext';
import { BattleProvider } from './context/BattleContext';
import { Root } from './Root';

// Initialize font size from localStorage before rendering
const savedFontSize = localStorage.getItem('rpg-font-size');
if (savedFontSize) {
  document.documentElement.style.fontSize = `${savedFontSize}%`;
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <EncounterProvider>
        <BattleProvider>
          <Root />
        </BattleProvider>
      </EncounterProvider>
    </AuthProvider>
  </StrictMode>,
);

