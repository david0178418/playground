import { html, render } from 'lit-html';
import { archetype } from '../data/archetypes';
import type { GameEngine } from '../ecs/Engine';
import { chooseLevelUpUnit } from '../ecs/progression';

export const renderLevelUp = function (root: HTMLElement, ecs: GameEngine): void {
  const progression = ecs.getResource('progression');
  render(html`
    <div class="overlay-panel level-up-panel" role="dialog" aria-modal="true" aria-labelledby="level-up-title">
      <h2 id="level-up-title">Level ${progression.level} — choose a unit</h2>
      <p class="muted">Gameplay paused. Recruit one ally to your squad.</p>
      <div class="unit-choices">
        ${progression.choices.map(id => {
          const unit = archetype(id);
          return html`<button class="unit-choice" @click=${() => chooseLevelUpUnit(ecs, id)}>
            <strong style="color:${unit.color}">${unit.name}</strong>
            <span>${unit.role}</span>
            <span class="muted">${unit.maxHp} HP · ${unit.attackDamage} damage · ${unit.attackRange} range</span>
          </button>`;
        })}
      </div>
    </div>
  `, root);
};
