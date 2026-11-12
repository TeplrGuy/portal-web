module.exports = [{
  files: ['src/**/*.js', 'tests/integration/**/*.js', 'scripts/**/*.cjs', 'tests/delivery/**/*.cjs'],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'commonjs',
    globals: {
      __dirname: 'readonly',
      console: 'readonly',
      fetch: 'readonly',
      process: 'readonly',
      setTimeout: 'readonly',
      structuredClone: 'readonly'
    }
  },
  rules: {
    eqeqeq: 'error',
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-unused-vars': ['error', { args: 'none' }]
  }
}, {
  files: ['src/public/**/*.js'],
  languageOptions: {
    sourceType: 'script',
    globals: { document: 'readonly', FormData: 'readonly' }
  }
}];
