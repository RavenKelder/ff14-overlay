import React, { CSSProperties, useEffect, useState } from "react";
import { Transition } from "react-transition-group";
import { useTimer } from "react-timer-hook";
import { AbilityState, Channel } from "../ipc";
import Centred from "./centered";

const BORDER_WIDTH = 2;
const BORDER_WIDTH_HOVERED = 4;
const BORDER_RADIUS = 8;
const BORDER_RADIUS_HOVERED = 11;
const BORDER_COLOUR = "#deddba";
const BORDER_SHADOW_COLOUR = "#7d7c68";
const NEAR_OFF_COOLDOWN = 10;
const NEAR_OFF_COOLDOWN_OPACITY = 0.9;
const FADE_IN_TIME = 0;
const OFF_COOLDOWN_FADE_TIME = 200;
const ON_COOLDOWN_FADE_TIME = 400;
const IN_COMBAT_OPACITY = 0.4;
const SEGMENT_SELECT_DELAY = 500;

interface BoxProps {
	sideLength: number;
	children: React.ReactNode;
	style?: React.CSSProperties;
	forceVisible?: boolean;
	totalSegments: number;
	segment: number;
	inCombat: boolean;
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

// Segment represents an icon for an ability.
export default function Segment(props: BoxProps): JSX.Element {
	/**
	 * State hooks.
	 */

	const { seconds, minutes, restart } = useTimer({
		expiryTimestamp: new Date(),
	});
	const [cooldown, setCooldown] = useState(0);
	const [charges, setCharges] = useState(1);
	const [maxCharges, setMaxCharges] = useState(1);

	const [baseVisibility, setBaseVisibility] = useState(false);

	let visible = baseVisibility;
	if (props.forceVisible) {
		visible = true;
	}

	const borderWidth = props.hovered ? BORDER_WIDTH_HOVERED : BORDER_WIDTH;

	/**
	 * useEffects.
	 */

	// Once off useEffect to initialise IPC hooks.
	useEffect(() => {
		// When the menu closes, check if this segment has been selected. If so,
		// then delay the closing of this segment. Each segment needs to manage
		// its own visibility based on the MenuClose/Open channels since when
		// they closed wrt. to the rest of the menu closing is different.
		window.electronAPI.ipcRendererOn(Channel.MenuClose, (event, index) => {
			if (index === props.segment) {
				setTimeout(() => {
					setBaseVisibility(false);
				}, SEGMENT_SELECT_DELAY);
			} else {
				setBaseVisibility(false);
			}
		});

		window.electronAPI.ipcRendererOn(Channel.MenuOpen, () => {
			setBaseVisibility(true);
		});

		// Get ability information, occurs at the start when the menu is created.
		// The ability state can be null if there's no information on the ability,
		// in which case the following hook will never occur (e.g. for abilities
		// with no cooldowns, this is an acceptable behaviour).
		window.electronAPI.ipcRendererOn(
			Channel.AbilityChargesReceive,
			(event, segment, state) => {
				if (segment !== props.segment) {
					return;
				}
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

		// Occurs whenever an ability goes into cooldown, update the ability
		// states if the segment number matches this one.
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

		// Once all hooks set up, send a request to get the current segment's
		// ability state.
		window.electronAPI.ipcRendererSend(
			Channel.AbilityChargesRequest,
			props.segment,
		);
	}, []);

	// Computes ability charges, and determines if this segment needs to go on
	// cooldown when its current one has expired. Only relevant for abilities
	// with multiple charges.
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

	/**
	 * Precomputed CSS style properties.
	 */

	const totalSeconds = seconds + minutes * 60;

	const percentage = totalSeconds === 0 ? 0 : (100 * totalSeconds) / cooldown;

	// Setup transition opacities.
	const openOpacity = 1;
	let closeOpacity = props.debug ? 0.3 : 0;

	const borderRadius = props.hovered ? BORDER_RADIUS_HOVERED : BORDER_RADIUS;

	// In combat, the segment may show up with a non-zero opacity, as well as
	// when an ability is near off cooldown.
	if (props.inCombat) {
		closeOpacity = IN_COMBAT_OPACITY;
		if (totalSeconds > 0 && totalSeconds <= NEAR_OFF_COOLDOWN) {
			closeOpacity = NEAR_OFF_COOLDOWN_OPACITY;
		}
	}

	const fadeOutTime =
		totalSeconds > 0 ? ON_COOLDOWN_FADE_TIME : OFF_COOLDOWN_FADE_TIME;

	// When this component is going to be visible, the fade in time should be
	// instantaneous. When this component is going to not be visible, the fade
	// out time should be determined by fadeOutTime.
	const duration = visible ? FADE_IN_TIME : fadeOutTime;

	// Determine brightness by whether there are charges remaining (i.e. ability
	// can still be used) and whether it is hovered.
	let brightness = 100;
	if (charges === 0) {
		brightness = brightness - 50;
	}
	if (props.hovered) {
		brightness = brightness + 25;
	}

	/**
	 * CSS styles.
	 */

	const style: CSSProperties = {
		...props.style,
		height: props.sideLength,
		width: props.sideLength,
		border: props.hovered ? "" : undefined,
		transition: `opacity ${duration}ms ease-in-out`,
	};

	const transitionStyles: Record<string, CSSProperties> = {
		entering: { opacity: openOpacity },
		entered: { opacity: openOpacity },
		exiting: { opacity: closeOpacity },
		exited: { opacity: closeOpacity },
	};

	const cooldownStyle: CSSProperties = {
		position: "absolute",
		fontSize: totalSeconds > 99 ? 25 : 30,
		zIndex: totalSeconds > 0 ? 1003 : -10,
		transform: `translate(-50%, 0%)`,
		margin: "auto",
		top: totalSeconds > 99 ? 7 : 3,
		color: "white",
		WebkitTextStroke: "1px black",
	};

	const chargesStyle: CSSProperties = {
		position: "absolute",
		fontSize: 18,
		zIndex: 1002,
		transform: `translate(${props.sideLength / 2 - 7}px, ${
			props.sideLength - 14
		}px)`,
		margin: "auto",
		color: "white",
		opacity: maxCharges > 1 ? 1 : 0,
		// WebkitTextStroke: "1px red",
		textShadow: `0 0 5px red`,
	};

	let iconStyle: CSSProperties = {
		zIndex: 1000,
		position: "absolute",
		filter: `brightness(${brightness}%)`,
		height: props.sideLength,
		width: props.sideLength,
		transform: `translate(-${
			Math.round(props.sideLength / 2) + borderWidth
		}px, -${borderWidth}px)`,
		borderWidth: borderWidth,
		borderColor: "#000",
		borderStyle: "solid",
		borderRadius: borderRadius,
	};

	let borderStyle: CSSProperties = {
		transform: `translate(-${
			Math.round(props.sideLength / 2) + borderWidth
		}px, -${borderWidth}px)`,
		position: "absolute",
		height: props.sideLength,
		width: props.sideLength,
		borderWidth: borderWidth,
		borderColor: "#000",
		borderStyle: "solid",
		boxShadow: `0 0 6px black`,
		borderRadius: borderRadius,
		zIndex: 1001,
	};

	if (props.hovered) {
		borderStyle = {
			...borderStyle,
			borderColor: BORDER_COLOUR,
			boxShadow: `0 0 15px ${BORDER_SHADOW_COLOUR}`,
		};
		iconStyle = {
			...iconStyle,
			borderColor: BORDER_COLOUR,
			boxShadow: `0 0 15px ${BORDER_SHADOW_COLOUR}`,
		};
	}

	return (
		<Transition timeout={duration} in={visible}>
			{(state) => (
				<Centred
					style={{
						...style,
						...transitionStyles[state],
					}}
				>
					<div style={borderStyle}></div>
					<b style={cooldownStyle}>{totalSeconds}</b>
					<b style={chargesStyle}>{charges}</b>
					<div style={iconStyle}>{props.children}</div>
				</Centred>
			)}
		</Transition>
	);
}
