import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const outputDirectory = join(projectRoot, "public", "images", "guides");

const formats = [
  { suffix: "16x9", width: 1600, height: 900 },
  { suffix: "4x3", width: 1200, height: 900 },
  { suffix: "1x1", width: 1000, height: 1000 },
];

const iconUrl = (identifier) =>
  `https://render.albiononline.com/v1/item/${identifier}.png?size=217`;

const icons = {
  item: iconUrl("T6_MAIN_SWORD"),
  metal: iconUrl("T6_METALBAR"),
  leather: iconUrl("T6_LEATHER"),
};

const palette = {
  bg: "#17140f",
  surface: "#211d16",
  raised: "#2a251c",
  border: "#4a4031",
  borderStrong: "#6f5d3c",
  text: "#f5efe4",
  muted: "#c4b9a6",
  faint: "#8f8372",
  accent: "#d1ad4d",
  accentMuted: "rgba(209, 173, 77, 0.13)",
  positive: "#78d39b",
  positiveMuted: "rgba(120, 211, 155, 0.12)",
  warning: "#e0b66a",
  negative: "#ef8c84",
};

function formatSilver(value) {
  return new Intl.NumberFormat("es-CL").format(value);
}

function frame(content, format, scene) {
  const isSquare = format.suffix === "1x1";
  const isFourThree = format.suffix === "4x3";
  const compact = isSquare || isFourThree;
  const padding = isSquare ? 58 : isFourThree ? 58 : 66;

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  * { box-sizing: border-box; }
  html, body { width: 100%; height: 100%; margin: 0; }
  body {
    overflow: hidden;
    background:
      radial-gradient(circle at 18% 8%, rgba(209,173,77,.15), transparent 30%),
      radial-gradient(circle at 92% 88%, rgba(120,211,155,.08), transparent 28%),
      ${palette.bg};
    color: ${palette.text};
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  .canvas {
    position: relative;
    width: 100%;
    height: 100%;
    padding: ${padding}px;
    display: flex;
    flex-direction: column;
  }
  .canvas::after {
    content: "";
    position: absolute;
    inset: 18px;
    border: 1px solid rgba(209,173,77,.16);
    border-radius: 28px;
    pointer-events: none;
  }
  .topbar { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand-mark {
    width: 48px; height: 48px; border-radius: 14px;
    border: 1px solid ${palette.borderStrong};
    background: linear-gradient(145deg, ${palette.accentMuted}, ${palette.raised});
    display: grid; place-items: center; font-size: 25px; color: ${palette.accent};
    box-shadow: 0 14px 38px rgba(0,0,0,.28);
  }
  .brand-title { font-size: 20px; font-weight: 700; letter-spacing: -.02em; }
  .brand-subtitle { margin-top: 3px; font-size: 11px; color: ${palette.faint}; text-transform: uppercase; letter-spacing: .16em; font-weight: 700; }
  .badge {
    border: 1px solid ${palette.border};
    background: rgba(33,29,22,.78);
    border-radius: 999px;
    padding: 9px 14px;
    color: ${palette.muted};
    font-size: 12px;
    font-weight: 650;
  }
  .hero { margin-top: ${compact ? 34 : 40}px; display: flex; align-items: center; justify-content: space-between; gap: 34px; }
  .hero-copy { min-width: 0; }
  .eyebrow { color: ${palette.accent}; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .17em; }
  h1 { margin: 10px 0 0; font-family: Georgia, "Times New Roman", serif; font-size: ${isSquare ? 46 : isFourThree ? 48 : 52}px; line-height: 1.05; letter-spacing: -.035em; max-width: 880px; }
  .hero-description { margin: 14px 0 0; color: ${palette.muted}; font-size: ${compact ? 16 : 17}px; line-height: 1.55; max-width: 820px; }
  .item-chip {
    flex: 0 0 auto;
    min-width: ${isSquare ? 245 : 280}px;
    display: flex; align-items: center; gap: 14px;
    border: 1px solid ${palette.border};
    border-radius: 20px;
    background: rgba(42,37,28,.78);
    padding: 14px 18px 14px 14px;
    box-shadow: 0 18px 45px rgba(0,0,0,.24);
  }
  .item-chip img { width: 76px; height: 76px; object-fit: contain; }
  .item-name { font-size: 16px; font-weight: 750; }
  .item-meta { margin-top: 5px; color: ${palette.faint}; font-size: 12px; }
  .content { flex: 1; min-height: 0; margin-top: ${compact ? 30 : 36}px; }
  .panel {
    height: 100%;
    border: 1px solid ${palette.border};
    background: linear-gradient(155deg, rgba(42,37,28,.96), rgba(31,27,20,.96));
    border-radius: 24px;
    box-shadow: 0 28px 70px rgba(0,0,0,.25);
  }
  .footer { display: flex; justify-content: space-between; gap: 20px; margin-top: 18px; color: ${palette.faint}; font-size: 10px; letter-spacing: .03em; }
  .mono { font-variant-numeric: tabular-nums; }
  .positive { color: ${palette.positive}; }
  .accent { color: ${palette.accent}; }
  .muted { color: ${palette.muted}; }
  .faint { color: ${palette.faint}; }
  ${content.css}
</style>
</head>
<body>
  <main class="canvas ${scene} ${format.suffix}">
    <div class="topbar">
      <div class="brand">
        <div class="brand-mark">⚒</div>
        <div>
          <div class="brand-title">Albion Calculator</div>
          <div class="brand-subtitle">Costos, retorno y rentabilidad</div>
        </div>
      </div>
      <div class="badge">Ejemplo educativo · precios ilustrativos</div>
    </div>
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow">${content.eyebrow}</div>
        <h1>${content.title}</h1>
        <p class="hero-description">${content.description}</p>
      </div>
      <div class="item-chip">
        <img src="${icons.item}" alt="Ícono oficial de la espada ancha T6" />
        <div>
          <div class="item-name">Espada ancha del maestro</div>
          <div class="item-meta">Tier 6 · Calidad normal · Lote de 10</div>
        </div>
      </div>
    </section>
    <section class="content">${content.body}</section>
    <footer class="footer">
      <span>albioncalculator.app</span>
      <span>Íconos: servicio de renders de Albion Online · No son precios actuales</span>
    </footer>
  </main>
</body>
</html>`;
}

function profitabilityScene(format) {
  const compact = format.suffix !== "16x9";
  return frame(
    {
      eyebrow: "Guía de rentabilidad de crafteo",
      title: "Del costo bruto al beneficio real",
      description:
        "El resumen separa materiales, retorno, tarifa e ingreso neto para evitar márgenes inflados.",
      css: `
        .profit-grid { height: 100%; display: grid; grid-template-columns: ${compact ? "1fr" : "1.15fr .85fr"}; gap: 18px; }
        .summary { padding: ${compact ? 26 : 30}px; display: flex; flex-direction: column; }
        .summary-title { font-size: 13px; text-transform: uppercase; letter-spacing: .14em; color: ${palette.faint}; font-weight: 750; }
        .kpis { margin-top: 20px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
        .kpi { border: 1px solid ${palette.border}; border-radius: 17px; background: rgba(23,20,15,.55); padding: ${compact ? 18 : 20}px; }
        .kpi-label { font-size: 12px; color: ${palette.faint}; }
        .kpi-value { margin-top: 9px; font-size: ${compact ? 28 : 31}px; font-weight: 800; letter-spacing: -.025em; }
        .profit-callout { margin-top: 16px; border: 1px solid rgba(120,211,155,.34); background: ${palette.positiveMuted}; border-radius: 17px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center; gap: 18px; }
        .profit-callout strong { font-size: ${compact ? 28 : 34}px; }
        .breakdown { padding: ${compact ? 24 : 28}px; display: flex; flex-direction: column; }
        .row { display: flex; justify-content: space-between; gap: 20px; padding: 15px 0; border-bottom: 1px solid rgba(74,64,49,.72); font-size: 14px; }
        .row:last-of-type { border-bottom: 0; }
        .bar { margin-top: 10px; height: 8px; border-radius: 999px; background: rgba(143,131,114,.15); overflow: hidden; }
        .bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, ${palette.accent}, #f0cf77); }
        .annotation { margin-top: auto; border-left: 3px solid ${palette.accent}; background: ${palette.accentMuted}; border-radius: 0 14px 14px 0; padding: 14px 16px; color: ${palette.muted}; font-size: 13px; line-height: 1.45; }
        .${format.suffix}.profitability .profit-grid { ${format.suffix === "1x1" ? "grid-template-rows: 1.12fr .88fr;" : ""} }
        .${format.suffix}.profitability .breakdown { ${format.suffix === "1x1" ? "display:none;" : ""} }
      `,
      body: `
        <div class="profit-grid">
          <div class="panel summary">
            <div class="summary-title">Resumen del lote</div>
            <div class="kpis">
              <div class="kpi"><div class="kpi-label">Ingreso neto</div><div class="kpi-value mono">${formatSilver(176640)}</div></div>
              <div class="kpi"><div class="kpi-label">Costo efectivo</div><div class="kpi-value mono">${formatSilver(146112)}</div></div>
              <div class="kpi"><div class="kpi-label">Ahorro por retorno</div><div class="kpi-value mono accent">${formatSilver(52488)}</div></div>
              <div class="kpi"><div class="kpi-label">ROI de crafteo</div><div class="kpi-value mono positive">20,9%</div></div>
            </div>
            <div class="profit-callout">
              <div><div class="faint" style="font-size:12px">Beneficio esperado del lote</div><strong class="positive mono">+${formatSilver(30528)}</strong></div>
              <div class="badge">+${formatSilver(3053)} por unidad</div>
            </div>
          </div>
          <div class="panel breakdown">
            <div class="summary-title">Cómo se forma el costo</div>
            <div class="row"><span>Materiales brutos</span><strong class="mono">${formatSilver(194400)}</strong></div>
            <div class="bar"><span style="width:100%"></span></div>
            <div class="row"><span>Retorno valorizado</span><strong class="mono accent">−${formatSilver(52488)}</strong></div>
            <div class="row"><span>Tarifa del puesto</span><strong class="mono">+${formatSilver(4200)}</strong></div>
            <div class="row"><span>Costo económico final</span><strong class="mono">${formatSilver(146112)}</strong></div>
            <div class="annotation">El retorno reduce los materiales consumidos. No debe descontarse dos veces ni aplicarse al precio de venta.</div>
          </div>
        </div>
      `,
    },
    format,
    "profitability",
  );
}

function rrrScene(format) {
  const square = format.suffix === "1x1";
  return frame(
    {
      eyebrow: "Guía de retorno de materiales",
      title: "Materiales requeridos, devueltos y consumidos",
      description:
        "El RRR se aplica a cada recurso recuperable y convierte la devolución esperada en ahorro económico.",
      css: `
        .rrr-layout { height: 100%; display: grid; grid-template-columns: ${square ? "1fr" : ".72fr 1.28fr"}; gap: 18px; }
        .rate-card { padding: 28px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
        .rate-ring { width: ${square ? 176 : 196}px; height: ${square ? 176 : 196}px; border-radius: 50%; display: grid; place-items: center; background: conic-gradient(${palette.accent} 0 36.7%, rgba(143,131,114,.16) 36.7% 100%); position: relative; }
        .rate-ring::after { content:""; position:absolute; inset:15px; border-radius:50%; background:${palette.raised}; border:1px solid ${palette.border}; }
        .rate-value { position:relative; z-index:1; font-size:${square ? 38 : 42}px; font-weight:850; }
        .rate-label { position:relative; z-index:1; margin-top:4px; color:${palette.faint}; font-size:11px; text-transform:uppercase; letter-spacing:.12em; }
        .saving { margin-top:22px; color:${palette.muted}; font-size:13px; }
        .saving strong { display:block; margin-top:7px; color:${palette.positive}; font-size:29px; }
        .materials { padding: ${square ? 22 : 28}px; display:flex; flex-direction:column; }
        .material { display:grid; grid-template-columns: 74px 1fr; gap:18px; align-items:center; padding:17px; border:1px solid ${palette.border}; background:rgba(23,20,15,.48); border-radius:18px; }
        .material + .material { margin-top:14px; }
        .material img { width:70px; height:70px; object-fit:contain; }
        .material-name { font-size:15px; font-weight:750; }
        .material-stats { margin-top:12px; display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .material-stat { padding:10px; border-radius:12px; background:rgba(42,37,28,.8); }
        .material-stat span { display:block; color:${palette.faint}; font-size:10px; }
        .material-stat strong { display:block; margin-top:5px; font-size:17px; }
        .rrr-note { margin-top:auto; padding:14px 16px; border-radius:14px; border:1px solid rgba(209,173,77,.3); background:${palette.accentMuted}; color:${palette.muted}; font-size:12px; line-height:1.45; }
        .${format.suffix}.rrr .rrr-layout { ${square ? "grid-template-rows: .72fr 1.28fr;" : ""} }
        .${format.suffix}.rrr .rate-card { ${square ? "flex-direction:row; gap:34px; text-align:left; padding:20px 30px;" : ""} }
        .${format.suffix}.rrr .saving { ${square ? "margin-top:0;" : ""} }
      `,
      body: `
        <div class="rrr-layout">
          <div class="panel rate-card">
            <div class="rate-ring"><div><div class="rate-value mono">36,7%</div><div class="rate-label">RRR esperado</div></div></div>
            <div class="saving">Ahorro estimado del lote<strong class="mono">${formatSilver(52488)}</strong></div>
          </div>
          <div class="panel materials">
            <div class="material">
              <img src="${icons.metal}" alt="Ícono oficial de lingotes T6" />
              <div>
                <div class="material-name">Lingotes T6</div>
                <div class="material-stats">
                  <div class="material-stat"><span>Requeridos</span><strong class="mono">160</strong></div>
                  <div class="material-stat"><span>Devueltos</span><strong class="mono accent">58,7</strong></div>
                  <div class="material-stat"><span>Consumidos</span><strong class="mono">101,3</strong></div>
                </div>
              </div>
            </div>
            <div class="material">
              <img src="${icons.leather}" alt="Ícono oficial de cuero T6" />
              <div>
                <div class="material-name">Cuero T6</div>
                <div class="material-stats">
                  <div class="material-stat"><span>Requeridos</span><strong class="mono">80</strong></div>
                  <div class="material-stat"><span>Devueltos</span><strong class="mono accent">29,4</strong></div>
                  <div class="material-stat"><span>Consumidos</span><strong class="mono">50,6</strong></div>
                </div>
              </div>
            </div>
            <div class="rrr-note">Las cantidades devueltas son una expectativa económica para el lote. El juego puede redondear por tirada y los ingredientes no recuperables permanecen al costo completo.</div>
          </div>
        </div>
      `,
    },
    format,
    "rrr",
  );
}

function blackMarketScene(format) {
  const square = format.suffix === "1x1";
  return frame(
    {
      eyebrow: "Guía del Black Market de Caerleon",
      title: "Comprar o fabricar: compara antes de transportar",
      description:
        "La misma orden puede producir resultados distintos según el costo de compra, el RRR y el capital comprometido.",
      css: `
        .bm-layout { height:100%; display:grid; grid-template-columns:${square ? "1fr" : "repeat(2, 1fr)"}; gap:18px; }
        .strategy { padding:${square ? 20 : 28}px; display:flex; flex-direction:column; position:relative; }
        .strategy.winner { border-color:rgba(120,211,155,.55); background:linear-gradient(155deg, rgba(39,57,43,.82), rgba(31,27,20,.96)); }
        .strategy-tag { width:max-content; border:1px solid ${palette.border}; border-radius:999px; padding:7px 10px; color:${palette.faint}; font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.12em; }
        .strategy.winner .strategy-tag { border-color:rgba(120,211,155,.4); color:${palette.positive}; background:${palette.positiveMuted}; }
        .strategy h2 { margin:14px 0 0; font-family:Georgia,serif; font-size:${square ? 23 : 27}px; }
        .strategy-copy { margin-top:7px; color:${palette.muted}; font-size:12px; line-height:1.45; }
        .strategy-rows { margin-top:${square ? 12 : 20}px; }
        .strategy-row { display:flex; justify-content:space-between; gap:18px; padding:${square ? 9 : 12}px 0; border-bottom:1px solid rgba(74,64,49,.7); font-size:13px; }
        .strategy-row:last-child { border-bottom:0; }
        .strategy-result { margin-top:auto; padding:${square ? 13 : 17}px; border-radius:16px; background:rgba(23,20,15,.5); border:1px solid ${palette.border}; display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .strategy-result span { display:block; color:${palette.faint}; font-size:10px; }
        .strategy-result strong { display:block; margin-top:5px; font-size:${square ? 21 : 25}px; }
        .winner-ribbon { position:absolute; top:20px; right:20px; color:${palette.positive}; font-size:11px; font-weight:800; }
        .${format.suffix}.black-market .bm-layout { ${square ? "grid-template-rows:1fr 1fr;" : ""} }
      `,
      body: `
        <div class="bm-layout">
          <div class="panel strategy">
            <div class="strategy-tag">Estrategia A</div>
            <h2>Comprar y transportar</h2>
            <p class="strategy-copy">Compra el objeto terminado en una ciudad y véndelo a la orden de Caerleon.</p>
            <div class="strategy-rows">
              <div class="strategy-row"><span>Compra del lote</span><strong class="mono">${formatSilver(148000)}</strong></div>
              <div class="strategy-row"><span>Transporte y margen de riesgo</span><strong class="mono">${formatSilver(7000)}</strong></div>
              <div class="strategy-row"><span>Ingreso neto Black Market</span><strong class="mono">${formatSilver(176640)}</strong></div>
            </div>
            <div class="strategy-result"><div><span>Beneficio</span><strong class="mono">+${formatSilver(21640)}</strong></div><div><span>ROI</span><strong class="mono">14,0%</strong></div></div>
          </div>
          <div class="panel strategy winner">
            <div class="winner-ribbon">Mejor resultado del ejemplo</div>
            <div class="strategy-tag">Estrategia B</div>
            <h2>Fabricar con RRR</h2>
            <p class="strategy-copy">Compra materiales, recupera recursos y transporta el lote fabricado.</p>
            <div class="strategy-rows">
              <div class="strategy-row"><span>Costo real de fabricación</span><strong class="mono">${formatSilver(146112)}</strong></div>
              <div class="strategy-row"><span>Transporte y margen de riesgo</span><strong class="mono">${formatSilver(7000)}</strong></div>
              <div class="strategy-row"><span>Ingreso neto Black Market</span><strong class="mono">${formatSilver(176640)}</strong></div>
            </div>
            <div class="strategy-result"><div><span>Beneficio</span><strong class="mono positive">+${formatSilver(23528)}</strong></div><div><span>ROI</span><strong class="mono positive">15,4%</strong></div></div>
          </div>
        </div>
      `,
    },
    format,
    "black-market",
  );
}

const scenes = [
  { slug: "rentabilidad-crafteo", render: profitabilityScene },
  { slug: "retorno-materiales-rrr", render: rrrScene },
  { slug: "black-market-caerleon", render: blackMarketScene },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

try {
  for (const scene of scenes) {
    for (const format of formats) {
      const context = await browser.newContext({
        viewport: { width: format.width, height: format.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.setContent(scene.render(format), { waitUntil: "networkidle" });
      await page.waitForFunction(() =>
        [...document.images].every(
          (image) => image.complete && image.naturalWidth > 0,
        ),
      );
      const outputPath = join(
        outputDirectory,
        `${scene.slug}-${format.suffix}.png`,
      );
      await page.screenshot({
        path: outputPath,
        type: "png",
        animations: "disabled",
        caret: "hide",
      });
      console.log(`Generated ${outputPath}`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
