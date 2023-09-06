module.exports = {
  packagerConfig: {
    asar: true,
    ignore: [/\/src\/downloads\//, /\/src\/temp\//]
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@rabbitholesyndrome/electron-forge-maker-portable", //windows portable
      config: {},
    },
    {
      name: '@electron-forge/maker-deb', //linux
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm', //mac
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
