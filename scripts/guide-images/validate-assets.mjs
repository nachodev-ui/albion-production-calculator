import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const imageDirectory = join(projectRoot, "public", "images", "guides");

const expected = new Map([
  ["rentabilidad-crafteo-16x9.png", [1600, 900]],
  ["rentabilidad-crafteo-4x3.png", [1200, 900]],
  ["rentabilidad-crafteo-1x1.png", [1000, 1000]],
  ["retorno-materiales-rrr-16x9.png", [1600, 900]],
  ["retorno-materiales-rrr-4x3.png", [1200, 900]],
  ["retorno-materiales-rrr-1x1.png", [1000, 1000]],
  ["black-market-caerleon-16x9.png", [1600, 900]],
  ["black-market-caerleon-4x3.png", [1200, 900]],
  ["black-market-caerleon-1x1.png", [1000, 1000]],
]);

for (const [filename, [expectedWidth, expectedHeight]] of expected) {
  const buffer = await readFile(join(imageDirectory, filename));
  const pngSignature = buffer.subarray(0, 8).toString("hex");
  if (pngSignature !== "89504e470d0a1a0a") {
    throw new Error(`${filename} no es un PNG válido.`);
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(
      `${filename} mide ${width}×${height}; se esperaba ${expectedWidth}×${expectedHeight}.`,
    );
  }

  if (width * height < 50000) {
    throw new Error(`${filename} no alcanza 50.000 píxeles.`);
  }

  console.log(`${filename}: ${width}×${height}`);
}

console.log(`Validated ${expected.size} guide images.`);
