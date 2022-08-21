import { Vec2 } from "../maths";
import { app, screen } from "electron";

export async function getResolution(): Promise<Vec2> {
	await app.whenReady();

	const primary = screen.getPrimaryDisplay();
	return {
		x: primary.size.width,
		y: primary.size.height,
	};
}

export async function getScreenFactor(): Promise<number> {
	await app.whenReady();

	const primary = screen.getPrimaryDisplay();
	return primary.scaleFactor;
}
