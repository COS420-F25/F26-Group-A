// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
// https://astro.build/config
export default defineConfig({
  integrations: [react()],

  // old mockup route
  redirects: { '/login': '/signin' },

  vite: {
    plugins: [tailwindcss()]
  }
});
