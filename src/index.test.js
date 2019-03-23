import SettingsManager from './index';


const Extension = {
  extensionName: 'airdcpp-test', 
  configFile: 'MOCK_CONFIG_FILE', 
  configVersion: 1, 
  definitions: [
    {
      key: 'mock_setting1',
      title: 'Mock setting 1',
      default_value: true,
      type: 'boolean'
    }, {
      key: 'mock_setting2',
      title: 'Mock setting 2',
      type: 'string'
    }
  ]
}

const MockLogger = {
  verbose: jest.fn((a1, a2, a3, a4) => {
    //console.log(a1, a2, a3, a4);
  }),
  log: jest.fn((a1, a2, a3, a4) => {
    //console.log(a1, a2, a3, a4);
  }),
  info: jest.fn((a1, a2, a3, a4) => {
    //console.info(a1, a2, a3, a4);
  }),
  warn: jest.fn((a1, a2, a3, a4) => {
    console.warn(a1, a2, a3, a4);
  }),
  error: jest.fn((a1, a2, a3, a4) => {
    console.error(a1, a2, a3, a4);
  }),
};


const MockSettingFile = {
  version: Extension.configVersion,
  settings: {
    mock_setting2: 'mock value'
  }
};

const MockSettingValues = {
  mock_setting1: true,
  mock_setting2: 'mock value'
};

const MockFS = {
  readFileSync: jest.fn(() => {
    return JSON.stringify(MockSettingFile, null, 2);
  })
}

const getAPIHandler = overrides => () => ({
  postDefinitions: jest.fn(),
  getSettings: jest.fn(() => MockSettingValues),
  updateSettings: jest.fn(),
  addSettingUpdateListener: jest.fn(),
  ...overrides
});

const getSocket = (/*addListener = jest.fn()*/) => ({
  logger: MockLogger,
  //addListener
});

describe('settings', () => {
  describe('load', () => {
    test('should load existing settings', async () => {
      // MOCKS
      const mockDefinitionsCallback = jest.fn();
      const mockGetValuesCallback = jest.fn(
        () => MockSettingValues
      );
      const mockUpdateSettingsCallback = jest.fn();

      const mockAddListenerCallback = jest.fn();
      const mockMigrateCallback = jest.fn();

      const APIHandler = () => ({
        postDefinitions: mockDefinitionsCallback,
        getSettings: mockGetValuesCallback,
        updateSettings: mockUpdateSettingsCallback,
        addSettingUpdateListener: mockAddListenerCallback,
      });

      const socket = getSocket();

      // RUN
      const settings = SettingsManager(socket, Extension, MockFS, APIHandler);
      await settings.load(mockMigrateCallback);

      // CHECKS
      expect(mockDefinitionsCallback).toHaveBeenCalledWith(Extension.definitions);
      expect(mockGetValuesCallback).toHaveBeenCalled();
      expect(mockAddListenerCallback).toHaveBeenCalled();
      expect(mockMigrateCallback).toHaveBeenCalledTimes(0);
      expect(mockUpdateSettingsCallback).toHaveBeenCalledWith(MockSettingFile.settings);
      expect(settings.getValues()).toEqual(MockSettingValues);
    });

    test('should init settings', async () => {
      // MOCKS
      const MockFSThrow = {
        readFileSync: jest.fn(() => {
          throw new Error('File does not exist');
        })
      }

      const APIHandler = getAPIHandler();
      
      const socket = getSocket();

      // RUN
      const settings = SettingsManager(socket, Extension, MockFSThrow, APIHandler);
      await settings.load();

      // CHECKS
      expect(settings.getValues()).toEqual(MockSettingValues);
    });
    
    test('should migrate existing settings', async () => {
      // MOCKS
      const newSettingValues = {
        mock_setting2: 'test updated'
      };

      const mockNewSettingsValues = {
        ...MockSettingValues,
        ...newSettingValues,
      };

      const migrateCallback = (loadedConfigVersion, loadedData) => ({
        ...loadedData,
        ...newSettingValues,
      });

      const mockUpdateSettingsCallback = jest.fn();

      const APIHandler = getAPIHandler({
        getSettings: () => mockNewSettingsValues,
        updateSettings: mockUpdateSettingsCallback,
      });

      const socket = getSocket();

      const UpdatedExtension = {
        ...Extension,
        configVersion: Extension.configVersion + 1,
      };

      // RUN
      const settings = SettingsManager(socket, UpdatedExtension, MockFS, APIHandler);
      await settings.load(migrateCallback);

      // CHECKS
      expect(mockUpdateSettingsCallback).toHaveBeenCalledWith({
        ...MockSettingFile.settings,
        ...newSettingValues,
      });
      expect(settings.getValues()).toEqual({
        ...MockSettingValues,
        ...newSettingValues,
      });
    });
  });

  describe('update', () => {
    test('should update setting value', async () => {
      // MOCKS
      let updateHandler;

      const updateCallback = jest.fn((settings) => {
        if (!!updateHandler) {
          updateHandler(settings);
        }
      });

      const addUpdateListenerCallback = jest.fn(callback => {
        updateHandler = callback;
      });

      const APIHandler = getAPIHandler({
        updateSettings: updateCallback,
        addSettingUpdateListener: addUpdateListenerCallback,
      });

      const socket = getSocket()

      const writeFileCallback = jest.fn();

      const MockFSWrite = {
        ...MockFS,
        writeFile: writeFileCallback
      }

      // RUN
      const settings = SettingsManager(socket, Extension, MockFSWrite, APIHandler);
      await settings.load();
      settings.setValue('mock_setting1', !MockSettingValues.mock_setting1);

      // CHECKS
      const newSettingFile = {
        ...MockSettingFile,
        settings: {
          mock_setting1: !MockSettingValues.mock_setting1,
          ...MockSettingFile.settings,
        }
      }

      expect(updateHandler).toBeDefined();
      expect(addUpdateListenerCallback).toHaveBeenCalledTimes(1);
      expect(updateCallback).toHaveBeenCalledTimes(2);
      expect(writeFileCallback).toHaveBeenCalledWith(Extension.configFile, JSON.stringify(newSettingFile), expect.anything());
      expect(settings.getValue('mock_setting1')).toEqual(!MockSettingValues.mock_setting1);
    });
  });
});
  