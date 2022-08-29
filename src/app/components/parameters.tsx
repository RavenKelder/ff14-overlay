import React, { useEffect, useState } from "react";
import ProgressBar from "react-bootstrap/ProgressBar";
import { Channel } from "../ipc";

interface ParametersProps {
	height: number;
	width: number;
	position: [number, number];
	channel: Channel;
}

export interface Vec3 {
	x: number;
	y: number;
	z: number;
}

interface Entity {
	ID: string;
	name: string;
	HP: number;
	maxHP: number;
	MP: number;
	maxMP: number;
	position: Vec3;
	heading: number;
}

export default function Parameters(props: ParametersProps): JSX.Element {
	const [entity, setEntity] = useState<Entity>({
		ID: "",
		name: "",
		HP: 500,
		maxHP: 1000,
		MP: 7000,
		maxMP: 10000,
		position: {
			x: 0,
			y: 0,
			z: 0,
		},
		heading: 0,
	});

	useEffect(() => {
		window.electronAPI.ipcRendererOn(props.channel, (event, entity) => {
			setEntity(entity as Entity);
		});
	}, []);

	const hpBarHeight = Math.round(props.height * 0.8);
	const mpBarHeight = props.height - hpBarHeight;

	const parentStyle: React.CSSProperties = {
		position: "absolute",
		height: props.height,
		width: props.width,
		transform: `translate(${props.position[0]}px, ${props.position[1]}px)`,
	};

	const hpBarStyle: React.CSSProperties = {
		height: hpBarHeight,
		width: props.width,
		backgroundColor: "blue",
		position: "absolute",
	};
	const mpBarStyle: React.CSSProperties = {
		height: mpBarHeight,
		width: props.width,
		backgroundColor: "blueviolet",
		position: "absolute",
		top: hpBarHeight,
	};

	return (
		<div className="parameters" style={parentStyle}>
			<ProgressBar
				style={hpBarStyle}
				max={entity.maxHP}
				now={entity.HP}
			/>
			<ProgressBar
				style={mpBarStyle}
				max={entity.maxMP}
				now={entity.MP}
			/>
		</div>
	);
}
