import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: [
      'src/features/admin/components/AdminPage.tsx',
      'src/features/presets/components/CloudPresetSync.tsx',
      'src/features/presets/components/SavedCalculationHistory.tsx',
      'src/features/craft-calculator/components/summary/SharedCalculationPage.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
