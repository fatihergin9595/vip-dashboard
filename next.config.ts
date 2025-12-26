/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack prod'da external module hatası çıkarabildiği için kapatıyoruz
  experimental: {
    turbo: {
      // prod build'te turbo kullanma
      enabled: false,
    },
  },

  // Netlify / serverless tarafında pg gibi node modüllerini düzgün paketlesin diye
  outputFileTracing: true,
};

module.exports = nextConfig;