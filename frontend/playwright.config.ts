import { defineConfig, devices } from "@playwright/test";

const backendPort = 8011;
const frontendPort = 3011;

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    trace: "on-first-retry"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: `sh -c 'rm -f ./e2e.db && DATABASE_URL=sqlite:///./e2e.db APP_ENV=test LISTING_REVIEW_MODE=auto RATE_LIMIT_ENABLED=false RESEND_API_KEY= SECRET_KEY=e2e-secret-key-123456789012345678901234 JWT_SECRET=e2e-jwt-secret-123456789012345678901234 uv run python -m alembic upgrade head && DATABASE_URL=sqlite:///./e2e.db APP_ENV=test LISTING_REVIEW_MODE=auto RATE_LIMIT_ENABLED=false RESEND_API_KEY= SECRET_KEY=e2e-secret-key-123456789012345678901234 JWT_SECRET=e2e-jwt-secret-123456789012345678901234 uv run python -m scripts.seed && DATABASE_URL=sqlite:///./e2e.db APP_ENV=test LISTING_REVIEW_MODE=auto RATE_LIMIT_ENABLED=false RESEND_API_KEY= SECRET_KEY=e2e-secret-key-123456789012345678901234 JWT_SECRET=e2e-jwt-secret-123456789012345678901234 uv run python -m uvicorn app.main:app --host 127.0.0.1 --port ${backendPort}'`,
      cwd: "../backend",
      url: `http://127.0.0.1:${backendPort}/health/live`,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `NEXT_PUBLIC_API_URL=http://127.0.0.1:${backendPort}/api/v1 INTERNAL_API_URL=http://127.0.0.1:${backendPort}/api/v1 pnpm dev --port ${frontendPort}`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: !process.env.CI
    }
  ]
});
