/** @type {import("next").NextConfig} */
const nextConfig = {
  // Standalone for Docker/Fly; Vercel uses its own output tracing.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
