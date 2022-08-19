import React, { ReactNode, CSSProperties } from "react";

// Centred is a wrapper component that makes its children centred, by using
// flex boxes and empty divs to pad its child into the centre.
export default function Centred(props: {
	children: ReactNode;
	className?: string;
	style?: CSSProperties;
}): JSX.Element {
	/**
	 * CSS styles.
	 */

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
		<div
			className={`centered ${props.className ?? ""}`}
			style={parentOuterStyle}
		>
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
