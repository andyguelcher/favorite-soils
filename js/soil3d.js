/* ------------------------------------------------------------------
   Favorite Soils Report: the 3D soil monolith on each soil page.
   Nobody needs to edit this file. The model draws itself from
   soil.txt (horizons, depths, colours) and the DRoCTS+ table in
   page.md (texture, structure, rocks, HCl, pH). A soil with no
   horizons yet, or a browser without WebGL, gets nothing extra.
------------------------------------------------------------------- */
const IN = 2.54;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- field codes, for the details card ---------- */
const TEXTURES = {
  s: "sand", cos: "coarse sand", fs: "fine sand", vfs: "very fine sand",
  lcos: "loamy coarse sand", ls: "loamy sand", lfs: "loamy fine sand", lvfs: "loamy very fine sand",
  cosl: "coarse sandy loam", sl: "sandy loam", fsl: "fine sandy loam", vfsl: "very fine sandy loam",
  l: "loam", sil: "silt loam", si: "silt",
  scl: "sandy clay loam", cl: "clay loam", sicl: "silty clay loam",
  sc: "sandy clay", sic: "silty clay", c: "clay"
};
const SANDY = ["s", "cos", "fs", "vfs", "lcos", "ls", "lfs", "lvfs", "cosl", "sl", "fsl", "vfsl"];
const CLAYEY = ["scl", "cl", "sicl", "sc", "sic", "c"];
const STRUCTURES = {
  gr: "granular", sbk: "subangular blocky", abk: "angular blocky", pr: "prismatic",
  cpr: "columnar", pl: "platy", ma: "massive", sg: "single grain"
};
const HCL = {
  ne: "non-effervescent", vs: "very slightly effervescent", sl: "slightly effervescent",
  st: "strongly effervescent", ve: "violently effervescent", e: "effervescent"
};
const MASTERS = { O: "organic layer", A: "topsoil", E: "leached layer", B: "subsoil", C: "parent material", R: "bedrock" };
const SUFFIXES = {
  p: "plowed", g: "gleyed", d: "dense", t: "clay build-up", k: "carbonates", w: "weathered",
  b: "buried", h: "humus build-up", s: "iron and aluminium build-up", ss: "slickensides",
  y: "gypsum", z: "salts", n: "sodium", r: "soft bedrock", c: "concretions", o: "oxides"
};

// The last word in a cell that is a known code, so "2 m sbk" still reads as sbk.
function codeIn(text, dict) {
  const words = text.toLowerCase().split(/[^a-z]+/).filter((w) => w in dict);
  return words.length ? words[words.length - 1] : null;
}
function spell(raw, dict) {
  if (!raw) return "";
  const code = codeIn(raw, dict);
  if (!code) return raw + " (code not recognised)";
  return raw.toLowerCase() === code ? code + ", " + dict[code] : raw + " (" + dict[code] + ")";
}

// "2Cd" -> { lith: "2", master: "C", suffix: "d" }
function nameParts(name) {
  const m = name.trim().match(/^(\d*)([A-Z/&]*)([a-z]*)/);
  return { lith: m[1], master: m[2], suffix: m[3] };
}
function nameMeaning(name) {
  const { lith, master, suffix } = nameParts(name);
  const out = [];
  const letters = master.replace(/[^A-Z]/g, "").split("").filter((x) => MASTERS[x]);
  if (letters.length === 1) out.push(MASTERS[letters[0]]);
  else if (letters.length > 1) out.push("transition, " + letters.map((x) => MASTERS[x]).join(" to "));
  const sx = suffix === "ss" ? ["ss"] : suffix.split("");
  sx.forEach((x) => { if (SUFFIXES[x]) out.push(SUFFIXES[x]); });
  const nth = { 2: "second", 3: "third", 4: "fourth", 5: "fifth" }[lith];
  if (nth) out.push("in the " + nth + " parent material");
  return out.join(", ");
}

