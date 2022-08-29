import React from "react";

interface BarProps {
	max: number;
	min: number;
	now: number;
}

export default function Bar(props: BarProps): JSX.Element {
	const parentStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "row",
	};
	return <div style={parentStyle}></div>;
}
