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
          bg: "var(--brand-bg)",      
          card: "var(--brand-card)",    
          border: "var(--brand-border)",  
          accent: "var(--brand-accent)",  
          success: "#10b981", 
          warning: "#f59e0b", 
          danger: "#ef4444"   
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
