/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0b0f19",      // Premium Dark Slate
          card: "#151c2c",    // Card background
          border: "#202a40",  // Subtly lighter borders
          accent: "#22d3ee",  // Cyan neon highlight
          success: "#10b981", // Emerald
          warning: "#f59e0b", // Amber
          danger: "#ef4444"   // Soft red
        }
      },
      fontFamily: {
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 15px rgba(34, 211, 238, 0.15)"
      }
    },
  },
  plugins: [],
}
