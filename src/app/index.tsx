import * as React from "react";
import { createRoot } from "react-dom/client";
import { Channel } from "./ipc";
import Box from "./components/box";

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
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [_, setStartTimer] = React.useState<NodeJS.Timer | null>(null);
	const [screenResolution, setScreenResolution] = React.useState<
		[number, number]
	>([0, 0]);
	const [containerLength, setContainerLength] = React.useState(0);
	const [boxSideLength, setBoxSideLength] = React.useState(0);

	const [segments, setSegments] = React.useState(
		[...Array(0).keys()].map((item) => {
			return {
				segment: item,
				imageSource: "",
				cooldown: new Date(),
			};
		}),
	);
	const [hoveredSegment, setHoveredSegment] = React.useState(-1);

	const [inCombat, setInCombat] = React.useState(false);

	const [editMode, setEditMode] = React.useState(false);
	const [visible, setVisible] = React.useState(false);
	const [debug, setDebug] = React.useState(false);

	const boxStyle: React.CSSProperties = {
		position: "absolute",
	};

	const divStyle: React.CSSProperties = {
		height: containerLength,
		width: containerLength,
		margin: "auto",
	};

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

	React.useEffect(() => {
		if (container) {
			container.style.width = `${containerLength}px`;
			container.style.height = `${containerLength}px`;
			container.style.padding = `0`;
			container.style.margin = `0`;
		}
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

		window.electronAPI.ipcRendererOn(Channel.Combat, (_, inCombat) => {
			if (typeof inCombat !== "boolean") {
				console.error(`Unexpected typeof inCombat ${typeof inCombat}`);
				return;
			}

			setInCombat(inCombat);
		});

		window.electronAPI.ipcRendererOn(Channel.MenuOpen, () => {
			setVisible(true);
		});

		window.electronAPI.ipcRendererOn(Channel.MenuClose, () => {
			setVisible(false);
		});

		window.electronAPI.ipcRendererOn(
			Channel.SegmentHover,
			(event, index) => {
				if (typeof index !== "number") {
					console.error(`Unexpected typeof index ${typeof index}`);
					return;
				}
				setHoveredSegment(index);
			},
		);

		setStartTimer(
			setInterval(() => {
				window.electronAPI.ipcRendererSend(Channel.StartOK);
			}, 1000),
		);
	}, []);

	const selectFile = (index: number) => {
		window.electronAPI.ipcRendererSend(Channel.FileRequest, index);
	};

	const selectSegment = (index: number) => {
		setTimeout(() => {
			window.electronAPI.ipcRendererSend(Channel.SegmentSelect, index);
		}, 3000);
	};

	const toggleEditMode = () => {
		setEditMode((prev) => !prev);
	};

	const parentStyle: React.CSSProperties = {
		top: 20,
		height: "100%",
		width: "100%",
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
						<Box
							debug={debug}
							hovered={segment.segment === hoveredSegment}
							visible={visible || editMode}
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
						</Box>
					</div>
				))}
			</div>
			{editMode ? (
				<button onClick={toggleEditMode}>Toggle edit mode</button>
			) : null}
		</div>
	);
}
