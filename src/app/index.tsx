import React, { CSSProperties, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Channel } from "./ipc";
import Segment from "./components/segment";

const container = document.getElementById("app");
if (container) {
	const root = createRoot(container);
	root.render(<App />);
} else {
	console.error("Container is unexpectedly undefined.");
}

interface AppProps {
	offset?: boolean;
}

interface Options {
	debug: boolean;
	screenWidth: number;
	screenHeight: number;
	menuDiameter: number;
	iconLength: number;
	segments: number;
}

function App(opts: AppProps): JSX.Element {
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
	const [segments, setSegments] = useState(
		[...Array(0).keys()].map((item) => {
			return {
				segment: item,
				imageSource: "",
				cooldown: new Date(),
			};
		}),
	);

	// Which menu segment is currently hovered. A negative value indicates none.
	const [hoveredSegment, setHoveredSegment] = useState(-1);

	// Whether player is in combat. This affects how the menu is displayed.
	const [inCombat, setInCombat] = useState(false);

	// Whether user is in edit mode. In this mode, they can modify the segments.
	const [editMode, setEditMode] = useState(false);

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
			(event, options) => {
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
					setSegments((prev) => {
						return [...Array(opts.segments).keys()].map(
							(item, index) => {
								let imageSource = "";
								let cooldown = new Date();
								if (index < prev.length) {
									imageSource = prev[index].imageSource;
									cooldown = prev[index].cooldown;
								}
								return {
									segment: item,
									imageSource: imageSource,
									cooldown: cooldown,
								};
							},
						);
					});
				} else {
					console.error(
						`Options does not have expected values: ${JSON.stringify(
							options,
						)}`,
					);
				}
			},
		);

		// When icon images are received, populate the appropriate segment with
		// that data.
		window.electronAPI.ipcRendererOn(
			Channel.FileReceive,
			(event, base64, index) => {
				if (typeof index !== "number") {
					console.warn(`Unexpected index type ${typeof index}`);
					return;
				}
				if (isNaN(index)) {
					return;
				}
				setSegments((prev) =>
					prev.map((s, i) => {
						if (i !== index) {
							return s;
						} else {
							return {
								imageSource: `data:image/jpg;base64,${base64}`,
								segment: s.segment,
								cooldown: s.cooldown,
							};
						}
					}),
				);
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

		// Hook when segments are being hovered.
		window.electronAPI.ipcRendererOn(Channel.SegmentHover, (_, index) => {
			if (typeof index !== "number") {
				console.error(`Unexpected typeof index ${typeof index}`);
				return;
			}
			setHoveredSegment(index);
		});

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

	const selectFile = (index: number) => {
		window.electronAPI.ipcRendererSend(Channel.FileRequest, index);
	};

	// This is practically unused as there's no real interaction with the menu
	// window.
	const selectSegment = (index: number) => {
		window.electronAPI.ipcRendererSend(Channel.SegmentSelect, index);
	};

	const toggleEditMode = () => {
		setEditMode((prev) => !prev);
	};

	/**
	 * Precomputed CSS style properties.
	 */

	// We need to place the segments at the centre of the screen, and then
	// distribute each segment around the menu radius equally.
	const internalRadius = Math.round((containerLength * 0.9) / 2);
	const angle = (2 * Math.PI) / segments.length;

	const segmentPositions = segments.map((val, index) => {
		let segmentAngle: number = angle * index;
		if (!opts.offset) {
			segmentAngle = segmentAngle + angle / 2;
		}
		return {
			...val,
			angle: segmentAngle,
			positionX: Math.round(
				screenResolution[0] / 2 -
					boxSideLength / 2 +
					Math.cos(segmentAngle) * internalRadius,
			),
			positionY: Math.round(
				screenResolution[1] / 2 -
					boxSideLength / 2 +
					Math.sin(segmentAngle) * internalRadius,
			),
		};
	});

	/**
	 * CSS styles.
	 */

	const parentStyle: CSSProperties = {
		top: 20,
		height: "100%",
		width: "100%",
	};

	const boxStyle: CSSProperties = {
		position: "absolute",
	};

	const divStyle: CSSProperties = {
		height: containerLength,
		width: containerLength,
		margin: "auto",
	};

	return (
		<div style={parentStyle}>
			<div style={divStyle}>
				{segmentPositions.map((segment, index) => (
					<div
						key={segment.segment}
						onClick={() => {
							if (editMode) {
								selectFile(index);
							} else {
								selectSegment(index);
							}
						}}
					>
						<Segment
							totalSegments={segments.length}
							debug={debug}
							hovered={segment.segment === hoveredSegment}
							forceVisible={editMode}
							inCombat={inCombat}
							key={segment.segment}
							sideLength={boxSideLength}
							segment={segment.segment}
							style={{
								...boxStyle,
								transform: `translate(${segment.positionX}px, ${segment.positionY}px)`,
							}}
						>
							{segment.imageSource ? (
								<img
									height={boxSideLength}
									width={boxSideLength}
									src={segment.imageSource}
									alt="icon"
								></img>
							) : (
								<p>{segment.segment}</p>
							)}
						</Segment>
					</div>
				))}
			</div>
			{editMode ? (
				<button onClick={toggleEditMode}>Toggle edit mode</button>
			) : null}
		</div>
	);
}
