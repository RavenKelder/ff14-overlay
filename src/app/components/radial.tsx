import React, { CSSProperties, useEffect, useState } from "react";

import { Channel } from "../ipc";
import Segment from "./segment";

interface RadialProps {
	offset?: boolean;
	debug: boolean;
	screenWidth: number;
	screenHeight: number;
	diameter: number;
	iconLength: number;
	segments: number;
	inCombat: boolean;
}

export default function Radial(props: RadialProps): JSX.Element {
	/**
	 * State hooks.
	 */
	const [segments, setSegments] = useState(
		[...Array(props.segments).keys()].map((item) => {
			return {
				segment: item,
				imageSource: "",
				cooldown: new Date(),
			};
		}),
	);

	// Which menu segment is currently hovered. A negative value indicates none.
	const [hoveredSegment, setHoveredSegment] = useState(-1);

	/**
	 * useEffects.
	 */

	useEffect(() => {
		setSegments(
			[...Array(props.segments).keys()].map((item) => {
				return {
					segment: item,
					imageSource: "",
					cooldown: new Date(),
				};
			}),
		);
	}, [props.segments]);

	useEffect(() => {
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

		// Hook when segments are being hovered.
		window.electronAPI.ipcRendererOn(Channel.SegmentHover, (_, index) => {
			if (typeof index !== "number") {
				console.error(`Unexpected typeof index ${typeof index}`);
				return;
			}
			setHoveredSegment(index);
		});
	}, []);

	/**
	 * Precomputed CSS style properties.
	 */

	// We need to place the segments at the centre of the screen, and then
	// distribute each segment around the menu radius equally.
	const internalRadius = Math.round((props.diameter * 0.9) / 2);
	const angle = (2 * Math.PI) / segments.length;

	const segmentPositions = segments.map((val, index) => {
		let segmentAngle: number = angle * index;
		if (!props.offset) {
			segmentAngle = segmentAngle + angle / 2;
		}
		return {
			...val,
			angle: segmentAngle,
			positionX: Math.round(
				props.screenWidth / 2 -
					props.iconLength / 2 +
					Math.cos(segmentAngle) * internalRadius,
			),
			positionY: Math.round(
				props.screenHeight / 2 -
					props.iconLength / 2 +
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
		height: props.screenHeight,
		width: props.screenWidth,
		margin: "auto",
	};

	return (
		<div style={parentStyle} className="radial">
			<div style={divStyle}>
				{segmentPositions.map((segment) => (
					<div key={segment.segment}>
						<Segment
							totalSegments={segments.length}
							debug={props.debug}
							hovered={segment.segment === hoveredSegment}
							inCombat={props.inCombat}
							key={segment.segment}
							sideLength={props.iconLength}
							segment={segment.segment}
							style={{
								...boxStyle,
								transform: `translate(${segment.positionX}px, ${segment.positionY}px)`,
							}}
						>
							{segment.imageSource ? (
								<img
									height={props.iconLength}
									width={props.iconLength}
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
		</div>
	);
}
