import React from "react";

export default function Centred(props: {
	children: React.ReactNode;
	style?: React.CSSProperties;
}): JSX.Element {
	const parentOuterStyle: React.CSSProperties = {
		...props.style,
		display: "flex",
		flexDirection: "row",
	};
	const parentInnerStyle: React.CSSProperties = {
		display: "flex",
		flexDirection: "column",
	};

	const childStyle: React.CSSProperties = {
		flex: "1 1 auto",
	};
	return (
		<div className="centred" style={parentOuterStyle}>
			<div style={childStyle} />
			<div style={{ ...parentInnerStyle, flex: "0 0 auto" }}>
				<div style={childStyle} />
				{props.children}
				<div style={childStyle} />
			</div>
			<div style={childStyle} />
		</div>
	);
}