/* ---------- the DRoCTS+ table, read from the rendered page ---------- */
function readTable() {
  const rows = {};
  document.querySelectorAll("[data-body] tr[data-hz]").forEach((tr) => {
    const heads = [...tr.closest("table").querySelectorAll("thead th")].map((th) => th.textContent.toLowerCase());
    const col = (re) => {
      const k = heads.findIndex((h) => re.test(h));
      return k > -1 && tr.children[k] ? tr.children[k].textContent.trim() : "";
    };
    if (rows[tr.dataset.hz]) return;
    rows[tr.dataset.hz] = {
      rocks: col(/rock|coarse frag/), color: col(/colou?r/), texture: col(/textur/),
      structure: col(/struct/), hcl: col(/hcl|efferv/), ph: col(/^\s*ph/)
    };
  });
  return rows;
}

/* ---------- colour helpers ---------- */
const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
function rgbOf(css) {
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#6b635b";
  probe.fillStyle = css;
  probe.fillRect(0, 0, 1, 1);
  const d = probe.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const shade = (c, k) => (k >= 0 ? mix(c, [255, 255, 255], k) : mix(c, [0, 0, 0], -k));
const css = (c, a = 1) => "rgba(" + c.map((v) => Math.round(Math.max(0, Math.min(255, v)))).join(",") + "," + a + ")";
const cssVar = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

// Seeded random numbers, so each horizon looks the same on every visit.
function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- painting one horizon face ---------- */
// s is pixels per centimetre. Everything below is measured in cm and scaled.
// plan = true paints the face seen from above or below instead of from the side.
function paintFace(hz, row, wcm, hcm, s, below, plan) {
  const cv = document.createElement("canvas");
  cv.width = Math.max(8, Math.round(wcm * s));
  cv.height = Math.max(8, Math.round(hcm * s));
  const w = cv.width, h = cv.height, ctx = cv.getContext("2d");
  const r = rng(hz.name + hz.top + hz.munsell + (plan ? "plan" : ""));
  const parts = nameParts(hz.name);
  let base = rgbOf(hz.color);

  if (!row) {
    ctx.fillStyle = css(base);
    ctx.fillRect(0, 0, w, h);
    return cv;
  }

  const has = (x) => parts.suffix.includes(x);
  if (has("g")) {
    const grey = (base[0] + base[1] + base[2]) / 3;
    base = mix(base, [grey, grey, grey * 1.02], 0.45);
  }
  if (has("d")) base = shade(base, -0.08);
  ctx.fillStyle = css(base);
  ctx.fillRect(0, 0, w, h);

  const texture = codeIn(row.texture, TEXTURES);
  let structure = codeIn(row.structure, STRUCTURES) || "ma";
  // From above, prisms show as polygonal tops and plates show their flat faces.
  const prismTops = plan && (structure === "pr" || structure === "cpr");
  if (prismTops) structure = "abk";
  if (plan && structure === "pl") structure = "ma";
  const grain = SANDY.includes(texture) ? "sandy" : CLAYEY.includes(texture) ? "clayey" : "loamy";
  const crack = has("d") ? 0.6 : 1;

  // Soft blotches: clay looks smooth and dense, so it gets broad, quiet variation.
  const blotches = grain === "clayey" ? 0.012 : 0.006;
  for (let i = 0, n = Math.round(wcm * hcm * blotches); i < n; i++) {
    const x = r() * w, y = r() * h, rad = (3 + r() * 6) * s;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, css(shade(base, (r() - 0.5) * 0.14), 0.5));
    g.addColorStop(1, css(base, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  // Structure: the shape of the peds and the cracks between them.
  const crackColor = css(shade(base, -0.55), 0.75);
  const lightEdge = css(shade(base, 0.22), 0.35);
  function wobblyLine(points, width, jitter) {
    ctx.beginPath();
    points.forEach(([x, y], i) => {
      const jx = (r() - 0.5) * jitter, jy = (r() - 0.5) * jitter;
      if (i === 0) ctx.moveTo(x + jx, y + jy); else ctx.lineTo(x + jx, y + jy);
    });
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function split(a, b, steps) {
    const pts = [];
    for (let i = 0; i <= steps; i++) pts.push([a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps]);
    return pts;
  }

  if (structure === "sbk" || structure === "abk") {
    const ped = (prismTops ? 7 : structure === "sbk" ? 3.6 : 4.4) * s, jit = structure === "sbk" ? 0.32 : 0.18;
    const cols = Math.ceil(w / ped) + 2, rows = Math.ceil(h / ped) + 2, grid = [];
    for (let j = 0; j < rows; j++) {
      grid.push([]);
      for (let i = 0; i < cols; i++) {
        grid[j].push([(i - 0.5 + (r() - 0.5) * jit * 2) * ped, (j - 0.5 + (r() - 0.5) * jit * 2) * ped * 0.85]);
      }
    }
    ctx.lineJoin = structure === "sbk" ? "round" : "miter";
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const q = [grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]];
        ctx.beginPath();
        q.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fillStyle = css(shade(base, (r() - 0.5) * 0.12));
        ctx.fill();
      }
    }
    const steps = structure === "sbk" ? 4 : 2, wob = (structure === "sbk" ? 0.35 : 0.15) * s;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        if (i < cols - 1 && r() > 0.08) {
          ctx.strokeStyle = crackColor; wobblyLine(split(grid[j][i], grid[j][i + 1], steps), Math.max(1, 0.16 * s * crack), wob);
        }
        if (j < rows - 1 && r() > 0.08) {
          ctx.strokeStyle = crackColor; wobblyLine(split(grid[j][i], grid[j + 1][i], steps), Math.max(1, 0.16 * s * crack), wob);
          ctx.strokeStyle = lightEdge; wobblyLine(split(grid[j][i], grid[j + 1][i], steps).map(([x, y]) => [x + 1.2, y]), 1, 0);
        }
      }
    }
  } else if (structure === "pr" || structure === "cpr") {
    const width = 7 * s;
    let x = (r() - 0.5) * width;
    const edges = [];
    while (x < w + width) { edges.push(x); x += width * (0.7 + r() * 0.6); }
    edges.forEach((ex, k) => {
      if (k < edges.length - 1) {
        ctx.fillStyle = css(shade(base, (r() - 0.5) * 0.12));
        ctx.fillRect(ex, 0, edges[k + 1] - ex, h);
      }
    });
    ctx.strokeStyle = crackColor;
    edges.forEach((ex) => {
      const pts = [];
      for (let y = 0; y <= h + s; y += 1.5 * s) pts.push([ex + Math.sin(y / (9 * s) + ex) * 0.5 * s, y]);
      wobblyLine(pts, Math.max(1.2, 0.28 * s * crack), 0.25 * s);
    });
    // Occasional cross-breaks inside each prism.
    edges.forEach((ex, k) => {
      if (k >= edges.length - 1) return;
      for (let y = (8 + r() * 10) * s; y < h; y += (10 + r() * 12) * s) {
        ctx.strokeStyle = crackColor;
        wobblyLine(split([ex, y], [edges[k + 1], y + (r() - 0.5) * 2 * s], 3), Math.max(1, 0.14 * s * crack), 0.3 * s);
      }
    });
    if (structure === "cpr") {
      edges.forEach((ex, k) => {
        if (k >= edges.length - 1) return;
        ctx.fillStyle = css(shade(base, 0.12), 0.5);
        ctx.beginPath();
        ctx.ellipse((ex + edges[k + 1]) / 2, 1.2 * s, (edges[k + 1] - ex) / 2.3, 1.2 * s, 0, Math.PI, 0);
        ctx.fill();
      });
    }
  } else if (structure === "gr") {
    ctx.fillStyle = css(shade(base, -0.3), 0.6);
    ctx.fillRect(0, 0, w, h);
    const n = Math.round((wcm * hcm) / (Math.PI * 0.42 * 0.42) * 0.9);
    for (let i = 0; i < n; i++) {
      const x = r() * w, y = r() * h, rad = (0.22 + r() * 0.4) * s, c = shade(base, (r() - 0.5) * 0.2);
      ctx.fillStyle = css(c);
      ctx.beginPath(); ctx.ellipse(x, y, rad, rad * (0.75 + r() * 0.25), r() * 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = css(shade(c, 0.2), 0.5);
      ctx.beginPath(); ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  } else if (structure === "pl") {
    ctx.strokeStyle = crackColor;
    for (let y = r() * s; y < h; y += (0.9 + r() * 0.8) * s) {
      let x = -r() * 6 * s;
      while (x < w) {
        const len = (4 + r() * 8) * s;
        wobblyLine(split([x, y], [x + len, y + (r() - 0.5) * 0.6 * s], 4), Math.max(1, 0.1 * s * crack), 0.15 * s);
        x += len + (0.8 + r() * 2) * s;
      }
    }
  }

  // Texture: sand glints as fine speckle; clay stays quiet.
  const speck = { sandy: [0.16, 0.26], loamy: [0.06, 0.16], clayey: [0.015, 0.08] }[grain];
  const dot = Math.max(1, Math.round(0.12 * s));
  for (let i = 0, n = Math.round(w * h * speck[0] / (dot * dot)); i < n; i++) {
    ctx.fillStyle = css(shade(base, (r() - 0.4) * speck[1] * 2), 0.6);
    ctx.fillRect(r() * w, r() * h, dot, dot);
  }

  // A densified layer gets fine flattened laminae.
  if (has("d") && !plan) {
    ctx.strokeStyle = css(shade(base, -0.4), 0.18);
    for (let y = r() * s; y < h; y += (0.5 + r() * 0.5) * s) {
      wobblyLine(split([0, y], [w, y + (r() - 0.5) * s], 8), Math.max(1, 0.06 * s), 0.12 * s);
    }
  }

  // Gleyed: grey with rusty redox mottles and paler depletions.
  if (has("g")) {
    const rust = rgbOf(cssVar("--rust", "#9a4a22"));
    for (let i = 0, n = Math.round((wcm * hcm) / 55); i < n; i++) {
      const x = r() * w, y = r() * h, depletion = r() < 0.25;
      const c = depletion ? shade(base, 0.3) : mix(rust, [196, 116, 48], r() * 0.6);
      for (let k = 0; k < 3; k++) {
        const bx = x + (r() - 0.5) * 1.5 * s, by = y + (r() - 0.5) * 1.5 * s, rad = (0.5 + r() * 1.6) * s;
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, rad);
        g.addColorStop(0, css(c, depletion ? 0.35 : 0.7));
        g.addColorStop(0.6, css(c, depletion ? 0.18 : 0.35));
        g.addColorStop(1, css(c, 0));
        ctx.fillStyle = g;
        ctx.fillRect(bx - rad, by - rad, rad * 2, rad * 2);
      }
    }
  }

  // A horizons: fine root threads, wandering down from the top. From above, cut root ends.
  if (parts.master.startsWith("A") && plan) {
    for (let i = 0, n = Math.round(wcm * hcm / 6); i < n; i++) {
      ctx.fillStyle = css([214, 196, 158], 0.35 + r() * 0.35);
      ctx.beginPath(); ctx.arc(r() * w, r() * h, Math.max(0.7, (0.05 + r() * 0.1) * s), 0, Math.PI * 2); ctx.fill();
    }
  } else if (parts.master.startsWith("A")) {
    const root = [214, 196, 158];
    for (let i = 0, n = Math.round(wcm / 2.4); i < n; i++) {
      let x = r() * w, y = r() * h * 0.25, a = Math.PI / 2 + (r() - 0.5) * 0.6;
      const len = (0.4 + r() * 0.6) * h;
      ctx.strokeStyle = css(root, 0.35 + r() * 0.3);
      ctx.lineWidth = Math.max(0.7, (0.05 + r() * 0.08) * s);
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let d = 0; d < len; d += 0.8 * s) {
        a += (r() - 0.5) * 0.5;
        a = Math.max(0.35, Math.min(Math.PI - 0.35, a));
        x += Math.cos(a) * 0.8 * s; y += Math.sin(a) * 0.8 * s;
        ctx.lineTo(x, y);
        if (r() < 0.05) {
          const bx = x, by = y, ba = a + (r() < 0.5 ? -0.8 : 0.8);
          ctx.moveTo(bx + Math.cos(ba) * 2 * s, by + Math.sin(ba) * 2 * s);
          ctx.lineTo(bx, by);
        }
      }
      ctx.stroke();
    }
  }

  // Rocks: scatter about that share of the face with small pebbles.
  const pct = Math.min(60, parseFloat((row.rocks.match(/\d+(\.\d+)?/) || ["0"])[0]));
  const stones = [[128, 122, 112], [104, 97, 87], [146, 134, 112], [86, 82, 77], [120, 102, 82]];
  for (let i = 0, n = Math.round((pct / 100) * (wcm * hcm) / 2.4); i < n; i++) {
    const x = r() * w, y = r() * h, rx = (0.45 + r() * 1.1) * s, ry = rx * (0.55 + r() * 0.4), rot = r() * Math.PI;
    const c = stones[Math.floor(r() * stones.length)];
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath(); ctx.ellipse(x + 0.12 * s, y + 0.15 * s, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.4, 0, x, y, rx);
    g.addColorStop(0, css(shade(c, 0.14)));
    g.addColorStop(1, css(shade(c, -0.15)));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fill();
  }

  // The lower boundary: sharp under a plow layer, a soft blend otherwise.
  if (plan) {
    // no boundary seen from above
  } else if (has("p")) {
    ctx.fillStyle = css(shade(base, -0.4));
    ctx.fillRect(0, h - Math.max(2, 0.3 * s), w, Math.max(2, 0.3 * s));
    ctx.strokeStyle = css(shade(base, -0.3), 0.35);
    for (let y = h - 1.6 * s; y < h - 0.3 * s; y += 0.35 * s) {
      wobblyLine(split([0, y], [w, y], 10), Math.max(1, 0.07 * s), 0.08 * s);
    }
  } else if (below) {
    const band = Math.min(1.8 * s, h * 0.3), next = rgbOf(below.color);
    for (let x = 0; x < w; x += 2) {
      const top = h - band * (0.6 + 0.4 * Math.sin(x / (5 * s) + r() * 0.3));
      const g = ctx.createLinearGradient(0, top, 0, h);
      g.addColorStop(0, css(next, 0));
      g.addColorStop(1, css(next, 0.75));
      ctx.fillStyle = g;
      ctx.fillRect(x, top, 2, h - top);
    }
  }
  return cv;
}

