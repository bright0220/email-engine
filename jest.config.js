module.exports = {
  preset                  : "ts-jest",
  testEnvironment         : "node",
  globalSetup             : "./__tests__/global_setup.ts",
  globalTeardown          : "./__tests__/global_teardown.ts",
  modulePathIgnorePatterns: ["__tests__/global_setup.ts", "__tests__/global_teardown.ts"],
};
