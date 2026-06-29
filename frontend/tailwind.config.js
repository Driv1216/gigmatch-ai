/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101828",
        muted: "#667085",
        line: "#E4E7EC",
        brand: "#2563EB",
        accent: "#14B8A6",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(16, 24, 40, 0.08)",
      },
    },
  },
  plugins: [],
};