function labelled(face, name, s, hcm) {
  const cv = document.createElement("canvas");
  cv.width = face.width; cv.height = face.height;
  const ctx = cv.getContext("2d");
  ctx.drawImage(face, 0, 0);
  const size = Math.round(Math.min(4.2, hcm * 0.42) * s);
  ctx.font = "500 " + size + 'px "IBM Plex Mono", ui-monospace, monospace';
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.75)";
  ctx.shadowBlur = size * 0.25;
  ctx.fillStyle = "#f4efe6";
  ctx.fillText(name, 1.4 * s, Math.min(1.2 * s, hcm * 0.2 * s));
  return cv;
}

/* ---------- waiting for site.js to build the page ---------- */
function pageReady() {
  if (window.soilPage) return Promise.resolve(window.soilPage);
  return new Promise((done) => document.addEventListener("soil:page", () => done(window.soilPage), { once: true }));
}

function webglWorks() {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch (e) {
    return false;
  }
}

function describe(soil, table) {
  const hz = soil.horizons;
  return "Three-dimensional model of the " + (soil.series || "soil") + " profile, " + hz[hz.length - 1].bottom +
    " cm deep, with " + hz.length + " horizons from the surface down: " +
    hz.map((h) => {
      const row = table[h.name], bits = [h.name + ", " + h.top + " to " + h.bottom + " cm"];
      if (h.munsell) bits.push(h.munsell);
      if (row) {
        const t = codeIn(row.texture, TEXTURES), st = codeIn(row.structure, STRUCTURES);
        if (t) bits.push(TEXTURES[t]);
        if (st) bits.push(STRUCTURES[st]);
      }
      return bits.join(", ");
    }).join("; ") + ". The same information is in the profile column and the table.";
}

