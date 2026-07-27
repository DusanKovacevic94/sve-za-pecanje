/* eslint-disable react-hooks/rules-of-hooks -- Playwright fixture callbacks use a parameter named `use`. */
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";

import {
  test as base,
  expect,
  type APIRequestContext,
  type Page
} from "@playwright/test";

export type TestAccount = {
  email: string;
  username: string;
  password: string;
  displayName: string;
};

type E2EHelpers = {
  backendURL: string;
  accounts: {
    visitor: null;
    seller: TestAccount;
    buyer: TestAccount;
    administrator: TestAccount;
  };
  registerAndVerify: (page: Page, account: TestAccount) => Promise<void>;
  login: (page: Page, account: TestAccount) => Promise<void>;
  apiLogin: (
    request: APIRequestContext,
    account: Pick<TestAccount, "email" | "password">
  ) => Promise<void>;
  runBackgroundTask: (
    taskName:
      | "email_outbox"
      | "marketplace_metrics"
      | "search_discovery"
      | "notification_retention"
      | "data_exports"
  ) => void;
  seedSeoScenario: () => {
    category_id: string;
    category_slug: string;
    category_name: string;
    brand_id: string;
    brand_slug: string;
    brand_name: string;
    listing_slug: string;
  };
};

const backendDirectory = path.resolve(__dirname, "../../backend");
const backendURL = "http://127.0.0.1:8011";
const testEnvironment = {
  ...process.env,
  APP_ENV: "test",
  PHONE_VERIFICATION_ENABLED: "true",
  ACCOUNT_CLOSURE_ENABLED: "true",
  ACCOUNT_CLOSURE_POLICY_APPROVED: "true",
  STORAGE_BACKEND: "local",
  LOCAL_STORAGE_PATH: "/tmp/szp-e2e-uploads",
  DATABASE_URL: "sqlite:///./e2e.db",
  SECRET_KEY: "e2e-secret-key-123456789012345678901234",
  JWT_SECRET: "e2e-jwt-secret-123456789012345678901234",
  RESEND_API_KEY: ""
};

function backendHelper(...args: string[]): string {
  return execFileSync("uv", ["run", "python", "-m", "scripts.e2e_support", ...args], {
    cwd: backendDirectory,
    env: testEnvironment,
    encoding: "utf8"
  }).trim();
}

function buildAccount(role: "seller" | "buyer", workerIndex: number): TestAccount {
  const suffix = `${workerIndex}-${randomUUID().slice(0, 8)}`;
  return {
    email: `e2e-${role}-${suffix}@example.com`,
    username: `e2e_${role}_${suffix}`.replaceAll("-", "_"),
    password: "MarketplaceE2e123!",
    displayName: `E2E ${role} ${suffix}`
  };
}

export const test = base.extend<E2EHelpers>({
  backendURL,
  accounts: async ({}, use, testInfo) => {
    await use({
      visitor: null,
      seller: buildAccount("seller", testInfo.workerIndex),
      buyer: buildAccount("buyer", testInfo.workerIndex),
      administrator: {
        email: "e2e-admin@example.com",
        username: "e2e_admin",
        password: "E2eAdmin123!",
        displayName: "E2E administrator"
      }
    });
  },
  registerAndVerify: async ({}, use) => {
    await use(async (page, account) => {
      await page.goto("/registracija");
      await page.getByLabel("Email").fill(account.email);
      await page.getByLabel("Korisničko ime").fill(account.username);
      const displayName = page.getByLabel("Ime za prikaz");
      if (await displayName.count()) {
        await displayName.fill(account.displayName);
      }
      await page.getByLabel("Lozinka").fill(account.password);
      await page.getByLabel(/Prihvatam uslove korišćenja/).check();
      await page.getByRole("button", { name: "Registruj se" }).click();
      await expect(page.getByText("Nalog je kreiran. Proverite email za potvrdu.")).toBeVisible();

      const token = backendHelper("email-token", account.email);
      await page.goto(`/verifikacija-emaila?token=${encodeURIComponent(token)}`);
      await page.getByRole("button", { name: "Potvrdi email" }).click();
      await expect(page.getByText(/Email adresa je potvrđena/)).toBeVisible();
    });
  },
  login: async ({}, use) => {
    await use(async (page, account) => {
      await page.goto("/prijava");
      await page.getByLabel("Email").fill(account.email);
      await page.getByLabel("Lozinka").fill(account.password);
      await page.getByRole("button", { name: "Prijavi se" }).click();
      await expect(page).toHaveURL(/\/nalog(?:\?|$)/);
    });
  },
  apiLogin: async ({ backendURL: apiURL }, use) => {
    await use(async (request, account) => {
      const response = await request.post(`${apiURL}/api/v1/auth/login`, {
        data: { email: account.email, password: account.password }
      });
      expect(response.ok(), await response.text()).toBeTruthy();
    });
  },
  runBackgroundTask: async ({}, use) => {
    await use((taskName) => {
      backendHelper("run-task", taskName);
    });
  },
  seedSeoScenario: async ({}, use) => {
    await use(() => JSON.parse(backendHelper("seed-seo")));
  }
});

export { expect };
