/** @type {import('next').NextConfig} */
// Servidor Next com API de dados. Em produção roda pelo Dockerfile (output standalone).
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
};
