/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#0f172a',
                'primary-light': '#1e293b',
                accent: '#2563eb',
                'accent-hover': '#1d4ed8',
                'accent-glow': 'rgba(37, 99, 235, 0.2)',
                emerald: '#10b981',
                'bg-light': '#f8fafc',
                dark: '#1e293b',
                gray: '#64748b',
                white: '#ffffff',
                glass: 'rgba(255, 255, 255, 0.8)',
                border: '#e2e8f0',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
            },
            boxShadow: {
                'glow': '0 10px 15px -3px rgba(37, 99, 235, 0.2)',
                'card': '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                'card-hover': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                'hero': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                'modal': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            },
        },
    },
    plugins: [],
}
