import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function createNextConfig(phase) {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    ...(isDevServer ? { distDir: ".next-dev" } : {}),
    experimental: {
      webpackBuildWorker: false,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: true,
      tsconfigPath: "tsconfig.next.json",
    },
  };
}
