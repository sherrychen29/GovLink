/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep @react-pdf and its deps unbundled on the server so the FontStore
  // singleton is shared between Font.register() and renderToBuffer().
  serverExternalPackages: [
    "@react-pdf/renderer",
    "@react-pdf/font",
    "@react-pdf/layout",
    "@react-pdf/fns",
    "@react-pdf/primitives",
    "@react-pdf/stylesheet",
    "@react-pdf/types",
  ],
};

export default nextConfig;
