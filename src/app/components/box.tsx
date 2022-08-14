import React, { useEffect } from "react";
import { useTimer } from "react-timer-hook";
import { Channel } from "../ipc";
import Centred from "./centered";

const NEAR_OFF_COOLDOWN = 10;
const NEAR_OFF_COOLDOWN_OPACITY = 0.9;
const IN_COMBAT_OPACITY = 0.4;

interface BoxProps {
	sideLength: number;
	children: React.ReactNode;
	style?: React.CSSProperties;
	segment: number;
	inCombat: boolean;
	visible: boolean;
	hovered: boolean;
}

export default function Box(props: BoxProps): JSX.Element {
	const { seconds, minutes, restart } = useTimer({
		expiryTimestamp: new Date(),
	});

	useEffect(() => {
		window.electronAPI.ipcRendererOn(
			Channel.SegmentCooldown,
			(event, index, cooldown) => {
				if (typeof cooldown !== "number") {
					console.error(
						`Unexpected typeof cooldown ${typeof cooldown}`,
					);
					return;
				}
				if (index !== props.segment) {
					return;
				}

				const cooldownEnd = new Date();
				cooldownEnd.setTime(cooldownEnd.getTime() + cooldown * 1000);
				restart(cooldownEnd);
			},
		);
	}, []);

	const totalSeconds = seconds + minutes * 60;
	const onHoveredPadding = props.hovered ? 3 : 0;
	let opacity = 0;
	if (props.inCombat) {
		opacity = IN_COMBAT_OPACITY;
	}
	if (totalSeconds > 0 && totalSeconds <= NEAR_OFF_COOLDOWN) {
		opacity = NEAR_OFF_COOLDOWN_OPACITY;
	}
	if (props.visible) {
		opacity = 1;
	}

	const style: React.CSSProperties = {
		...props.style,
		opacity: opacity,
		height: props.sideLength,
		width: props.sideLength,
		border: props.hovered ? "" : undefined,
	};

	const cooldownStyle: React.CSSProperties = {
		position: "absolute",
		fontSize: totalSeconds > 99 ? 25 : 30,
		zIndex: totalSeconds > 0 ? 1000 : -10,
		transform: "translate(-50%, 0%)",
		margin: "auto",
		top: totalSeconds > 99 ? 7 + onHoveredPadding : 3 + onHoveredPadding,
		color: "white",
		WebkitTextStroke: "1px black",
	};

	let brightness = 100;
	if (totalSeconds > 0) {
		brightness = brightness - 50;
	}
	if (props.hovered) {
		brightness = brightness + 25;
	}

	let iconStyle: React.CSSProperties = {
		position: "absolute",
		transform: "translate(-50%, 0%)",
		filter: `brightness(${brightness}%)`,
		height: 50,
		width: 50,
	};

	if (props.hovered) {
		iconStyle = {
			...iconStyle,
			borderWidth: 4,
			borderColor: "#c7c58d",
			borderStyle: "solid",
			borderRadius: 10,
			boxShadow: "0 0 15px #c7c58d",
		};
	}

	return (
		<Centred style={style}>
			<b style={cooldownStyle}>{totalSeconds}</b>
			<div style={iconStyle}>{props.children}</div>
		</Centred>
	);
}
