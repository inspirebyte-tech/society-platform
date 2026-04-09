const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch all monorepo packages so Metro can resolve workspace imports
config.watchFolders = [monorepoRoot]

// Tell Metro where to look for node_modules (mobile first, then root)
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Pin React and React Native to mobile's own node_modules.
// Without this, Metro can pick up the root-hoisted React (19.2.x from packages/ui)
// alongside mobile's React (19.1.0) — two copies — causing the useState null crash.
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
}

module.exports = config
