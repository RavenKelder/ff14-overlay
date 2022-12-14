/* eslint-disable @typescript-eslint/no-var-requires */
const nodeExternals = require("webpack-node-externals");

module.exports = {
	/**
	 * This is the main entry point for your application, it's the first file
	 * that runs in the main process.
	 */
	entry: "./index.ts",
	// Put your normal webpack config below here
	module: {
		rules: require("./webpack.rules"),
	},
	resolve: {
		extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".json"],
	},

	externals: [nodeExternals()],
};
