const {
  AndroidConfig,
  withAndroidManifest,
  withGradleProperties,
} = require("@expo/config-plugins");

const REQUIRED_OVERRIDES = [
  "android:dataExtractionRules",
  "android:fullBackupContent",
];
const PACKAGING_PROPERTY = "android.packagingOptions.pickFirsts";
const DIDIT_METADATA_PATH = "META-INF/versions/9/OSGI-INF/MANIFEST.MF";

module.exports = function withAndroidBackupRulesOverride(config) {
  config = withAndroidManifest(config, (androidConfig) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      androidConfig.modResults,
    );
    const existing = (application.$["tools:replace"] ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    application.$["tools:replace"] = Array.from(
      new Set([...existing, ...REQUIRED_OVERRIDES]),
    ).join(",");

    return androidConfig;
  });

  return withGradleProperties(config, (androidConfig) => {
    const existing = androidConfig.modResults.find(
      (item) => item.type === "property" && item.key === PACKAGING_PROPERTY,
    );
    const values = (existing?.value ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const value = Array.from(new Set([...values, DIDIT_METADATA_PATH])).join(",");

    androidConfig.modResults = androidConfig.modResults.filter(
      (item) => !(item.type === "property" && item.key === PACKAGING_PROPERTY),
    );
    androidConfig.modResults.push({
      type: "property",
      key: PACKAGING_PROPERTY,
      value,
    });

    return androidConfig;
  });
};
