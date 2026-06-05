// tailwind.config.cjs
/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                // Meglévő színek
                landingPage: '#E7E7E7',
                landingPageIcons: '#3F620F',
                darkLandingPageIcons: '#34500e',
                SignUpLeft: "#95B29B",
                garden: '#dee4d1',
                // Új színek amiket az új UI-ban használunk
                greenDark: '#1a2e0a',
                greenMid: '#6b7c5e',
                greenLight: '#f5f6f0',
                greenBorder: '#e8ede2',
                greenMuted: '#95B29B',
                greenChip: '#c8d4bc',
            },
            fontFamily: {
                playfair: ['"Playfair Display"', 'serif'],
                dm: ['"DM Sans"', 'sans-serif'],
            },
            animation: {
                'fade-up':   'fadeUp 0.7s ease both',
                'fade-up-2': 'fadeUp 0.7s 0.15s ease both',
                'fade-up-3': 'fadeUp 0.7s 0.30s ease both',
                'fade-up-4': 'fadeUp 0.7s 0.45s ease both',
                'loading-pulse': 'loadingPulse 1.2s ease infinite',
                'skeleton':  'skeletonPulse 1.5s ease-in-out infinite',
                'spin-slow': 'spin 0.9s linear infinite',
            },
            keyframes: {
                fadeUp: {
                    '0%':   { opacity: '0', transform: 'translateY(24px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                loadingPulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%':      { opacity: '0.4' },
                },
                skeletonPulse: {
                    '0%, 100%': { opacity: '1' },
                    '50%':      { opacity: '0.5' },
                },
            },
            boxShadow: {
                'green-sm': '0 2px 8px rgba(63,98,15,0.08)',
                'green-md': '0 8px 24px rgba(63,98,15,0.12)',
                'green-lg': '0 20px 48px rgba(63,98,15,0.14)',
                'green-btn': '0 6px 20px rgba(63,98,15,0.25)',
            },
            backgroundImage: {
                'page-pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%233F620F' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
            },
        },
    },
};