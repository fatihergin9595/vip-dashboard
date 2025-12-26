/** @type {import('next').NextConfig} */
const nextConfig = {
  // Netlify server runtime için gerekli
  outputFileTracing: true,

  // pg gibi Node paketlerini server tarafında düzgün ele al
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
};

module.exports = nextConfig;