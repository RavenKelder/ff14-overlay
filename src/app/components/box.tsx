import React, { useEffect, useState } from "react";
import { useTimer } from "react-timer-hook";
import { AbilityState, Channel } from "../ipc";
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
	debug?: boolean;
}

function calculateCooldownTime(ability: AbilityState): [Date, boolean] {
	let nextCooldownTime = new Date();
	const currentTime = new Date();
	let shouldUpdate = false;
	for (let i = ability.lastOnCooldowns.length - 1; i >= 0; i--) {
		if (
			ability.lastOnCooldowns[i].getTime() + ability.cooldown * 1000 >
			currentTime.getTime()
		) {
			nextCooldownTime = new Date(
				ability.lastOnCooldowns[i].getTime() + ability.cooldown * 1000,
			);
			shouldUpdate = true;
			break;
		}
	}

	return [nextCooldownTime, shouldUpdate];
}

export default function Box(props: BoxProps): JSX.Element {
	const borderWidth = 4;

	const { seconds, minutes, restart } = useTimer({
		expiryTimestamp: new Date(),
	});
	const [cooldown, setCooldown] = useState(0);
	const [charges, setCharges] = useState(1);
	const [maxCharges, setMaxCharges] = useState(1);

	useEffect(() => {
		window.electronAPI.ipcRendererOn(
			Channel.AbilityChargesReceive,
			(event, segment, state) => {
				if (segment !== props.segment) {
					return;
				}
				console.log(`Got ability state ${JSON.stringify(state)}`);
				if (state === null) {
					setCooldown(0);
					setCharges(1);
					setMaxCharges(1);
					return;
				}

				const ability = state as AbilityState;
				setCooldown(ability.cooldown);
				setCharges(ability.currentCharges);
				setMaxCharges(ability.charges);
				const [nextCooldownTime, shouldUpdate] =
					calculateCooldownTime(ability);
				if (shouldUpdate) {
					restart(nextCooldownTime);
				}
			},
		);
		window.electronAPI.ipcRendererOn(
			Channel.SegmentCooldown,
			(event, index, state) => {
				if (index !== props.segment) {
					return;
				}
				const ability = state as AbilityState;
				const [nextCooldownTime, shouldUpdate] =
					calculateCooldownTime(ability);

				setCooldown(ability.cooldown);
				setCharges(ability.currentCharges);
				setMaxCharges(ability.charges);

				if (shouldUpdate) {
					restart(nextCooldownTime);
				}
			},
		);
		window.electronAPI.ipcRendererSend(
			Channel.AbilityChargesRequest,
			props.segment,
		);
	}, []);

	useEffect(() => {
		if (charges === maxCharges || minutes * 60 + seconds > 0) {
			return;
		}

		setCharges((c) => {
			const next = c + 1;
			if (next < maxCharges) {
				restart(new Date(new Date().getTime() + cooldown * 1000));
			}
			return next;
		});
	}, [seconds, minutes]);

	const totalSeconds = seconds + minutes * 60;
	let opacity = 0;
	if (props.inCombat) {
		opacity = IN_COMBAT_OPACITY;
		if (totalSeconds > 0 && totalSeconds <= NEAR_OFF_COOLDOWN) {
			opacity = NEAR_OFF_COOLDOWN_OPACITY;
		}
	}

	if (props.visible) {
		opacity = 1;
	}
	if (props.debug) {
		opacity = opacity + 0.2;
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
		transform: `translate(-50%, 0%)`,
		margin: "auto",
		top: totalSeconds > 99 ? 7 : 3,
		color: "white",
		WebkitTextStroke: "1px black",
	};

	const chargesStyle: React.CSSProperties = {
		position: "absolute",
		fontSize: 18,
		zIndex: 1000,
		transform: `translate(${props.sideLength / 2 - 7}px, ${
			props.sideLength - 14
		}px)`,
		margin: "auto",
		color: "white",
		opacity: maxCharges > 1 ? 1 : 0,
		WebkitTextStroke: "1px black",
	};

	let brightness = 100;
	if (charges === 0) {
		brightness = brightness - 50;
	}
	if (props.hovered) {
		brightness = brightness + 25;
	}

	let iconStyle: React.CSSProperties = {
		position: "absolute",
		transform: `translate(-${Math.round(props.sideLength / 2)}px, 0%)`,
		filter: `brightness(${brightness}%)`,
		height: props.sideLength,
		width: props.sideLength,
	};

	if (props.hovered) {
		iconStyle = {
			...iconStyle,
			transform: `translate(-${
				Math.round(props.sideLength / 2) + borderWidth
			}px, -${borderWidth}px)`,
			borderWidth: borderWidth,
			borderColor: "#c7c58d",
			borderStyle: "solid",
			borderRadius: 10,
			boxShadow: "0 0 15px #c7c58d",
		};
	}

	return (
		<Centred style={style}>
			<b style={cooldownStyle}>{totalSeconds}</b>
			<b style={chargesStyle}>{charges}</b>
			<div style={iconStyle}>{props.children}</div>
		</Centred>
	);
}
