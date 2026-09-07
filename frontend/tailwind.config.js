/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
      },
      colors: {
        // Tokens extraídos do protótipo Figma (tela 01.01 — Autenticação — Login)
        epi: {
          paper: "#F6F8F7",
          panel: "#0E2E1F",
          brand: "#17472E",
          ink: "#141C18",
          muted: "#616E66",
          border: "#D9E0DB",
          mist: "#D1E3D9",
          tint: "#BFD9C9",
          // Tokens extraídos das telas internas (09.05 — Cadastros — Setor): sidebar do app
          shell: "#093826",
          shellActive: "#17523B",
        },
      },
    },
  },
  plugins: [],
};
