import { html, render } from 'lit-html';
import type { GameEngine } from '../ecs/Engine';
import { restartRun } from '../ecs/waveLifecycle';

export function renderEndScreen(root: HTMLElement, ecs: GameEngine, onChange: () => void): void {
  const phase = ecs.getResource('phase');
  if (phase !== 'won' && phase !== 'lost') {
    render(html``, root);
    return;
  }

  const stats = ecs.getResource('stats');
  const reason = ecs.getResource('endReason');
  const title = phase === 'won' ? 'Victory' : 'Defeat';

  render(
    html`
      <div class="overlay-panel end-panel">
        <h2>${title}</h2>
        <p>${reason}</p>
        <ul class="end-stats">
          <li>Waves cleared: <strong>${stats.wavesCleared}</strong> / 3</li>
          <li>Allies alive: <strong>${stats.alliesAlive}</strong></li>
          <li>Allies lost: <strong>${stats.alliesLost}</strong></li>
          <li>Recruited: ${stats.alliesRecruited} · Kills: ${stats.enemiesKilled}</li>
        </ul>
        <button class="primary" @click=${() => { restartRun(ecs); onChange(); }}>
          Play again
        </button>
      </div>
    `,
    root,
  );
}
