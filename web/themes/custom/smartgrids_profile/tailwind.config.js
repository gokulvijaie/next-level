/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './templates/**/*.twig',
    './*.yml',
    '../../../modules/custom/smartgrids_store/**/*.php',
    '../../../modules/custom/smartgrids_store/**/*.twig',
  ],
  theme: {
    extend: {
      colors: {
        admin: {
          blue: '#003cc5',
          ink: '#1f2430',
          muted: '#6b7280',
          line: '#dfe5ef',
          layer: '#ffffff',
          canvas: '#f7f9fc',
        },
      },
      boxShadow: {
        admin: '0 10px 30px rgba(20, 45, 82, 0.10)',
      },
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
};
