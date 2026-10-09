import { html, render } from 'lit-html';
import type { GameEngine } from '../ecs/Engine';
import { experienceForLevel } from '../ecs/progression';
import { waveDef } from '../data/waves';

export function renderHud(root: HTMLElement, ecs: GameEngine): void {
  const phase = ecs.getResource('phase');
  if (phase !== 'playing' && phase !== 'levelUp') {
    render(html``, root);
    return;
  }

  const waveId = ecs.getResource('waveId');
  const wave = waveDef(waveId);
  const elapsed = ecs.getResource('waveElapsed');
  const duration = ecs.getResource('waveDuration');
  const remaining = Math.max(0, duration - elapsed);
  const progression = ecs.getResource('progression');
  const cost = experienceForLevel(progression.level);
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
          <span>Squad ${stats.alliesAlive}</span>
          <span>🪙 ${coins}</span>
          <span>TOK ${tokens}</span>
        </div>
        <div class="hud-row"><span>Level ${progression.level}</span><span>${progression.experience} / ${cost} XP</span></div>
        <progress class="experience-bar" aria-label="Experience to next level" max=${cost} value=${progression.experience}></progress>
        <div class="hud-hint">${wave.blurb}</div>
        <div class="hud-hint keyboard-hint">WASD/Arrows move · cyan gems give XP · level up to recruit · push right to door</div>
        <div class="hud-hint mobile-hint">Auto-fire · cyan gems give XP · level up to recruit · push right to door</div>
      </div>
    `,
    root,
  );
}
