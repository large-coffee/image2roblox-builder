module.exports = {
  content: ["./src/renderer/index.html", "./src/renderer/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#0f172a"
        },
        skyglass: {
          100: "#dbeafe",
          300: "#93c5fd",
          500: "#3b82f6"
        }
      }
    }
  },
  plugins: []
};
