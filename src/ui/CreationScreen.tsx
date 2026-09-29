import { useState, type FormEvent } from 'react';
import { gameStore } from '../game/core/GameStore';
import { NAME_LIMIT, PARTY_SIZE } from '../game/core/GameEngine';

const PLACEHOLDERS = ['Nome do primeiro Squire', 'Nome do segundo Squire', 'Nome do terceiro Squire'];

/** Primeira tela do jogo: o jogador nomeia os 3 personagens, todos começando como Squire. */
export function CreationScreen() {
  const [names, setNames] = useState<string[]>(() => Array(PARTY_SIZE).fill(''));
  const clean = names.map(name => name.trim());
  const duplicated = new Set(clean.map(name => name.toLowerCase())).size !== clean.length && clean.every(Boolean);
  const ready = clean.every(Boolean) && !duplicated;
  const submit = (event: FormEvent) => { event.preventDefault(); if (ready) gameStore.createParty(clean); };
  return <div className="creation-screen"><form className="creation-card stone-panel" onSubmit={submit}>
    <span className="brand-mark">TD</span>
    <span className="eyebrow">Bem-vindo a Tiny Dungeon</span>
    <h1>Crie seus 3 personagens</h1>
    <p>Dê um nome a cada um. Todos começam como <b>Squire</b> e evoluem de classe conforme treinam suas proficiências.</p>
    <div className="creation-slots">{names.map((name, index) => <label key={index} className="creation-slot">
      <span className="portrait-placeholder">{name.trim().slice(0, 1) || index + 1}</span>
      <span className="creation-slot-copy"><small>Personagem {index + 1} · Squire · Nível 1</small>
        <input autoFocus={index === 0} value={name} maxLength={NAME_LIMIT} placeholder={PLACEHOLDERS[index]} aria-label={`Nome do personagem ${index + 1}`}
          onChange={event => setNames(current => current.map((entry, at) => at === index ? event.target.value : entry))} /></span>
    </label>)}</div>
    {duplicated && <p className="creation-error">Cada personagem precisa de um nome diferente.</p>}
    <button className="primary" disabled={!ready}>Começar aventura</button>
  </form></div>;
}
