const { withInfoPlist, withEntitlementsPlist } = require('expo/config-plugins');

// Adds the Info.plist usage strings and the HealthKit entitlement needed by react-native-health.
// This only takes effect on a native (prebuild / dev client) build — it has no effect in Expo Go.
function withHealthKit(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.NSHealthShareUsageDescription =
      'cachorro reads your workouts (padel, walking, etc.) from Apple Health to show them in your activity history.';
    cfg.modResults.NSHealthUpdateUsageDescription = 'cachorro does not write any data to Apple Health.';
    return cfg;
  });

  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.healthkit'] = true;
    cfg.modResults['com.apple.developer.healthkit.access'] = [];
    return cfg;
  });

  return config;
}

module.exports = withHealthKit;
