import { spawn } from "node:child_process";

const maxAttempts = Number.parseInt(process.env.CF_DEPLOY_MAX_ATTEMPTS ?? "4", 10);
const baseDelayMs = Number.parseInt(process.env.CF_DEPLOY_BASE_DELAY_MS ?? "5000", 10);

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function runWranglerDeploy() {
  return new Promise((resolve) => {
    const child = spawn("npx", ["wrangler", "deploy"], {
      stdio: "inherit",
      shell: false,
      env: {
        ...process.env,
      },
    });

    child.on("exit", (code, signal) => {
      resolve({
        code: code ?? 1,
        signal: signal ?? null,
      });
    });
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  console.log(`\n[deploy] Cloudflare deploy attempt ${attempt}/${maxAttempts}`);
  const result = await runWranglerDeploy();

  if (result.code === 0) {
    console.log("[deploy] Cloudflare deploy succeeded.");
    process.exit(0);
  }

  if (attempt === maxAttempts) {
    console.error(
      `[deploy] Cloudflare deploy failed after ${maxAttempts} attempts. Last exit code: ${result.code}`,
    );
    process.exit(result.code || 1);
  }

  const delayMs = baseDelayMs * attempt;
  console.warn(
    `[deploy] Deploy failed with exit code ${result.code}. Retrying in ${Math.ceil(delayMs / 1000)}s...`,
  );
  await sleep(delayMs);
}
