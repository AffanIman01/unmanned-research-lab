import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';

export default defineConfig({
  base:'./',
  plugins:[react()],
  resolve:{alias:{'@':fileURLToPath(new URL('.',import.meta.url))},dedupe:['three']},
  build:{outDir:'../dist/water-simulation',emptyOutDir:true,assetsDir:'assets',chunkSizeWarningLimit:1500},
});
