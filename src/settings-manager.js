const invariant = require('invariant');


// Remove settings that are using the default value
const filterDefaultValues = (settingValueMap, definitions) => {
  const nonDefaultValues = Object.keys(settingValueMap).reduce((reduced, key) => {
    const definition = definitions.find(def => def.key === key);
    if (!definition) {
      return reduced;
    }

    if (settingValueMap[key] === definition.default_value) {
      return reduced;
    }
    
    reduced[key] = settingValueMap[key];
    return reduced;
  }, {});

  return nonDefaultValues;
}

module.exports = function (
  extension,
  logger,
  fs,
  api
) {
  const { configFile, configVersion, definitions } = extension;
  
  let settings;
  let valuesUpdatedCallback;

  // Handler for API event for updated settings
  const onSettingsUpdated = (updatedValues) => {
    settings = {
      ...settings,
      ...updatedValues
    };

    if (valuesUpdatedCallback) {
      valuesUpdatedCallback(updatedValues);
    }

    logger.verbose(`Writing settings to ${configFile}...`);


    fs.writeFile(configFile, JSON.stringify({
      version: configVersion,
      settings: filterDefaultValues(settings, definitions),
    }), err => {
      if (err) {
        logger.error(`Failed to save settings to ${configFile}: ${err}`);
      }
    });
  };

  const hasDefinition = key => {
    return !!definitions.find(def => def.key === key);
  };

  // Get setting value by key
  const getValue = key => {
    invariant(hasDefinition(key), `Definition for key ${key} was not found`);
    return settings[key];
  };

  // Update a single setting value
  const setValue = (key, value) => {
    invariant(hasDefinition(key), `Definition for key ${key} was not found`);
    return api.updateSettings({
      [key]: value,
    })
  };

  // Initialize settings API
  const registerApi = async (settingsLoaded) => {
    // Send definitions
    await api.postDefinitions(definitions);

    if (settingsLoaded) {
      // Remove possible obsolete settings that were loaded (those would cause an error with the API)
      const filteredSettings = Object.keys(settings).reduce((reduced, key) => {
        if (hasDefinition(key)) {
          reduced[key] = settings[key];
        }

        return reduced;
      }, {});

      // Send the loaded settings
      await api.updateSettings(filteredSettings);
    }

    // App will apply possible default values, ensure that everything is in sync
    settings = await api.getSettings();

    // Listen for updated setting values
    api.addSettingUpdateListener(onSettingsUpdated);
  }

  const load = async (convertHandler) => {
    let settingsLoaded = false;

    // Attempt to load saved settings
    try {
      logger.verbose(`Loading settings from ${configFile}...`);

      const data = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (data && (!data.version || !data.settings)) {
        throw 'Invalid settings format';
      }

      if (data.version !== configVersion && convertHandler) {
        settings = convertHandler(data.version, data.settings);
        invariant(settings, `Migration handler should return the new settings`);
      } else {
        settings = data.settings;
      }

      settingsLoaded = true;
    } catch (err) {
      logger.verbose(`Failed to load settings: ${err}`);
    }

    try {
      await registerApi(settingsLoaded);
    } catch (err) {
      logger.error('Failed to register settings: ' + err.message)
    }

    if (valuesUpdatedCallback) {
      valuesUpdatedCallback(settings);
    }
  };

  return {
    getValue,
    setValue,
    load,
    set onValuesUpdated(handler) {
      valuesUpdatedCallback = handler;
    },
    getValues: () => ({
      ...settings
    })
  };
};