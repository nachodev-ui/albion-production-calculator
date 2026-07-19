import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const indexNow = JSON.parse(
  await readFile(join(projectRoot, "config", "indexnow.json"), "utf8"),
);
const currentSeo = JSON.parse(
  await readFile(
    join(projectRoot, "src", "app", "seo", "route-seo.json"),
    "utf8",
  ),
);

const artifactDirectory = resolve(
  process.env.INDEXNOW_ARTIFACT_DIRECTORY ??
    join(projectRoot, "artifacts", "indexnow"),
);
const summaryPath = join(artifactDirectory, "summary.json");
const dryRun =
  process.argv.includes("--dry-run") ||
  process.env.INDEXNOW_DRY_RUN === "true";
const previousConfigPath = process.env.INDEXNOW_PREVIOUS_CONFIG;

function collectCanonicalUrls(seoConfig) {
  const origin = new URL(seoConfig.site.origin);
  return Object.values(seoConfig.routes)
    .filter((route) => route.index === true)
    .map((route) => new URL(route.path, origin).href);
}

async function loadPreviousUrls() {
  if (!previousConfigPath) {
    return [];
  }

  try {
    const previousSeo = JSON.parse(
      await readFile(resolve(previousConfigPath), "utf8"),
    );
    return collectCanonicalUrls(previousSeo);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function verifyOwnership(keyLocation) {
  const response = await fetch(keyLocation, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `El archivo de propiedad IndexNow respondió HTTP ${response.status}.`,
    );
  }

  const publishedKey = (await response.text()).trim();
  if (publishedKey !== indexNow.key) {
    throw new Error("El archivo de propiedad publicado no contiene la clave esperada.");
  }
}

async function submitPayload(payload) {
  const retryDelays = [0, 2000, 5000, 10000];
  let lastError;

  for (const retryDelay of retryDelays) {
    if (retryDelay > 0) {
      await delay(retryDelay);
    }

    try {
      const response = await fetch(indexNow.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json; charset=utf-8",
          "User-Agent": "AlbionCalculator-IndexNow/1.0",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      });

      const responseBody = await response.text();
      if (response.status === 200 || response.status === 202) {
        return {
          status: response.status,
          responseBody: responseBody || null,
        };
      }

      const error = new Error(
        `IndexNow respondió HTTP ${response.status}${responseBody ? `: ${responseBody}` : ""}.`,
      );

      if ([400, 403, 422].includes(response.status)) {
        throw error;
      }

      lastError = error;
    } catch (error) {
      lastError = error;
      if (/HTTP (400|403|422)/.test(error.message)) {
        throw error;
      }
    }
  }

  throw lastError ?? new Error("IndexNow no respondió después de los reintentos.");
}

await mkdir(artifactDirectory, { recursive: true });

const currentUrls = collectCanonicalUrls(currentSeo);
const currentUrlSet = new Set(currentUrls);
const removedUrls = (await loadPreviousUrls()).filter(
  (url) => !currentUrlSet.has(url),
);
const urlList = [...new Set([...currentUrls, ...removedUrls])];
const origin = new URL(currentSeo.site.origin);
const keyLocation = new URL(indexNow.keyPath, origin).href;

if (origin.hostname !== indexNow.host) {
  throw new Error(
    `El origen SEO ${origin.hostname} no coincide con ${indexNow.host}.`,
  );
}

if (urlList.length === 0 || urlList.length > 10000) {
  throw new Error(
    `El lote IndexNow debe contener entre 1 y 10.000 URLs; contiene ${urlList.length}.`,
  );
}

for (const url of urlList) {
  if (new URL(url).hostname !== indexNow.host) {
    throw new Error(`La URL ${url} no pertenece a ${indexNow.host}.`);
  }
}

const payload = {
  host: indexNow.host,
  key: indexNow.key,
  keyLocation,
  urlList,
};

const summary = {
  generatedAt: new Date().toISOString(),
  dryRun,
  endpoint: indexNow.endpoint,
  host: indexNow.host,
  keyLocation,
  currentUrlCount: currentUrls.length,
  removedUrlCount: removedUrls.length,
  submittedUrlCount: urlList.length,
  urls: urlList,
  result: null,
};

try {
  if (dryRun) {
    summary.result = { status: "dry-run" };
  } else {
    await verifyOwnership(keyLocation);
    summary.result = await submitPayload(payload);
  }

  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(
    `IndexNow ${dryRun ? "dry-run prepared" : "submission accepted"}: ${urlList.length} URLs.`,
  );
} catch (error) {
  summary.result = {
    status: "error",
    message: error instanceof Error ? error.message : String(error),
  };
  await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  throw error;
}
