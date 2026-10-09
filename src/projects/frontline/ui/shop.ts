import { html, render } from 'lit-html';
import { SHOP } from '../config';
import { waveDef } from '../data/waves';
import { createAlly } from '../ecs/entities';
import type { GameEngine } from '../ecs/Engine';
import { startWave } from '../ecs/waveLifecycle';

export function renderShop(root: HTMLElement, ecs: GameEngine, onChange: () => void): void {
  const phase = ecs.getResource('phase');
  if (phase !== 'shop') {
    render(html``, root);
    return;
  }

  const nextWave = ecs.getResource('waveId');
  const wave = waveDef(nextWave);
  const coins = ecs.getResource('coins');
  const tokens = ecs.getResource('bankedTokens');
  const atReviveCap = ecs.getEntitiesWithQuery(['ally']).length >= ecs.getResource('softSquadCap');

  const heal = () => {
    if (ecs.getResource('coins') < SHOP.HEAL_COST) return;
    ecs.setResource('coins', ecs.getResource('coins') - SHOP.HEAL_COST);
    for (const ent of ecs.getEntitiesWithQuery(['health'])) {
      if (ecs.entityManager.getComponent(ent.id, 'player') || ecs.entityManager.getComponent(ent.id, 'ally')) {
        const health = ent.components.health;
        health.current = Math.min(health.max, health.current + SHOP.HEAL_AMOUNT);
      }
    }
    onChange();
    renderShop(root, ecs, onChange);
  };

  const revive = () => {
    if (ecs.getResource('coins') < SHOP.REVIVE_COST || ecs.getResource('bankedTokens') < 1) return;
    const players = ecs.getEntitiesWithQuery(['player', 'position']);
    const player = players[0];
    if (!player) return;
    const living = ecs.getEntitiesWithQuery(['ally']).length;
    if (living >= ecs.getResource('softSquadCap')) return;

    ecs.setResource('coins', ecs.getResource('coins') - SHOP.REVIVE_COST);
    ecs.setResource('bankedTokens', ecs.getResource('bankedTokens') - 1);
    createAlly(
      ecs,
      player.components.position.x - 30,
      player.components.position.y,
      'rifleman',
      living,
    );
    const stats = ecs.getResource('stats');
    ecs.setResource('stats', { ...stats, alliesAlive: stats.alliesAlive + 1 });
    onChange();
    renderShop(root, ecs, onChange);
  };

  const continueRun = () => {
    startWave(ecs, nextWave, false);
    onChange();
  };

  render(
    html`
      <div class="overlay-panel shop-panel">
        <h2>Between-wave shop</h2>
        <p>Next: <strong>W${nextWave} — ${wave.name}</strong></p>
        <p class="shop-funds">🪙 ${ecs.getResource('coins')} · Banked tokens: ${ecs.getResource('bankedTokens')}</p>
        <div class="shop-actions">
          <button ?disabled=${coins < SHOP.HEAL_COST} @click=${heal}>
            Heal (+${SHOP.HEAL_AMOUNT} HP) — ${SHOP.HEAL_COST}🪙
          </button>
          <button ?disabled=${coins < SHOP.REVIVE_COST || tokens < 1 || atReviveCap} @click=${revive}>
            Revive one (token + ${SHOP.REVIVE_COST}🪙)
          </button>
        </div>
        ${atReviveCap ? html`<p class="muted">Shop revives require fewer than ${ecs.getResource('softSquadCap')} allies. Level-up recruits have no limit.</p>` : html``}
        <button class="primary" @click=${continueRun}>Continue to Wave ${nextWave}</button>
      </div>
    `,
    root,
  );
}
