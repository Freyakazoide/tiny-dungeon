import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { initializeGameStore } from './game/core/GameStore.ts';
import './ui/styles/tokens.css';
import './ui/styles/components.css';
import './ui/styles/shell.css';
import './ui/styles/modal.css';

async function bootstrap(){
    await initializeGameStore();
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode><App /></React.StrictMode>
    );
}
void bootstrap();
