import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function createNextConfig(phase) {
  const isDevServer = phase === PHASE_DEVELOPMENT_SERVER;

  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    distDir: isDevServer ? ".next-dev" : ".next",
    typescript: {
      tsconfigPath: "tsconfig.next.json",
    },
  };
}