/* ---------- the page section ---------- */
function buildSection(soil, table) {
  const section = document.createElement("section");
  section.className = "monolith-section";
  section.innerHTML =
    "<h2>The profile in 3D</h2>" +
    '<p class="notes">A soil monolith built from the horizons above. Drag to turn it, scroll or pinch to zoom, and click or tap a horizon to read it.</p>' +
    '<figure class="monolith">' +
    '<div class="stage" role="img"><p class="stage-note">Loading the 3D model…</p></div>' +
    '<div class="bar">' +
    '<button type="button" data-explode aria-pressed="false">Explode</button>' +
    '<button type="button" data-spin aria-pressed="false">Turn slowly</button>' +
    '<button type="button" data-reset>Reset view</button>' +
    "</div>" +
    '<div class="card" data-card></div>' +
    "<figcaption>Depths are to scale; width and thickness are not. Colours approximate the moist Munsell colours, and the surface patterns are drawn from the texture, structure and rock codes in the table.</figcaption>" +
    "</figure>";
  section.querySelector(".stage").setAttribute("aria-label", describe(soil, table));

  const body = document.querySelector("[data-body]");
  const row = body.querySelector("tr[data-hz]");
  const heading = [...body.querySelectorAll("section > h2")].find((h) => /drocts/i.test(h.textContent));
  const after = (row && row.closest("section")) || (heading && heading.parentNode);
  if (after) after.after(section); else body.prepend(section);
  return section;
}

