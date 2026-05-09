import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function createNextConfig(phase) {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;
  const distDir = isDevServer ? ".next-dev" : ".next-build";

  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    distDir,
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
