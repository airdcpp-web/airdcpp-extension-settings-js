
const MockExtension = {
  extensionName: 'airdcpp-test', 
  configFile: 'MOCK_CONFIG_FILE', 
  configVersion: 1, 
  definitions: [
    {
      key: 'mock_setting1',
      title: 'Mock setting 1 (has default)',
      default_value: true,
      type: 'boolean'
    }, {
      key: 'mock_setting2',
      title: 'Mock setting 2 (no default, has file value)',
      type: 'string'
    }, {
      key: 'mock_setting3',
      title: 'Mock setting 3 (has default, no changes)',
      type: 'number',
      default_value: 1,
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
  mock_setting2: 'mock value',
  mock_setting3: 1
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
