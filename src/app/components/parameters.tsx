import React, { useEffect, useState } from "react";
import { Channel } from "../ipc";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { Progress } from "@mantine/core";

const BASE_FONT_SIZE = 1.2;
const OVERFLOW_TITLE_LENGTH = 20;

const MP_COLOUR = "#4b7bdb";

const colourBreakpoints: Record<string, ColourBreakpoint[]> = {
	player: [
		{
			value: 25,
			colour: "#ff3b3b",
			colourRising: "#87ff87",
			colourDropping: "#ff988c",
		},
		{
			value: 50,
			colour: "#ff9900",
			colourRising: "#87ff87",
			colourDropping: "#ff988c",
		},
		{
			value: 100,
			colour: "#10a110",
			colourRising: "#87ff87",
			colourDropping: "#ff988c",
		},
	],
	npc: [
		{
			value: 100,
			colour: "#11b50b",
			colourRising: "#a3f0a1",
			colourDropping: "#a3f0a1",
		},
	],
	neutral: [
		{
			value: 100,
			colour: "#f78b39",
			colourRising: "#fac093",
			colourDropping: "#fac093",
		},
	],
	aggressive: [
		{
			value: 100,
			colour: "#c41b1b",
			colourRising: "#fab6b6",
			colourDropping: "#fab6b6",
		},
	],
};

interface ColourBreakpoint {
	value: number;
	colour: string;
	colourRising: string;
	colourDropping: string;
}

interface ParametersProps {
	debug?: boolean;
	height: number;
	width: number;
	position: [number, number];
	channel: Channel;
	visible: boolean;
	colourTransitionDuration?: number;
	initial?: Entity;
}

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

export interface Entity {
	ID: string;
	name: string;
	HP: number;
	maxHP: number;
	MP: number;
	maxMP: number;
	position: Vec3;
	heading: number;
}

type TargetType = "player" | "npc" | "monster";

function determineHPColour(
	targetType: TargetType,
	hpValue: number,
	aggressive: boolean,
): ColourBreakpoint {
	let breakpoints: ColourBreakpoint[] = [];

	if (targetType === "player") {
		breakpoints = colourBreakpoints["player"];
	} else if (targetType === "npc") {
		breakpoints = colourBreakpoints["npc"];
	} else if (targetType === "monster") {
		if (aggressive) {
			breakpoints = colourBreakpoints["aggressive"];
		} else {
			breakpoints = colourBreakpoints["neutral"];
		}
	}

	for (let i = 0; i < breakpoints.length; i++) {
		if (hpValue <= breakpoints[i].value) {
			return breakpoints[i];
		}
	}

	return {
		value: 100,
		colour: "#f78b39",
		colourRising: "#fac093",
		colourDropping: "#fac093",
	};
}

