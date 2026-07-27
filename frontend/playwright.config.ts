import { defineConfig, devices } from "@playwright/test";

const backendPort = 8011;
const frontendPort = 3011;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `sh -c 'rm -f ./e2e.db && rm -rf /tmp/szp-e2e-uploads && export DATABASE_URL=sqlite:///./e2e.db APP_ENV=test LISTING_REVIEW_MODE=manual RATE_LIMIT_ENABLED=false PHONE_VERIFICATION_ENABLED=true ACCOUNT_CLOSURE_ENABLED=true ACCOUNT_CLOSURE_POLICY_APPROVED=true STORAGE_BACKEND=local LOCAL_STORAGE_PATH=/tmp/szp-e2e-uploads APP_URL=http://127.0.0.1:${frontendPort} CORS_ALLOWED_ORIGINS=http://127.0.0.1:${frontendPort} RESEND_API_KEY= SECRET_KEY=e2e-secret-key-123456789012345678901234 JWT_SECRET=e2e-jwt-secret-123456789012345678901234 && uv run python -m alembic upgrade head && uv run python -m scripts.seed && uv run python -m scripts.e2e_support seed && uv run python -m uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}'`,
      cwd: "../backend",
      url: `http://127.0.0.1:${backendPort}/health/live`,
      reuseExistingServer: false
    },
    {
      command: `sh -c 'rm -rf .next && NEXT_PUBLIC_API_URL=http://127.0.0.1:${backendPort}/api/v1 INTERNAL_API_URL=http://127.0.0.1:${backendPort}/api/v1 pnpm dev --port ${frontendPort}'`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false
    }
  ]
});
