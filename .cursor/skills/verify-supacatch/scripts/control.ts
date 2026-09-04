/**
 * Verification harness for SupaCatch. Read SKILL.md before changing flags.
 * Isolated from the app; do not import @local/* packages.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL_ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const REPO_ROOT = resolve(SKILL_ROOT, "../..", "..");
const RUN_DIR = join(SKILL_ROOT, ".run");
const STATE_PATH = join(RUN_DIR, "state.json");
const BROWSER_URL_PATH = join(RUN_DIR, "browser-url.txt");
const BROWSER_PROFILE = join(RUN_DIR, "browser-profile");
const DASHBOARD_URL = "http://localhost:3000";
const INGEST_URL = "http://localhost:3001";
const DEMO_INGEST_KEY = "sck_demo_0123456789abcdef0123456789abcdef";

type LaunchState = {
  owned: boolean;
  pid?: number;
  startedAt: string;
};

function usage(): never {
  console.error(`Usage:
  control-supacatch doctor
  control-supacatch launch
  control-supacatch cleanup
  control-supacatch ingest submit --name <ErrorName> --message <ErrorMessage> [--key <ingestKey>] [--stack <stack>]
  control-supacatch browser goto --path <path>
  control-supacatch browser click --role <role> --name <accessibleName>
  control-supacatch browser fill --role <role> --name <accessibleName> --value <text>
  control-supacatch browser press --key <key>
  control-supacatch browser screenshot --path <file>
  control-supacatch browser snapshot --aria --path <file>
  control-supacatch browser close
`);
  process.exit(2);
}

function parseFlags(argv: string[]): Record<string, string | boolean> {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    i++;
  }
  return flags;
}

function readState(): LaunchState | null {
  if (!existsSync(STATE_PATH)) return null;
  return JSON.parse(readFileSync(STATE_PATH, "utf8")) as LaunchState;
}

function writeState(state: LaunchState) {
  mkdirSync(RUN_DIR, { recursive: true });
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

async function probeDashboard(): Promise<{ ok: boolean; status?: number; titleHint?: string }> {
  try {
    const response = await fetch(DASHBOARD_URL, { redirect: "manual" });
    const redirectedToSignIn =
      (response.status === 301 ||
        response.status === 302 ||
        response.status === 303 ||
        response.status === 307 ||
        response.status === 308) &&
      (response.headers.get("location") ?? "").includes("signin");
    const signIn = await fetch(`${DASHBOARD_URL}/signin`, { redirect: "manual" });
    const body = await signIn.text();
    const title = body.match(/<title>([^<]*)<\/title>/i)?.[1];
    return {
      ok: response.ok || redirectedToSignIn || signIn.ok,
      status: response.status,
      signInStatus: signIn.status,
      titleHint: title,
    };
  } catch {
    return { ok: false };
  }
}

async function probeIngest(): Promise<{ ok: boolean; status?: number }> {
  try {
    const response = await fetch(`${INGEST_URL}/v1/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "ProbeError",
        message: "doctor",
        timestamp: new Date().toISOString(),
      }),
    });
    return { ok: response.status === 401, status: response.status };
  } catch {
    return { ok: false };
  }
}

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function portOwnerHint(): string {
  return "Dashboard 3000 and ingest 3001 are exclusive. Do not start a second bun run dev. Do not kill an instance this run did not launch.";
}

async function doctor(): Promise<number> {
  const dashboard = await probeDashboard();
  const ingest = await probeIngest();
  const state = readState();
  const ownedAlive = state?.owned === true && state.pid !== undefined && pidAlive(state.pid);
  const report = {
    ok: dashboard.ok && ingest.ok,
    dashboardUrl: DASHBOARD_URL,
    ingestUrl: INGEST_URL,
    dashboard,
    ingest: {
      ...ingest,
      expectedUnauthorizedWithoutBearer: 401,
    },
    ownedByThisRun: ownedAlive,
    isolation: portOwnerHint(),
    auth: "Dashboard routes behind /signin require Auth0. Drive http://localhost:3000. Persist cookies in .run/browser-profile after one Auth0 login.",
  };
  console.log(JSON.stringify(report, null, 2));
  return report.ok ? 0 : 1;
}

async function waitForReady(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const dashboard = await probeDashboard();
    const ingest = await probeIngest();
    if (dashboard.ok && ingest.ok) return true;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1000));
  }
  return false;
}

async function launch(): Promise<number> {
  const dashboard = await probeDashboard();
  const ingest = await probeIngest();
  if (dashboard.ok || ingest.ok) {
    const existing = readState();
    if (existing?.owned && existing.pid !== undefined && pidAlive(existing.pid)) {
      console.log(
        JSON.stringify({
          attached: false,
          owned: true,
          pid: existing.pid,
          dashboardUrl: DASHBOARD_URL,
        }),
      );
      return 0;
    }
    writeState({ owned: false, startedAt: new Date().toISOString() });
    console.error(
      JSON.stringify({
        error: "ports-in-use",
        message:
          "3000 or 3001 already answers. Attach with doctor; do not launch a second alchemy. Cleanup will not kill this instance.",
        dashboard,
        ingest,
      }),
    );
    return 1;
  }

  mkdirSync(RUN_DIR, { recursive: true });
  const logPath = join(RUN_DIR, "dev.log");
  const log = Bun.file(logPath).writer();
  const child = spawn("bun", ["run", "dev"], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PATH: `${process.env.HOME}/.bun/bin:/usr/local/bin:${process.env.PATH ?? ""}`,
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.on("data", (chunk) => log.write(chunk));
  child.stderr?.on("data", (chunk) => log.write(chunk));
  child.unref();
  writeState({ owned: true, pid: child.pid, startedAt: new Date().toISOString() });

  const ready = await waitForReady(180_000);
  if (!ready) {
    console.error(JSON.stringify({ error: "not-ready", logPath, pid: child.pid }));
    return 1;
  }
  console.log(
    JSON.stringify({
      owned: true,
      pid: child.pid,
      dashboardUrl: DASHBOARD_URL,
      ingestUrl: INGEST_URL,
      logPath,
    }),
  );
  return 0;
}

function cleanup(): number {
  const state = readState();
  if (state?.owned && state.pid !== undefined && pidAlive(state.pid)) {
    try {
      process.kill(-state.pid, "SIGTERM");
    } catch {
      process.kill(state.pid, "SIGTERM");
    }
  }
  rmSync(BROWSER_PROFILE, { recursive: true, force: true });
  if (existsSync(BROWSER_URL_PATH)) rmSync(BROWSER_URL_PATH);
  if (existsSync(STATE_PATH)) rmSync(STATE_PATH);
  const logPath = join(RUN_DIR, "dev.log");
  if (existsSync(logPath)) rmSync(logPath);
  console.log(
    JSON.stringify({
      killedOwnedProcess: Boolean(state?.owned && state.pid),
      retained: "artifacts/ is never deleted",
    }),
  );
  return 0;
}

async function ingestSubmit(flags: Record<string, string | boolean>): Promise<number> {
  const name = flags.name;
  const message = flags.message;
  if (typeof name !== "string" || typeof message !== "string") usage();
  const key = typeof flags.key === "string" ? flags.key : DEMO_INGEST_KEY;
  const stack = typeof flags.stack === "string" ? flags.stack : undefined;
  const payload: Record<string, unknown> = {
    name,
    message,
    timestamp: new Date().toISOString(),
  };
  if (stack !== undefined) payload.stackTrace = stack;
  const response = await fetch(`${INGEST_URL}/v1/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });
  const bodyText = await response.text();
  let body: unknown = bodyText;
  try {
    body = JSON.parse(bodyText);
  } catch {
    // keep text
  }
  console.log(JSON.stringify({ status: response.status, body }));
  return response.status === 202 ? 0 : 1;
}

async function withPage<T>(fn: (page: import("playwright").Page) => Promise<T>): Promise<T> {
  const { chromium } = await import("playwright");
  mkdirSync(BROWSER_PROFILE, { recursive: true });
  const context = await chromium.launchPersistentContext(BROWSER_PROFILE, {
    headless: true,
    viewport: { width: 1280, height: 800 },
  });
  try {
    const page = context.pages()[0] ?? (await context.newPage());
    const remembered = existsSync(BROWSER_URL_PATH)
      ? readFileSync(BROWSER_URL_PATH, "utf8").trim()
      : "";
    if (remembered.startsWith("http") && page.url() !== remembered) {
      await page.goto(remembered, { waitUntil: "domcontentloaded" });
    }
    const result = await fn(page);
    if (page.url().startsWith("http")) {
      mkdirSync(RUN_DIR, { recursive: true });
      writeFileSync(BROWSER_URL_PATH, `${page.url()}\n`);
    }
    return result;
  } finally {
    await context.close();
  }
}

function artifactPath(pathFlag: string | boolean | undefined): string {
  if (typeof pathFlag !== "string") usage();
  return isAbsolute(pathFlag) ? pathFlag : resolve(SKILL_ROOT, pathFlag);
}

function locator(
  page: import("playwright").Page,
  flags: Record<string, string | boolean>,
): import("playwright").Locator {
  const role = flags.role;
  const name = flags.name;
  if (typeof role === "string" && typeof name === "string") {
    return page.getByRole(role as never, { name });
  }
  if (typeof flags.text === "string") return page.getByText(flags.text);
  if (typeof flags.label === "string") return page.getByLabel(flags.label);
  usage();
}

async function browserCommand(
  action: string,
  flags: Record<string, string | boolean>,
): Promise<number> {
  if (action === "close") {
    rmSync(BROWSER_PROFILE, { recursive: true, force: true });
    if (existsSync(BROWSER_URL_PATH)) rmSync(BROWSER_URL_PATH);
    console.log(
      JSON.stringify({ closed: true, note: "cleared verification browser profile only" }),
    );
    return 0;
  }

  await withPage(async (page) => {
    switch (action) {
      case "goto": {
        const path = flags.path;
        if (typeof path !== "string") usage();
        const url = path.startsWith("http")
          ? path
          : `${DASHBOARD_URL}${path.startsWith("/") ? path : `/${path}`}`;
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await page
          .locator("h1, [role='heading']")
          .first()
          .waitFor({ timeout: 20_000 })
          .catch(() => undefined);
        console.log(JSON.stringify({ url: page.url(), title: await page.title() }));
        return;
      }
      case "click": {
        const loc = locator(page, flags);
        await loc.waitFor({ state: "visible", timeout: 15_000 });
        const before = page.url();
        const waitNav = (ms: number) =>
          page
            .waitForURL((url) => url.href !== before, { timeout: ms })
            .then(() => true)
            .catch(() => false);
        await loc.click().catch(() => undefined);
        // React Aria `onPress` buttons often ignore Playwright mouse click in this profile.
        if (!(await waitNav(2_000))) {
          await loc.focus();
          await loc.press("Enter");
          await waitNav(15_000);
        }
        await page.waitForLoadState("domcontentloaded").catch(() => undefined);
        console.log(JSON.stringify({ url: page.url() }));
        return;
      }
      case "fill": {
        const value = flags.value;
        if (typeof value !== "string") usage();
        await locator(page, flags).fill(value);
        console.log(JSON.stringify({ filled: true }));
        return;
      }
      case "press": {
        const key = flags.key;
        if (typeof key !== "string") usage();
        await page.keyboard.press(key);
        console.log(JSON.stringify({ pressed: key }));
        return;
      }
      case "screenshot": {
        const out = artifactPath(flags.path);
        mkdirSync(dirname(out), { recursive: true });
        await page.screenshot({ path: out, fullPage: true });
        console.log(JSON.stringify({ path: out, url: page.url() }));
        return;
      }
      case "snapshot": {
        if (flags.aria !== true && flags.aria !== "true") usage();
        const out = artifactPath(flags.path);
        mkdirSync(dirname(out), { recursive: true });
        const snapshot = await page.locator("body").ariaSnapshot();
        writeFileSync(out, `${snapshot}\n`);
        console.log(JSON.stringify({ path: out, url: page.url() }));
        return;
      }
      default:
        usage();
    }
  });
  return 0;
}

const argv = process.argv.slice(2);
const command = argv[0];
if (command === undefined) usage();

let exitCode = 0;
if (command === "doctor") {
  exitCode = await doctor();
} else if (command === "launch") {
  exitCode = await launch();
} else if (command === "cleanup") {
  exitCode = cleanup();
} else if (command === "ingest" && argv[1] === "submit") {
  exitCode = await ingestSubmit(parseFlags(argv.slice(2)));
} else if (command === "browser") {
  const action = argv[1];
  if (action === undefined) usage();
  exitCode = await browserCommand(action, parseFlags(argv.slice(2)));
} else {
  usage();
}

process.exit(exitCode);
