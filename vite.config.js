import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        articles: resolve(__dirname, "articles.html"),
        article: resolve(__dirname, "Blogpost01.html"),
        photography: resolve(__dirname, "photography.html"),
        projects: resolve(__dirname, "projects.html"),
        contact: resolve(__dirname, "contact.html"),
        privacypolicy: resolve(__dirname, "privacypolicy.html"),
        terms: resolve(__dirname, "terms&condition.html"),
        stories: resolve(__dirname, "stories.html")
      }
    }
  }
});