import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/[YOUR_REPO_NAME]/', // Replace with your GitHub repo name later
});
