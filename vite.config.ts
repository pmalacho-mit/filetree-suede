import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    fs: {
      allow: [
        "./release",
        "./with-events-suede",
        "./svelte-snippet-renderer-suede",
        "./mixin-suede",
      ],
    },
    host: true,
  },
  plugins: [sveltekit()],
});
