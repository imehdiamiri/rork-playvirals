const { getDefaultConfig } = require("expo/metro-config");
const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");
require("./scripts/check-env.js");

const config = getDefaultConfig(__dirname);

module.exports = withRorkMetro(config);
