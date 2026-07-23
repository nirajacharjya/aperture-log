import { defineConfig } from "vite";
import { resolve } from "path";
import { readFileSync } from "fs";

const navbarHTML = readFileSync(
  resolve(__dirname, "public/components/navbar.html"),
  "utf-8"
);

export default defineConfig({
  plugins: [
    {
      name: "inject-navbar",
      transformIndexHtml(html) {
        return html.replace('<div id="navbar"></div>', navbarHTML);
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        about: resolve(__dirname, "about.html"),
        articles: resolve(__dirname, "articles.html"),
        article: resolve(__dirname, "Blogpost01.html"),
        Blogpost02: resolve(__dirname, "Blogpost02.html"),
        photography: resolve(__dirname, "photography.html"),
        projects: resolve(__dirname, "projects.html"),
        contact: resolve(__dirname, "contact.html"),
        privacypolicy: resolve(__dirname, "privacypolicy.html"),
        terms: resolve(__dirname, "terms&condition.html"),
        stories: resolve(__dirname, "stories.html"),
        storyView: resolve(__dirname, 'storyview.html'),
        storypost1: resolve(__dirname, "storypost1.html"),
        profile: resolve(__dirname, "profile.html")
      }
    }
  }
});