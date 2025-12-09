{ defineConfig } from 'vite'
react from '@vitejs/plugin-react'
tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
