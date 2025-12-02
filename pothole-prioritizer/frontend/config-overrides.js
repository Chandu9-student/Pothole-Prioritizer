const { override, addWebpackModuleRule } = require('customize-cra');

module.exports = override(
  // Disable TypeScript type checking for development
  (config) => {
    // Remove TypeScript type checking plugin
    config.plugins = config.plugins.filter(plugin => {
      return plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin';
    });
    
    return config;
  }
);