export default function Parameters(props: ParametersProps): JSX.Element {
	const [entity, setEntity] = useState<Entity | null>(props.initial ?? null);
	const [aggressive, setAggressive] = useState(false);
	const [targetType, setTargetType] = useState<TargetType>("monster");

	useEffect(() => {
		window.electronAPI.ipcRendererOn(
			props.channel,
			(event, updateType, entity, aggression, targetType) => {
				if (typeof aggression === "string") {
					if (aggression === "aggressive") {
						setAggressive(true);
					} else {
						setAggressive(false);
					}
				}
				if (typeof targetType === "string") {
					if (targetType === "player") {
						setTargetType("player");
					} else if (targetType === "npc") {
						setTargetType("npc");
					} else {
						setTargetType("monster");
					}
				} else {
					setTargetType("monster");
				}
				if (updateType === "update") {
					setEntity(entity as Entity | null);
				} else if (updateType === "death") {
					setEntity((prev) => {
						if (prev) {
							return { ...prev, HP: 0 };
						} else {
							return null;
						}
					});
				}
			},
		);
	}, []);

	const defaultEntity: Entity = {
		heading: 0,
		HP: 1000,
		ID: "",
		maxHP: 1000,
		maxMP: 1000,
		MP: 1000,
		name: "unknown",
		position: {
			x: 0,
			y: 0,
			z: 0,
		},
	};

	const currentEntity = entity ?? defaultEntity;

	const hasMP = currentEntity.maxMP !== 0;

	let hpProgress = Math.round((currentEntity.HP / currentEntity.maxHP) * 100);
	if (currentEntity.maxHP === 0) {
		hpProgress = 100;
	}

	const mpProgress = Math.round(
		(currentEntity.MP / currentEntity.maxMP) * 100,
	);

	const hpBarHeight = hasMP ? Math.round(props.height * 0.8) : props.height;
	const mpBarHeight = props.height - hpBarHeight;

	const opacity = props.visible && entity !== null ? 1 : 0;

	const hpColour = determineHPColour(targetType, hpProgress, aggressive);

	const colourTransitionDuration = props.colourTransitionDuration ?? 0;

	let title = `${currentEntity.name}`;

	if (currentEntity.maxHP > 0) {
		title =
			title +
			` ${((currentEntity.HP / currentEntity.maxHP) * 100).toPrecision(
				3,
			)}%`;
	}

	const hpBottomBorder = hasMP ? 0 : 2;

	let fontSize = BASE_FONT_SIZE;
	if (title.length > OVERFLOW_TITLE_LENGTH) {
		fontSize = (fontSize * OVERFLOW_TITLE_LENGTH) / title.length;
	}
	const transformOffset = Math.round(9 * fontSize);

	const parentStyle: React.CSSProperties = {
		position: "absolute",
		height: props.height,
		width: props.width,
		transform: `translate(${props.position[0]}px, ${props.position[1]}px)`,
		opacity: opacity,
	};

	return (
		<div className="parameters" style={parentStyle}>
			<Stack sx={{ width: "100%", color: "grey.500" }} spacing={0}>
				<div>
					<TextField
						focused={true}
						label={title}
						variant="outlined"
						style={{
							position: "absolute",
							height: hpBarHeight,
							zIndex: 1000,
							width: "100%",
						}}
						sx={{
							"& .MuiInputBase-root": {
								height: hpBarHeight,
								borderRadius: 0,
								fontSize: `${fontSize}rem`,
							},
							"& .MuiFormLabel-root": {
								textShadow:
									"-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black",
								color: "white !important",
								fontSize: `${fontSize}rem`,
								transform: `translate(14px, -${transformOffset}px) scale(0.75)`,
							},
							"& .MuiOutlinedInput-notchedOutline": {
								borderColor: "black !important",
								borderWidth: `2px 2px ${hpBottomBorder}px 2px !important`,
							},
						}}
					/>
					<Progress
						size="xl"
						animate={false}
						radius={0}
						value={hpProgress}
						color={hpColour.colour}
						styles={{
							root: {
								height: hpBarHeight,
								backgroundColor: "rgba(159, 159, 159, 0.538)",
							},
							bar: {
								"WebkitTransition": "none",
								"transition": `background-color ${colourTransitionDuration}ms linear`,
								"&:last-of-type": {
									transition: "none",
								},
							},
						}}
					/>
				</div>
				{hasMP ? (
					<div>
						<TextField
							focused={true}
							label={`${currentEntity.MP}/${currentEntity.maxMP}`}
							variant="outlined"
							style={{
								position: "absolute",
								height: mpBarHeight,
								zIndex: 1000,
							}}
							sx={{
								"& .MuiInputBase-root": {
									height: mpBarHeight,
									borderRadius: 0,
								},
								"& .MuiFormLabel-root": {
									textShadow:
										"-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black",
									color: "white !important",
								},
								"& .MuiOutlinedInput-notchedOutline": {
									borderColor: "black !important",
									borderWidth: "1px 2px 2px 2px !important",
								},
							}}
						/>
						<Progress
							size="xl"
							radius={0}
							value={mpProgress}
							color={MP_COLOUR}
							styles={{
								root: {
									height: mpBarHeight,
									backgroundColor:
										"rgba(159, 159, 159, 0.538)",
								},
								bar: {
									transition: "width 400ms ease-in-out",
								},
							}}
						/>
					</div>
				) : null}
			</Stack>
		</div>
	);
}
