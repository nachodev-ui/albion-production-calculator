import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const indexNowConfigPath = join(projectRoot, "config", "indexnow.json");
const seoConfigPath = join(projectRoot, "src", "app", "seo", "route-seo.json");

const indexNow = JSON.parse(await readFile(indexNowConfigPath, "utf8"));
const seo = JSON.parse(await readFile(seoConfigPath, "utf8"));

const keyPattern = /^[A-Za-z0-9-]{8,128}$/;
if (!keyPattern.test(indexNow.key ?? "")) {
  throw new Error(
    "La clave IndexNow debe tener entre 8 y 128 caracteres alfanuméricos o guiones.",
  );
}

const expectedKeyPath = `/${indexNow.key}.txt`;
if (indexNow.keyPath !== expectedKeyPath) {
  throw new Error(
    `La clave alojada en la raíz debe usar ${expectedKeyPath}, no ${indexNow.keyPath}.`,
  );
}

const endpoint = new URL(indexNow.endpoint);
if (endpoint.protocol !== "https:" || endpoint.hostname !== "api.indexnow.org") {
  throw new Error("El endpoint debe ser https://api.indexnow.org/indexnow.");
}

const origin = new URL(seo.site.origin);
if (origin.protocol !== "https:" || origin.hostname !== indexNow.host) {
  throw new Error(
    `El host IndexNow ${indexNow.host} no coincide con el origen SEO ${origin.origin}.`,
  );
}

const keyFilePath = join(projectRoot, "public", indexNow.keyPath.slice(1));
const keyFile = (await readFile(keyFilePath, "utf8")).trim();
if (keyFile !== indexNow.key) {
  throw new Error("El archivo público de propiedad no contiene la clave IndexNow exacta.");
}

const canonicalUrls = Object.values(seo.routes)
  .filter((route) => route.index === true)
  .map((route) => new URL(route.path, origin).href);

if (canonicalUrls.length === 0) {
  throw new Error("No existen rutas canónicas indexables para enviar a IndexNow.");
}

const uniqueUrls = new Set(canonicalUrls);
if (uniqueUrls.size !== canonicalUrls.length) {
  throw new Error("La configuración SEO contiene URLs canónicas indexables duplicadas.");
}

for (const url of canonicalUrls) {
  if (new URL(url).hostname !== indexNow.host) {
    throw new Error(`La URL ${url} no pertenece al host IndexNow configurado.`);
  }
}

console.log(
  `IndexNow configuration is valid: ${canonicalUrls.length} canonical URLs, key ${indexNow.keyPath}.`,
);
