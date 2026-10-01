import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { gameStore, initializeGameStore } from './game/core/GameStore.ts';
import './ui/styles/legacy.css';
import './ui/styles/tokens.css';
import './ui/styles/components.css';
import './ui/styles/shell.css';
import './ui/styles/modal.css';
import './ui/styles/modal-skin.css';
import './ui/styles/pixel-kit.css';
import './ui/styles/personagem.css';
import './ui/styles/itens.css';
import './ui/styles/classes.css';
import './ui/styles/grupo.css';
import './ui/styles/hunts.css';
import './ui/styles/aparencia.css';
import './ui/styles/goal.css';
import './ui/styles/controls.css';
import './ui/styles/skin.css';

async function bootstrap(){
    await initializeGameStore();
    if (import.meta.env.DEV) (window as unknown as { __td?: unknown }).__td = gameStore;
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode><App /></React.StrictMode>
    );
}
void bootstrap();
