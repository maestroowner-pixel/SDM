const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

// Breaks the Xcode dependency cycle:
//   EASClient → ExpoModulesCore → ReactCodegen → app([Expo] Configure project) → EASClient
//
// Root cause: ReactCodegen's "[CP-User] Generate Specs" build phase declares the
// whole `ios/` directory (`${PODS_ROOT}/..`) as an input. That directory contains
// ExpoModulesProvider.swift, which is produced by the app target's
// "[Expo] Configure project" phase → Xcode infers ReactCodegen depends on the app
// target, while the app implicitly depends on EASClient (via -lEASClient) → cycle.
//
// Fix: in the Podfile post_install, clear that phase's input_paths. The script
// reads its inputs at runtime, so removing the (over-broad) declared input only
// removes the spurious build-graph edge. Injected here so it survives prebuild.

const MARKER = 'ios-fix-codegen-cycle';
const HOOK = `
    # [${MARKER}] break EASClient <-> ReactCodegen dependency cycle
    installer.pods_project.targets.each do |__t|
      if __t.name == 'ReactCodegen'
        __t.build_phases.each do |__bp|
          if __bp.respond_to?(:name) && __bp.name && __bp.name.include?('Generate Specs')
            __bp.input_paths = []
          end
        end
      end
    end
`;

module.exports = function withIosFixCodegenCycle(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfile, 'utf8');
      if (!contents.includes(MARKER)) {
        // Insert right after the react_native_post_install(...) call.
        contents = contents.replace(
          /(:ccache_enabled => ccache_enabled\?\(podfile_properties\),\s*\n\s*\)\n)/,
          `$1${HOOK}`
        );
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
