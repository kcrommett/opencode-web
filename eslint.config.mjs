import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

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
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
      },
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { 
          "argsIgnorePattern": "^_",
          "varsIgnorePattern": "^_"
        }
      ],
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
