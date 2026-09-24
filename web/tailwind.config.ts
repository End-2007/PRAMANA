import type { Config } from "tailwindcss";

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: v("canvas"),
        surface: v("surface"),
        ink: v("ink"),
        "ink-2": v("ink-2"),
        muted: v("muted"),
        line: v("line"),
        "line-2": v("line-2"),
        brand: {
          DEFAULT: v("brand"),
          50: v("brand-50"),
          100: v("brand-100"),
          200: v("brand-200"),
          600: v("brand-600"),
          700: v("brand-700"),
        },
        crit: { DEFAULT: v("crit"), 50: v("crit-50") },
        warn: { DEFAULT: v("warn"), 50: v("warn-50") },
        ok: { DEFAULT: v("ok"), 50: v("ok-50") },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgb(10 16 34 / 0.04), 0 8px 24px -12px rgb(10 16 34 / 0.10)",
        lift: "0 2px 4px rgb(10 16 34 / 0.05), 0 24px 48px -20px rgb(31 70 224 / 0.28)",
        glow: "0 0 0 1px rgb(var(--brand) / 0.25), 0 10px 30px -8px rgb(var(--brand) / 0.55)",
      },
      keyframes: {
        rise: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "none" } },
        pulseDot: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        scan: { from: { transform: "translateY(-100%)" }, to: { transform: "translateY(100%)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        rise: "rise .7s cubic-bezier(.2,.7,.2,1) both",
        pulseDot: "pulseDot 1.6s ease-in-out infinite",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