function fillCard(card, soil, table, name) {
  card.textContent = "";
  const hz = soil.horizons.find((h) => h.name === name);
  if (!hz) {
    const p = document.createElement("p");
    p.className = "card-hint";
    p.textContent = "Click or tap a horizon in the model, the profile column or the table to read it here.";
    card.appendChild(p);
    return;
  }
  const title = document.createElement("h3");
  title.textContent = hz.name;
  const meaning = nameMeaning(hz.name);
  if (meaning) {
    const small = document.createElement("small");
    small.textContent = meaning;
    title.appendChild(small);
  }
  card.appendChild(title);

  const row = table[hz.name] || {};
  const facts = [
    ["Depth", hz.top + "–" + hz.bottom + " cm (" + Math.round(hz.top / IN) + "–" + Math.round(hz.bottom / IN) + " in)"],
    ["Colour", hz.munsell ? hz.munsell + " moist" : ""],
    ["Texture", spell(row.texture, TEXTURES)],
    ["Structure", spell(row.structure, STRUCTURES)],
    ["Rocks", row.rocks ? row.rocks + (/^[\d.]+$/.test(row.rocks) ? "%" : "") : ""],
    ["HCl", spell(row.hcl, HCL)],
    ["pH", row.ph]
  ];
  const dl = document.createElement("dl");
  facts.forEach(([k, v]) => {
    if (!v) return;
    const dt = document.createElement("dt"), dd = document.createElement("dd");
    dt.textContent = k;
    if (k === "Colour") {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.style.background = hz.color;
      dd.appendChild(chip);
    }
    dd.appendChild(document.createTextNode(v));
    dl.append(dt, dd);
  });
  card.appendChild(dl);
}

