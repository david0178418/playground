import { html, render } from 'lit-html';
import type { GameEngine } from '../ecs/Engine';
import { waveDef } from '../data/waves';

export function renderHud(root: HTMLElement, ecs: GameEngine): void {
  const phase = ecs.getResource('phase');
  if (phase !== 'playing') {
    render(html``, root);
    return;
  }

  const waveId = ecs.getResource('waveId');
  const wave = waveDef(waveId);
  const elapsed = ecs.getResource('waveElapsed');
  const duration = ecs.getResource('waveDuration');
  const remaining = Math.max(0, duration - elapsed);
  const coins = ecs.getResource('coins');
  const tokens = ecs.getResource('bankedTokens');
  const doorOpen = ecs.getResource('doorOpen');
  const stats = ecs.getResource('stats');

  let playerHp = '—';
  const players = ecs.getEntitiesWithQuery(['player', 'health']);
  const p = players[0];
  if (p) {
    const h = p.components.health;
    playerHp = `${Math.ceil(h.current)}/${h.max}`;
  }

  render(
    html`
      <div class="hud-panel">
        <div class="hud-row">
          <strong>W${waveId}: ${wave.name}</strong>
          <span>${remaining > 0 ? `Door ${Math.ceil(remaining)}s` : doorOpen ? 'DOOR OPEN →' : '…'}</span>
        </div>
        <div class="hud-row">
          <span>HP ${playerHp}</span>
          <span>Squad ${stats.alliesAlive}/${ecs.getResource('softSquadCap')}</span>
          <span>🪙 ${coins}</span>
          <span>TOK ${tokens}</span>
        </div>
        <div class="hud-hint">${wave.blurb}</div>
        <div class="hud-hint keyboard-hint">WASD/Arrows move · yellow crates recruit · purple tokens bank · push right to door</div>
        <div class="hud-hint mobile-hint">Auto-fire · yellow crates recruit · purple tokens bank · push right to door</div>
      </div>
    `,
    root,
  );
}
