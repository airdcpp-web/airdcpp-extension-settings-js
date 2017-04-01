# airdcpp-extension-settings-js [![Travis][build-badge]][build] [![npm package][npm-badge]][npm]

Settings management module for AirDC++ JavaScript extensions.

See the [example extensions](https://github.com/airdcpp-web/airdcpp-extension-js/tree/master/examples) and the [airdcpp-create-extension](https://github.com/airdcpp-web/airdcpp-create-extension) starter project for actual usage examples.

## Features

- Keeping the config data in sync with the API
- Loading and saving of settings on disk 
- Versioning and data migrations

## Usage

### Constructor

`SettingsManager(socket, options)`

**Arguments**

`socket` (object, required)

Instance of [airdcpp-apisocket](https://github.com/airdcpp-web/airdcpp-apisocket-js/) used by the extension.

`options` (object, required)

| Name | Type | Required | Description
| :--- | :--- | :--- | :--- |
| **extensionName** | string | ✓ | Name of the extension as it's registered in the application |
| **configFile** | string | ✓ | Full path of the config file that should be used for storing the settings |
| **configVersion** | number | ✓ | Config data version (positive integer). See the [`load`](#load) method for information about possible migration handling. |
| **definitions** | array[object] | ✓ | Setting definitions (see [AirDC++ Web API docs](http://docs.airdcpp.apiary.io/#reference/extension-entities/methods/post-setting-definitions) for more information)|



### `load`

`load(dataMigrationCallback)`

Loads possible previously saved settings and registers them with the API. 

**Arguments**

`dataMigrationCallback` (function, optional)

Function that will handle possible settings migration from older version formats. If no callback is specified, loaded settings will be used regardless of their version.

The function will be called only if the loaded settings version doesn't match with the current one. Errors should be thrown if settings could not be loaded.


**Usage example**

```js
// Settings migration callback
const migrate = (loadedConfigVersion, loadedData) => {
  if (loadedConfigVersion <= 1) {
    throw `Migration for settings version ${loadedConfigVersion} is not supported`;
  }

  if (loadedConfigVersion === 2) {
    // Perform the required conversions
    return Object.keys(loadedData).reduce((reduced, key) => {
      if (key === 'message_type' && loadedData[key] === 'private') {
        // The value 'private' has been renamed to 'private_chat'
        reduced[key] = 'private_chat';
      } else {
        reduced[key] = loadedData[key];
      }

      return reduced;
    }, {})
  }

  // Return as it is
  return loadedData;
};

// Load
await settings.load(migrate);
```

**Return value**

Promise that will return after all tasks have been completed.



### `getValue`

`getValue(key)`

Returns the current setting value.

**Usage example**

```js
const showSpam = settings.getValue('show_spam');
```



### `setValue`

`setValue(key, value)`

Update value of the setting.

**Return value**

Promise that will be resolved after the value has been updated in the API.

**Usage example**

```js
try {
  await settings.setValue('show_spam', false);
} catch (err) {
  socket.logger.error(`Failed to update settings value: ${err.message}`);
}
```

### `onValuesUpdated`

`onValuesUpdated(callback)`

Set listener for updated setting values.

The callback function will receive the updated settings value object (`settingKey` -> `newValue`) an argument (it won't contain unchanged values). The listener will also be fired during initial loading with all loaded settings.

**Usage example**

```js
settings.onValuesUpdated = updatedValues => {
	if (updatedValues.hasOwnProperty('search_interval')) {
		resetSearchInterval();
	}
};
```

[build-badge]: https://img.shields.io/travis/airdcpp-web/airdcpp-extension-settings-js/master.svg?style=flat-square
[build]: https://travis-ci.org/airdcpp-web/airdcpp-extension-settings-js

[npm-badge]: https://img.shields.io/npm/v/airdcpp-extension-settings.svg?style=flat-square
[npm]: https://www.npmjs.org/package/airdcpp-extension-settings
