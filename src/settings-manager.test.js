const SettingsManager = require('./settings-manager');
const { MockLogger, MockFS, MockSettingFile, MockSettingValues, MockExtension } = require('./test-data/mocks');


const getMockAPI = overrides => ({
  postDefinitions: jest.fn(),
  getSettings: jest.fn(() => MockSettingValues),
  updateSettings: jest.fn(),
  addSettingUpdateListener: jest.fn(),
  ...overrides
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

      const api = {
        postDefinitions: mockDefinitionsCallback,
        getSettings: mockGetValuesCallback,
        updateSettings: mockUpdateSettingsCallback,
        addSettingUpdateListener: mockAddListenerCallback,
      };

      // RUN
      const settings = SettingsManager(MockExtension, MockLogger, MockFS, api);
      await settings.load(mockMigrateCallback);

      // CHECKS
      expect(mockDefinitionsCallback).toHaveBeenCalledWith(MockExtension.definitions);
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

      const api = getMockAPI();

      // RUN
      const settings = SettingsManager(MockExtension, MockLogger, MockFSThrow, api);
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

      const api = getMockAPI({
        getSettings: () => mockNewSettingsValues,
        updateSettings: mockUpdateSettingsCallback,
      });

      const UpdatedExtension = {
        ...MockExtension,
        configVersion: MockExtension.configVersion + 1,
      };

      // RUN
      const settings = SettingsManager(UpdatedExtension, MockLogger, MockFS, api);
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
      let updateListener;

      const updateValuesCallback = jest.fn((settings) => {
        if (!!updateListener) {
          // Simulate API listener event for the updated values
          updateListener(settings);
        }
      });

      const addUpdateListenerCallback = jest.fn(callback => {
        updateListener = callback;
      });

      const api = getMockAPI({
        updateSettings: updateValuesCallback,
        addSettingUpdateListener: addUpdateListenerCallback,
      });

      const writeFileCallback = jest.fn();

      const MockFSWrite = {
        ...MockFS,
        writeFile: writeFileCallback
      }

      // RUN
      const settings = SettingsManager(MockExtension, MockLogger, MockFSWrite, api);
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

      expect(updateListener).toBeDefined();
      expect(addUpdateListenerCallback).toHaveBeenCalledTimes(1);
      expect(updateValuesCallback).toHaveBeenCalledTimes(2);
      expect(writeFileCallback).toHaveBeenCalledWith(MockExtension.configFile, JSON.stringify(newSettingFile, null, 2), expect.anything());
      expect(settings.getValue('mock_setting1')).toEqual(!MockSettingValues.mock_setting1);
      expect(settings.getValue('mock_setting2')).toEqual(MockSettingFile.settings.mock_setting2);
      expect(settings.getValue('mock_setting3')).toEqual(MockSettingValues.mock_setting3);
    });
  });
});
  