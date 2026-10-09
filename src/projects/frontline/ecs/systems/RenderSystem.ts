import { html, render } from 'lit-html';
import { renderFrame } from '../../render/canvasRenderer';
import { renderHud } from '../../ui/hud';
import { renderLevelUp } from '../../ui/levelUp';
import { renderShop } from '../../ui/shop';
import { renderEndScreen } from '../../ui/endScreen';
import type { GameSystemRegistrar } from '../Engine';

let canvasCtx: CanvasRenderingContext2D | null = null;
let hudRoot: HTMLElement | null = null;
let overlayRoot: HTMLElement | null = null;

export function initRenderTargets(
  canvas: HTMLCanvasElement,
  hud: HTMLElement,
  overlay: HTMLElement,
): void {
  canvasCtx = canvas.getContext('2d');
  hudRoot = hud;
  overlayRoot = overlay;
}

export function addRenderSystem(systems: GameSystemRegistrar): void {
  let previousPhase: string | null = null;
  systems.addSystem('render')
    .inPhase('postUpdate')
    .setProcess(({ ecs }) => {
      if (canvasCtx) renderFrame(canvasCtx, ecs);
      if (hudRoot) renderHud(hudRoot, ecs);
      if (overlayRoot) {
        const phase = ecs.getResource('phase');
        overlayRoot.hidden = phase === 'playing';
        const refresh = () => {
          // UI buttons mutate state; next frame re-renders
        };
        if (phase === 'levelUp') renderLevelUp(overlayRoot, ecs);
        else if (phase === 'shop') renderShop(overlayRoot, ecs, refresh);
        else if (phase === 'won' || phase === 'lost') renderEndScreen(overlayRoot, ecs, refresh);
        else render(html``, overlayRoot);
        if (phase === 'levelUp' && previousPhase !== phase) {
          overlayRoot.querySelector<HTMLButtonElement>('.unit-choice')?.focus();
        }
        previousPhase = phase;
      }
    });
}
