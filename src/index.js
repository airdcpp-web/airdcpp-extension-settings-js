const fs = require('fs');
const invariant = require('invariant');


module.exports = function (socket, { extensionName, configFile, configVersion, definitions }) {
	invariant(configVersion, 'Settings version should be a positive integer');
	invariant(Array.isArray(definitions), 'Setting definitions should be an array');
	let settings;

	// Handler for API event for updated settings
	const onSettingsUpdated = (updatedValues) => {
		settings = {
			...settings,
			...updatedValues
		};

		socket.logger.verbose(`Writing settings to ${configFile}...`);


		fs.writeFile(configFile, JSON.stringify({
			version: configVersion,
			settings,
		}), err => {
			if (err) {
				socket.logger.error(`Failed to save settings to ${configFile}: ${err}`);
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
		return socket.patch(`extensions/${extensionName}/settings`, {
			[key]: value,
		})
	};

	// Initialize settings API4
	const registerApi = async (settingsLoaded) => {
		// Send definitions
		await socket.post(`extensions/${extensionName}/settings/definitions`, definitions);

		if (settingsLoaded) {
			// Remove possible obsolete settings that were loaded (those would cause an error with the API)
			const filteredSettings = Object.keys(settings).reduce((reduced, key) => {
				if (hasDefinition(key)) {
					reduced[key] = settings[key];
				}

				return reduced;
			}, {});

			// Send the loaded settings
			await socket.patch(`extensions/${extensionName}/settings`, filteredSettings);
		}

		// App will apply possible default values, ensure that everything is in sync
		settings = await socket.get(`extensions/${extensionName}/settings`);

		// Listen for updated setting values
		socket.addListener('extensions', 'extension_settings_updated', onSettingsUpdated, extensionName);
	}

	const load = async (convertHandler) => {
		let settingsLoaded = false;

		// Attempt to load saved settings
		try {
			socket.logger.verbose(`Loading settings from ${configFile}...`);

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
			socket.logger.verbose(`Failed to load settings: ${err}`);
		}

		try {
			await registerApi(settingsLoaded);
		} catch (err) {
			socket.logger.error('Failed to register settings: ' + err.message)
		}
	};

	return {
		getValue,
		setValue,
		load
	};
};