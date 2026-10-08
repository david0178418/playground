import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { initializeGame } from './ecs/bootstrap';
import { useFullscreen } from './ui/useFullscreen';
import './style.css';

// The engine is a module singleton; serialize mount/unmount so StrictMode's
// double-mount (or fast navigation) never overlaps two game instances.
let lifecycle: Promise<unknown> = Promise.resolve();

export default function Frontline() {
	const rootRef = useRef<HTMLDivElement>(null);
	const fullscreen = useFullscreen(rootRef);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		let disposed = false;
		let teardown: (() => void) | null = null;

		lifecycle = lifecycle
			.then(async () => {
				if (disposed) return;
				teardown = await initializeGame(root);
			})
			.catch(error => {
				console.error('Failed to start Frontline:', error);
			});

		return () => {
			disposed = true;
			lifecycle = lifecycle.then(() => {
				teardown?.();
				teardown = null;
			});
		};
	}, []);

	return (
		<div className="frontline-root" ref={rootRef}>
			<nav className="frontline-toolbar" aria-label="Game display">
				<Link className="frontline-back" to="/" aria-label="Back to projects">←</Link>
				<button className="fullscreen-toggle" type="button" onClick={fullscreen.toggle}
					disabled={!fullscreen.supported || fullscreen.pending} aria-pressed={fullscreen.active}
					title={!fullscreen.supported ? 'Fullscreen is unavailable in this browser' : undefined}>
					{fullscreen.active ? 'Exit fullscreen' : 'Fullscreen'}
				</button>
			</nav>
			<div id="frontline-app">
				<canvas id="game-canvas" width={960} height={540} />
				<div id="hud" />
				<div id="overlay" hidden />
				<div className="touch-controls">
					<div className="touch-joystick" role="group" aria-label="Movement joystick: drag to move">
						<span className="joystick-stick" />
					</div>
					<span className="touch-hint">Drag to move · Auto-fire</span>
				</div>
			</div>
			<div className="landscape-prompt" role="status">
				<span className="rotate-icon" aria-hidden="true">↻</span>
				<h2>Turn your device sideways</h2>
				<p>Frontline plays in landscape.<br />Your run is paused while you rotate.</p>
				<p className="muted">{fullscreen.supported
					? 'Tap Fullscreen to lock landscape where supported.'
					: 'Rotate manually; fullscreen is unavailable in this browser.'}</p>
			</div>
			<p className="display-message" role="status">{fullscreen.message}</p>
		</div>
	);
}
