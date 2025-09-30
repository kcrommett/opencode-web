const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      ".output/**",
      "build/**",
      "src/routeTree.gen.ts",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
];

export default eslintConfig;
