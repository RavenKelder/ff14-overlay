import React, { CSSProperties, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Channel } from "./ipc";
import Radial from "./components/radial";
import Parameters, { Entity } from "./components/parameters";

const container = document.getElementById("app");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
} else {
	console.error("Container is unexpectedly undefined.");
}

const initialPrimaryPlayer: Entity = {
	name: "",
	ID: "",
	heading: 0,
	HP: 10000,
	maxHP: 10000,
	MP: 10000,
	maxMP: 10000,
	position: {
		x: 0,
		y: 0,
		z: 0,
	},
};

interface Options {
	debug: boolean;
	screenWidth: number;
	screenHeight: number;
	menuDiameter: number;
	iconLength: number;
	segments: number;
}

function App(): JSX.Element {
	/**
	 * State hooks.
	 */

	// This is used to store a setInterval timer, which begins when this first
	// renders. It polls the main process with StartOK until it receives a
	// StartOptions response. This is used to clear the setInterval after that
	// occurs.
	const [, setStartTimer] = useState<NodeJS.Timer | null>(null);

	// States for how this menu generally appears.
	const [screenResolution, setScreenResolution] = useState<[number, number]>([
		0, 0,
	]);
	const [containerLength, setContainerLength] = useState(0);
	const [boxSideLength, setBoxSideLength] = useState(0);
	const [radialMenuSegments, setRadialMenuSegments] = useState(0);

	// Whether player is in combat. This affects how the menu is displayed.
	const [inCombat, setInCombat] = useState(false);

	// Whether the player is currently targeting something.
	const [hasTarget, setHasTarget] = useState(false);

	const [inCutscene, setInCutscene] = useState(false);

	// Whether user is in edit mode. In this mode, they can modify the segments.
	// const [editMode, setEditMode] = useState(false);

	// Whether this menu is in debug mode. This mode makes it easier to interact
	// with the menu.
	const [debug, setDebug] = useState(false);

	/**
	 * useEffects.
	 */

	useEffect(() => {
		// Force the container to be bound by this component's size.
		if (container) {
			container.style.width = `${containerLength}px`;
			container.style.height = `${containerLength}px`;
		}

		// On getting the start options, clear the timer so this will stop polling
		// the main process, and set the states that determine how the menu looks.
		window.electronAPI.ipcRendererOn(
			Channel.StartOptions,
			(_event, options) => {
				setStartTimer((prev) => {
					if (prev !== null) {
						clearInterval(prev);
					}
					return null;
				});

				if (typeof options !== "object" || options === null) {
					console.error(
						`Unexpected typeof options ${typeof options}`,
					);
					return;
				}

				if (
					Object.prototype.hasOwnProperty.call(options, "debug") &&
					Object.prototype.hasOwnProperty.call(
						options,
						"screenWidth",
					) &&
					Object.prototype.hasOwnProperty.call(
						options,
						"screenHeight",
					) &&
					Object.prototype.hasOwnProperty.call(
						options,
						"menuDiameter",
					) &&
					Object.prototype.hasOwnProperty.call(
						options,
						"iconLength",
					) &&
					Object.prototype.hasOwnProperty.call(options, "segments")
				) {
					const opts = options as Options;
					setDebug(opts.debug);
					setScreenResolution([opts.screenWidth, opts.screenHeight]);
					setContainerLength(opts.menuDiameter);
					setBoxSideLength(opts.iconLength);
					setRadialMenuSegments(opts.segments);
				} else {
					console.error(
						`Options does not have expected values: ${JSON.stringify(
							options,
						)}`,
					);
				}
			},
		);

		// Hook for when player is in combat.
		window.electronAPI.ipcRendererOn(Channel.Combat, (_, inCombat) => {
			if (typeof inCombat !== "boolean") {
				console.error(`Unexpected typeof inCombat ${typeof inCombat}`);
				return;
			}
			setInCombat(inCombat);
		});

		// Hook for when player has a target.
		window.electronAPI.ipcRendererOn(
			Channel.EmnityDataTarget,
			(_event, _updateType, entity, _aggression, targetType) => {
				if (
					entity === null ||
					targetType === "npc" ||
					targetType === "item"
				) {
					setHasTarget(false);
				} else {
					setHasTarget(true);
				}
			},
		);

		// Hook for player online status changes.
		window.electronAPI.ipcRendererOn(
			Channel.OnlineStatusChanged,
			(_, status) => {
				setInCutscene(status === "InCutscene");
			},
		);

		// Once all hooks are set up, poll the main process with StartOK.
		setStartTimer(
			setInterval(() => {
				window.electronAPI.ipcRendererSend(Channel.StartOK);
			}, 1000),
		);
	}, []);

	/**
	 * Event functions.
	 */

	// const selectFile = (index: number) => {
	// 	window.electronAPI.ipcRendererSend(Channel.FileRequest, index);
	// };

	// const toggleEditMode = () => {
	// 	setEditMode((prev) => !prev);
	// };

	/**
	 * Precomputed CSS styles.
	 */

	const playerParametersHeight = 50;
	const playerParamatersWidth = 200;

	const playerParametersPosition: [number, number] = [
		screenResolution[0] / 2 - playerParamatersWidth - 150,
		screenResolution[1] / 2 + containerLength / 2 + 50,
	];

	const targetParametersPosition: [number, number] = [
		screenResolution[0] / 2 + 150,
		screenResolution[1] / 2 + containerLength / 2 + 50,
	];

	/**
	 * CSS styles.
	 */

	const parentStyle: CSSProperties = {
		height: "100%",
		width: "100%",
	};

	return (
		<div style={parentStyle} className="app">
			<Radial
				debug={debug}
				screenWidth={screenResolution[0]}
				screenHeight={screenResolution[1]}
				diameter={containerLength}
				iconLength={boxSideLength}
				segments={radialMenuSegments}
				inCombat={inCombat}
			/>
			<Parameters
				debug={debug}
				visible={(inCombat || hasTarget) && !inCutscene}
				height={playerParametersHeight}
				width={playerParamatersWidth}
				position={playerParametersPosition}
				channel={Channel.EmnityDataPrimaryPlayer}
				colourTransitionDuration={300}
				initial={initialPrimaryPlayer}
			/>
			<Parameters
				debug={debug}
				visible={(inCombat || hasTarget) && !inCutscene}
				height={playerParametersHeight}
				width={playerParamatersWidth}
				position={targetParametersPosition}
				channel={Channel.EmnityDataTarget}
			/>
		</div>
	);
}
