import type { Config } from "tailwindcss";

export default {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1360px" },
    },
    extend: {
      fontFamily: {
        sans: ["Figtree", "Figtree Fallback", "system-ui", "sans-serif"],
        display: ["Fraunces", "Fraunces Fallback", "Georgia", "serif"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.6" }],
        lg: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.005em" }],
        xl: ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.01em" }],
        "2xl": ["2rem", { lineHeight: "1.15", letterSpacing: "-0.015em" }],
        // Display fluido: 40px no celular, 72px no desktop. Quanto maior, mais
        // negativo o tracking: é o que faz um título parecer desenhado.
        "3xl": ["clamp(2.5rem, 1.4rem + 4.6vw, 4.5rem)", { lineHeight: "1.02", letterSpacing: "-0.022em" }],
        "2xl-fluido": ["clamp(1.75rem, 1.2rem + 2vw, 2.5rem)", { lineHeight: "1.12", letterSpacing: "-0.018em" }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        cta: {
          DEFAULT: "hsl(var(--cta))",
          hover: "hsl(var(--cta-hover))",
          foreground: "hsl(var(--cta-foreground))",
        },
        tinta: {
          creme: "hsl(var(--tinta-creme))",
          salvia: "hsl(var(--tinta-salvia))",
          azulpo: "hsl(var(--tinta-azulpo))",
          pessego: "hsl(var(--tinta-pessego))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      boxShadow: {
        sutil: "var(--sombra-sutil)",
        baixa: "var(--sombra-baixa)",
        media: "var(--sombra-media)",
        alta: "var(--sombra-alta)",
        cta: "var(--sombra-cta), var(--brilho-interno)",
      },
      borderRadius: {
        destaque: "var(--raio-destaque)",
        xl: "calc(var(--radius) + 4px)",
        controle: "var(--raio-controle)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        suave: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      typography: {
        DEFAULT: {
          css: {
            "--tw-prose-body": "hsl(var(--foreground) / 0.88)",
            "--tw-prose-headings": "hsl(var(--foreground))",
            "--tw-prose-lead": "hsl(var(--muted-foreground))",
            "--tw-prose-links": "hsl(var(--primary))",
            "--tw-prose-bold": "hsl(var(--foreground))",
            "--tw-prose-counters": "hsl(var(--muted-foreground))",
            "--tw-prose-bullets": "hsl(var(--cta))",
            "--tw-prose-hr": "hsl(var(--border))",
            "--tw-prose-quotes": "hsl(var(--foreground))",
            "--tw-prose-quote-borders": "hsl(var(--cta))",
            "--tw-prose-captions": "hsl(var(--muted-foreground))",
            "--tw-prose-code": "hsl(var(--foreground))",
            "--tw-prose-th-borders": "hsl(var(--border))",
            "--tw-prose-td-borders": "hsl(var(--border))",
            maxWidth: "none",
            "h1, h2, h3": {
              fontFamily: "Fraunces, 'Fraunces Fallback', Georgia, serif",
              fontWeight: "600",
              letterSpacing: "-0.015em",
            },
            a: { textDecorationColor: "hsl(var(--cta) / 0.5)", textUnderlineOffset: "3px" },
          },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
