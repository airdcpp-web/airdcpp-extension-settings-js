
const MockExtension = {
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
  verbose: jest.fn((/*a1, a2, a3, a4*/) => {
    //console.log(a1, a2, a3, a4);
  }),
  log: jest.fn((/*a1, a2, a3, a4*/) => {
    //console.log(a1, a2, a3, a4);
  }),
  info: jest.fn((/*a1, a2, a3, a4*/) => {
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
  version: MockExtension.configVersion,
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
};

module.exports = {
  MockExtension,
  MockFS,
  MockSettingFile,
  MockSettingValues,
  MockLogger,
};
