module.exports = {
  // Basic formatting
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',

  // JSX specific
  jsxSingleQuote: true,

  // End of line
  endOfLine: 'lf',

  // Import organization
  importOrder: [
    '^react$',
    '^react-native$',
    '^@react-native',
    '^expo',
    '^[./]'
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,

  // File types to format
  overrides: [
    {
      files: ['*.md', '*.json'],
      options: {
        printWidth: 80
      }
    },
    {
      files: ['*.yml', '*.yaml'],
      options: {
        tabWidth: 2
      }
    }
  ]
};
