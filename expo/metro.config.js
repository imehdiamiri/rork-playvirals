const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");

// Pre-bundle public-env safety guard. Fails the Metro start / build if any AI
// secret has leaked into an EXPO_PUBLIC_* variable. Runs once on config load.
require("./scripts/check-env.js");

const config = getDefaultConfig(__dirname);

module.exports = withRorkMetro(config);
