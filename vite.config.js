import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    /* 5174, because the public site already owns 5173 and the two are usually
       running side by side. */
    port: 5174,
    strictPort: true,
  },
});