/* ---------- the 3D scene ---------- */
async function buildModel(section, soil, table, page, pending) {
  const THREE = await import("three");
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  try { await document.fonts.load('500 20px "IBM Plex Mono"'); } catch (e) { /* the fallback font is fine */ }

  const stage = section.querySelector(".stage");
  const card = section.querySelector("[data-card]");
  const hzs = soil.horizons;
  const D = hzs[hzs.length - 1].bottom;
  const W = Math.max(30, D * 0.4), T = Math.max(10, D * 0.15);
  const gap = D * 0.05;
  const s = Math.min(9, 1400 / Math.max(W, ...hzs.map((h) => h.bottom - h.top)));

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const canvas = renderer.domElement;
  stage.textContent = "";
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 1, D * 40);
  scene.add(new THREE.HemisphereLight(0xfff8ec, 0x7d7466, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(-0.6, 0.8, 1).multiplyScalar(D);
  scene.add(sun);

  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const tex = (cv, repeatX = 1, offsetX = 0) => {
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    t.repeat.set(repeatX, 1);
    t.offset.set(offsetX, 0);
    return t;
  };
  const flat = (c) => new THREE.MeshLambertMaterial({ color: new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace) });

  const model = new THREE.Group();
  scene.add(model);
  const slabs = hzs.map((hz, i) => {
    const h = hz.bottom - hz.top;
    const face = paintFace(hz, table[hz.name], W, h, s, hzs[i + 1]);
    const plan = tex(paintFace(hz, table[hz.name], W, T, s, null, true));
    const front = tex(labelled(face, hz.name, s, h));
    const back = tex(face);
    const side = T / W;
    // Box faces in order: right, left, top, bottom, front, back.
    const mats = [
      new THREE.MeshLambertMaterial({ map: tex(face, side, 1 - side) }),
      new THREE.MeshLambertMaterial({ map: tex(face, side, 0) }),
      new THREE.MeshLambertMaterial({ map: plan, color: i === 0 ? 0xffffff : 0xe6e6e6 }),
      new THREE.MeshLambertMaterial({ map: plan, color: 0xcccccc }),
      new THREE.MeshLambertMaterial({ map: front }),
      new THREE.MeshLambertMaterial({ map: back })
    ];
    mats.forEach((m) => { m.userData.base = m.color.clone(); });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(W, h, T), mats);
    const y = D / 2 - (hz.top + hz.bottom) / 2;
    mesh.position.y = y;
    mesh.userData = { name: hz.name, y: y, i: i, now: { lift: 0, off: 0, dim: 1 }, goal: { lift: 0, off: 0, dim: 1 } };
    model.add(mesh);
    return mesh;
  });

  // A plinth to stand on, like a museum monolith, and a depth ruler.
  const light = rgbOf(cssVar("--stage-ink", "#d9d6cf"));
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 6, 2.5, T + 6), flat(rgbOf(cssVar("--gley", "#6b635b"))));
  plinth.position.y = -D / 2 - 1.25;
  model.add(plinth);

  const ruler = new THREE.Group();
  const rulerMat = flat(light);
  const rx = -W / 2 - 3, rz = T / 2;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, D, 0.5), rulerMat);
  bar.position.set(rx, 0, rz);
  ruler.add(bar);
  const labelH = Math.max(4, D * 0.032);
  for (let d = 0; d <= D; d += 10) {
    const major = d % 50 === 0 || d === 0;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(major ? 2.4 : 1.2, 0.35, 0.35), rulerMat);
    tick.position.set(rx - (major ? 1.2 : 0.6), D / 2 - d, rz);
    ruler.add(tick);
    if (!major) continue;
    const lc = document.createElement("canvas");
    lc.width = 160; lc.height = 48;
    const lx = lc.getContext("2d");
    lx.font = '500 30px "IBM Plex Mono", ui-monospace, monospace';
    lx.textAlign = "right"; lx.textBaseline = "middle";
    lx.fillStyle = cssVar("--stage-ink", "#d9d6cf");
    lx.fillText(d + (d === 0 ? " cm" : ""), 156, 24);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(lc), depthWrite: false }));
    sprite.scale.set(labelH * (160 / 48), labelH, 1);
    sprite.position.set(rx - 3 - labelH * (160 / 48) / 2, D / 2 - d, rz);
    ruler.add(sprite);
  }
  model.add(ruler);

  /* camera and controls */
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = !reduceMotion.matches;
  controls.dampingFactor = 0.12;
  controls.minPolarAngle = Math.PI * 0.12;
  controls.maxPolarAngle = Math.PI * 0.6;
  controls.autoRotateSpeed = 0.8;
  controls.rotateSpeed = 0.8;

  let exploded = false;
  const view = { polar: Math.PI * 0.44, azimuth: Math.PI * 0.17 };
  function fitDistance() {
    const tall = (exploded ? D + gap * (hzs.length - 1) : D) * 1.12 + 12;
    const wide = Math.hypot(W, T) * 1.35 + 30;
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    return Math.max(tall / 2 / Math.tan(half), wide / 2 / (Math.tan(half) * camera.aspect)) + T / 2;
  }
  function setLimits() {
    const fit = fitDistance();
    controls.minDistance = fit * 0.35;
    controls.maxDistance = fit * 1.6;
    return fit;
  }
  function resetView() {
    const fit = setLimits();
    controls.target.set(0, 0, 0);
    camera.position.setFromSphericalCoords(fit, view.polar, view.azimuth);
    camera.lookAt(controls.target);
    controls.update();
    dirty = true;
  }
  let dolly = null;  // a smooth move to a new viewing distance

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    setLimits();
    dirty = true;
  }

  /* selection */
  let selected = null, dirty = true;
  function select(name, fromPage) {
    selected = slabs.some((m) => m.userData.name === name) ? name : null;
    slabs.forEach((m) => {
      const on = m.userData.name === selected;
      m.userData.goal.lift = on ? T * 0.45 : 0;
      m.userData.goal.dim = selected && !on ? 0.55 : 1;
    });
    fillCard(card, soil, table, selected);
    if (!fromPage) page.show(selected);
    dirty = true;
  }
  function setExploded(on) {
    exploded = on;
    slabs.forEach((m) => { m.userData.goal.off = on ? gap * ((hzs.length - 1) / 2 - m.userData.i) : 0; });
    ruler.visible = !on;
    const fit = setLimits();
    dolly = fit;
    dirty = true;
  }

  /* animation */
  const settle = (now, goal, k) => (Math.abs(goal - now) < 0.01 ? goal : now + (goal - now) * k);
  function step(dt) {
    const k = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 9);
    let busy = false;
    slabs.forEach((m) => {
      const u = m.userData, n = u.now, g = u.goal;
      if (n.lift === g.lift && n.off === g.off && n.dim === g.dim) return;
      n.lift = settle(n.lift, g.lift, k);
      n.off = settle(n.off, g.off, k);
      n.dim = settle(n.dim, g.dim, k);
      m.position.set(0, u.y + n.off, n.lift);
      m.material.forEach((mat) => { mat.color.copy(mat.userData.base).multiplyScalar(n.dim); });
      busy = true;
    });
    const low = slabs[slabs.length - 1];
    plinth.position.y = -D / 2 - 1.25 + low.userData.now.off;
    if (dolly !== null) {
      const dir = camera.position.clone().sub(controls.target);
      const d = dir.length(), next = settle(d, dolly, k);
      camera.position.copy(controls.target).add(dir.setLength(next));
      if (next === dolly) dolly = null;
      busy = true;
    }
    return busy;
  }

  let visible = true, running = false, last = performance.now();
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const moved = step(dt);
    const changed = controls.update();
    if (moved || changed || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    if (visible) requestAnimationFrame(frame); else running = false;
  }
  function run() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) run(); }).observe(stage);
  new ResizeObserver(resize).observe(stage);

  /* picking with the pointer: a tap selects, a drag only turns */
  const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
  function hit(e) {
    const box = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - box.left) / box.width) * 2 - 1, -((e.clientY - box.top) / box.height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const found = ray.intersectObjects(slabs, false)[0];
    return found ? found.object.userData.name : null;
  }
  let down = null;
  canvas.addEventListener("pointerdown", (e) => { if (e.isPrimary) down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
  canvas.addEventListener("pointerup", (e) => {
    if (!e.isPrimary || !down) return;
    const tap = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && e.timeStamp - down.t < 600;
    down = null;
    if (!tap) return;
    const name = hit(e);
    select(name && name === selected ? null : name, false);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" && !e.buttons) canvas.style.cursor = hit(e) ? "pointer" : "grab";
  });
  document.addEventListener("soil:pick", (e) => select(e.detail, true));

  /* buttons */
  const explodeBtn = section.querySelector("[data-explode]");
  const spinBtn = section.querySelector("[data-spin]");
  explodeBtn.addEventListener("click", () => {
    setExploded(!exploded);
    explodeBtn.setAttribute("aria-pressed", String(exploded));
  });
  function syncMotion() {
    spinBtn.hidden = reduceMotion.matches;
    controls.enableDamping = !reduceMotion.matches;
    if (reduceMotion.matches) {
      controls.autoRotate = false;
      spinBtn.setAttribute("aria-pressed", "false");
    }
  }
  spinBtn.addEventListener("click", () => {
    controls.autoRotate = !controls.autoRotate;
    spinBtn.setAttribute("aria-pressed", String(controls.autoRotate));
    dirty = true;
  });
  reduceMotion.addEventListener("change", syncMotion);
  syncMotion();
  section.querySelector("[data-reset]").addEventListener("click", () => { dolly = null; resetView(); });

  resize();
  resetView();
  select(pending.name, true);
  section.classList.add("is-ready");
  run();
}

/* ---------- start ---------- */
pageReady().then((page) => {
  const soil = page.soil;
  if (!soil.horizons.length || !webglWorks()) return;
  const table = readTable();
  const section = buildSection(soil, table);
  fillCard(section.querySelector("[data-card]"), soil, table, null);

  // Remember a horizon picked in the table or column before the model is ready.
  const pending = { name: null };
  const early = (e) => { pending.name = e.detail; };
  document.addEventListener("soil:pick", early);

  // Fetch Three.js only when the model is about to scroll into view.
  const watch = new IntersectionObserver((entries) => {
    if (!entries[0].isIntersecting) return;
    watch.disconnect();
    buildModel(section, soil, table, page, pending)
      .catch((err) => {
        console.warn("3D soil model could not load:", err);
        section.remove();
      })
      .finally(() => document.removeEventListener("soil:pick", early));
  }, { rootMargin: "300px 0px" });
  watch.observe(section);
});
