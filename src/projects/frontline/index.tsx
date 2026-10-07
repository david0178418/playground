import { useEffect, useRef } from 'react';
import { initializeGame } from './ecs/bootstrap';
import './style.css';

// The engine is a module singleton; serialize mount/unmount so StrictMode's
// double-mount (or fast navigation) never overlaps two game instances.
let lifecycle: Promise<unknown> = Promise.resolve();

export default function Frontline() {
	const rootRef = useRef<HTMLDivElement>(null);

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
			<div id="frontline-app">
				<canvas id="game-canvas" width={960} height={540} />
				<div id="hud" />
				<div id="overlay" hidden />
			</div>
		</div>
	);
}
