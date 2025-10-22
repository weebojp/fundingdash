import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        positive: '#16a34a',
        negative: '#dc2626',
        neutral: '#94a3b8'
      }
    }
  },
  darkMode: 'class',
  plugins: []
};

export default config;
