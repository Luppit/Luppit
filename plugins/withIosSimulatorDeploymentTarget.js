const { withPodfile } = require("@expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

module.exports = function withIosSimulatorDeploymentTarget(config) {
  return withPodfile(config, (iosConfig) => {
    iosConfig.modResults.contents = mergeContents({
      tag: "luppit-ios-simulator-deployment-target",
      src: iosConfig.modResults.contents,
      newSrc: `    minimum_target = Gem::Version.new(podfile_properties['ios.deploymentTarget'] || '15.1')
    simulator_key = 'IPHONEOS_DEPLOYMENT_TARGET[sdk=iphonesimulator*]'
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        deployment_target = build_config.build_settings[simulator_key] || build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        next unless deployment_target && Gem::Version.correct?(deployment_target)

        if Gem::Version.new(deployment_target) < minimum_target
          build_config.build_settings[simulator_key] = minimum_target.to_s
        end
      end
    end`,
      anchor: /^\s*post_install do \|installer\|\s*$/,
      offset: 1,
      comment: "#",
    }).contents;
    return iosConfig;
  });
};
