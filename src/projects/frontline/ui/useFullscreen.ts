import { useEffect, useRef, useState, type RefObject } from 'react';

interface FullscreenRoot extends HTMLDivElement {
	webkitRequestFullscreen?: () => Promise<void> | void;
}
interface FullscreenDocument extends Document {
	webkitFullscreenElement?: Element | null;
	webkitExitFullscreen?: () => Promise<void> | void;
}
interface LandscapeOrientation extends ScreenOrientation {
	lock?: (orientation: 'landscape') => Promise<void>;
}

const fullscreenElement = function(): Element | null {
	const fullscreenDocument: FullscreenDocument = document;
	return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null;
};

const exitFullscreen = async function(): Promise<void> {
	const fullscreenDocument: FullscreenDocument = document;
	if (document.exitFullscreen) await document.exitFullscreen();
	else await fullscreenDocument.webkitExitFullscreen?.();
};

export const useFullscreen = function(rootRef: RefObject<HTMLDivElement | null>) {
	const [active, setActive] = useState(false);
	const [supported, setSupported] = useState(false);
	const [pending, setPending] = useState(false);
	const [message, setMessage] = useState('');
	const ownsLandscapeLock = useRef(false);

	const unlock = function() {
		if (!ownsLandscapeLock.current) return;
		screen.orientation?.unlock();
		ownsLandscapeLock.current = false;
	};

	useEffect(function() {
		const root: FullscreenRoot | null = rootRef.current;
		if (!root) return;
		setSupported(Boolean(root.requestFullscreen || root.webkitRequestFullscreen));
		const changed = function() {
			const isActive = fullscreenElement() === root;
			setActive(isActive);
			if (!isActive) {
				unlock();
				setMessage('');
			}
		};
		document.addEventListener('fullscreenchange', changed);
		document.addEventListener('webkitfullscreenchange', changed);
		return function() {
			document.removeEventListener('fullscreenchange', changed);
			document.removeEventListener('webkitfullscreenchange', changed);
			unlock();
			if (fullscreenElement() === root) void exitFullscreen().catch(console.error);
		};
	}, [rootRef]);

	const toggle = async function() {
		const root: FullscreenRoot | null = rootRef.current;
		if (!root || pending) return;
		setPending(true);
		setMessage('');
		try {
			if (fullscreenElement() === root) {
				await exitFullscreen();
				return;
			}
			if (root.requestFullscreen) await root.requestFullscreen();
			else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
			else {
				setMessage('Fullscreen is unavailable in this browser. Rotate your device to play.');
				return;
			}
			if (!root.isConnected) {
				if (fullscreenElement() === root) await exitFullscreen();
				return;
			}
			const orientation: LandscapeOrientation | undefined = screen.orientation;
			try {
				if (!orientation?.lock) throw new Error('Landscape lock unavailable');
				await orientation.lock('landscape');
				ownsLandscapeLock.current = true;
				if (!root.isConnected || fullscreenElement() !== root) unlock();
			} catch {
				if (root.isConnected) setMessage('Rotate your device to landscape if it does not turn automatically.');
			}
		} catch {
			if (root.isConnected) setMessage('Could not enter fullscreen. Try again or play in landscape.');
		} finally {
			if (root.isConnected) setPending(false);
		}
	};

	return { active, supported, pending, message, toggle };
};
