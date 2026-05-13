import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['chart.js', 'react-chartjs-2'],
          exports: ['exceljs', 'file-saver', 'html2canvas', 'jspdf', 'xlsx'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
