const invariant = require('invariant');
const settingsManager = require('settings-manager');


const DefaultAPIHandler = (socket, extensionName) => ({
  postDefinitions: definitions => {
    return socket.post(`extensions/${extensionName}/settings/definitions`, definitions);
  },
  getSettings: () => {
    return socket.get(`extensions/${extensionName}/settings`);
  },
  updateSettings: settings => {
    return socket.patch(`extensions/${extensionName}/settings`, settings);
  },
  addSettingUpdateListener: callback => {
    return socket.addListener('extensions', 'extension_settings_updated', callback, extensionName);
  },
});

module.exports = function (
  socket, 
  extension
) {
  const { extensionName, configVersion, definitions } = extension;
  invariant(configVersion, 'Settings version should be a positive integer');
  invariant(Array.isArray(definitions), 'Setting definitions should be an array');

  const API = DefaultAPIHandler(socket, extensionName);
  
  const manager = settingsManager(extension, socket.logger, require('fs'), API);
  return manager;
};