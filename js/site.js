/* ------------------------------------------------------------------
   Favorite Soils Report: page builder.
   Nobody needs to edit this file. All the writing lives in the
   "content" folder, one sub-folder per person. See README.md.
------------------------------------------------------------------- */
(function () {
  var PEOPLE = [
    { folder: "andy", page: "wauseon.html", fallback: "Soil 1" },
    { folder: "amelie", page: "soil-2.html", fallback: "Soil 2" },
    { folder: "catherine", page: "soil-3.html", fallback: "Soil 3" }
  ];
  var IN = 2.54;

  /* ---------- loading ---------- */
  function load(path) {
    return fetch(path, { cache: "no-cache" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .catch(function () { return ""; });
  }

  /* ---------- soil.txt ---------- */
  function parseSoil(text) {
    var soil = { series: "", name: "", subgroup: "", summary: "", horizons: [] };
    text.split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var kv = line.match(/^(series|name|subgroup|summary)\s*:\s*(.*)$/i);
      if (kv) { soil[kv[1].toLowerCase()] = kv[2].trim(); return; }
      var parts = line.split(",").map(function (s) { return s.trim(); });
      if (parts.length >= 3 && !isNaN(parseFloat(parts[1])) && !isNaN(parseFloat(parts[2]))) {
        soil.horizons.push({
          name: parts[0],
          top: parseFloat(parts[1]),
          bottom: parseFloat(parts[2]),
          munsell: parts[3] || "",
          color: soilColor(parts[3] || "")
        });
      }
    });
    soil.horizons = soil.horizons.filter(function (h) { return h.bottom > h.top; });
    return soil;
  }

  /* Screen colour for a Munsell notation such as "10YR 4/3" or "N 5/".
     Value sets lightness by the ASTM D1535 formula; hue and chroma are
     placed in CIELAB from approximate Munsell hue angles, then converted
     to sRGB. A close approximation, not a calibrated chart match. */
  var HUE_ANGLES = [[5, 24], [10, 38], [15, 58], [20, 77], [25, 92], [30, 101], [35, 112], [40, 133], [45, 160], [50, 177],
    [55, 192], [60, 205], [65, 222], [70, 243], [75, 270], [80, 297], [85, 318], [90, 335], [95, 352], [100, 368]];
  var HUE_START = { R: 0, YR: 10, Y: 20, GY: 30, G: 40, BG: 50, B: 60, PB: 70, P: 80, RP: 90 };
  function munsellRGB(step, family, value, chroma) {
    var V = value, Y = 1.1914 * V - 0.22533 * V * V + 0.23352 * Math.pow(V, 3) - 0.020484 * Math.pow(V, 4) + 0.00081939 * Math.pow(V, 5);
    var t = Y / 100, fy = t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
    var pos = (HUE_START[family] + step) % 100, angle = 0;
    if (pos < 5) pos += 100;
    for (var i = 0; i < HUE_ANGLES.length - 1; i++) {
      var a = HUE_ANGLES[i], b = HUE_ANGLES[i + 1];
      if (pos >= a[0] && pos <= b[0]) angle = a[1] + (b[1] - a[1]) * (pos - a[0]) / (b[0] - a[0]);
    }
    var cstar = chroma * Math.min(4 + 0.4 * V, 6.4), h = angle * Math.PI / 180;
    var fx = fy + cstar * Math.cos(h) / 500, fz = fy - cstar * Math.sin(h) / 200;
    function inv(f) { return f * f * f > 0.008856 ? f * f * f : (f - 16 / 116) / 7.787; }
    var X = 0.95047 * inv(fx), Yr = inv(fy), Z = 1.08883 * inv(fz);
    return [3.2406 * X - 1.5372 * Yr - 0.4986 * Z, -0.9689 * X + 1.8758 * Yr + 0.0415 * Z, 0.0557 * X - 0.2040 * Yr + 1.0570 * Z]
      .map(function (u) {
        u = u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055;
        return Math.round(Math.max(0, Math.min(1, u)) * 255);
      });
  }
  function soilColor(munsell) {
    var hex = munsell.match(/#[0-9a-f]{6}\b/i);
    if (hex) return hex[0];
    var up = munsell.toUpperCase(), rgb;
    // Gley chart notation: "GLEY1 5/10Y" is 10Y 5/1, "GLEY1 5/N" is N 5/.
    var gley = up.match(/GLEY\s*\d\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)?\s*(GY|BG|PB|Y|G|B|N)/);
    if (gley) up = gley[3] === "N" ? "N " + gley[1] + "/" : (gley[2] || "5") + gley[3] + " " + gley[1] + "/1";
    var m = up.match(/(\d+(?:\.\d+)?)\s*(YR|GY|BG|PB|RP|R|Y|G|B|P)\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    var n = up.match(/\bN\s*(\d+(?:\.\d+)?)/);
    if (m) rgb = munsellRGB(parseFloat(m[1]), m[2], parseFloat(m[3]), parseFloat(m[4]));
    else if (n) rgb = munsellRGB(0, "Y", parseFloat(n[1]), 0);
    else return "#6b635b";
    return "rgb(" + rgb.join(", ") + ")";
  }
  window.soilColor = soilColor;

  function depthOf(soil) {
    var h = soil.horizons;
    return h.length ? h[h.length - 1].bottom : 0;
  }

  /* ---------- a small Markdown reader ---------- */
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function inline(s) {
    return esc(s)
      // A picture line inside a sentence (as in the TO DO hints) is shown as code to copy.
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, "<code>!&#91;$1&#93;&#40;$2&#41;</code>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, '$1<a href="$2">$2</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  }
  function cells(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map(function (c) { return c.trim(); });
  }
  function md(text, base, horizonNames) {
    var lines = text.replace(/\r/g, "").split("\n");
    var out = [], i = 0, open = false;
    horizonNames = horizonNames || [];
    function closeSection() { if (open) { out.push("</section>"); open = false; } }

    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { i++; continue; }

      var h = line.match(/^(#{1,3})\s+(.*)$/);
      if (h) {
        if (h[1].length <= 2) { closeSection(); out.push("<section>"); open = true; out.push("<h2>" + inline(h[2]) + "</h2>"); }
        else out.push("<h3>" + inline(h[2]) + "</h3>");
        i++; continue;
      }

      var img = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (img) {
        var src = /^(https?:)?\/\//.test(img[2]) ? img[2] : base + img[2].trim();
        out.push('<figure class="plate"><img src="' + esc(src) + '" alt="' + esc(img[1]) + '" loading="lazy">' +
          (img[1] ? "<figcaption>" + inline(img[1]) + "</figcaption>" : "") + "</figure>");
        i++; continue;
      }

      if (/^\s*\|/.test(line)) {
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) { rows.push(cells(lines[i])); i++; }
        var head = rows.shift();
        if (rows.length && rows[0].every(function (c) { return /^:?-+:?$/.test(c); })) rows.shift();
        var wide = head.length > 4;
        var t = '<div class="table-wrap"><table class="drocts' + (wide ? " wide" : "") + '"><thead><tr>';
        head.forEach(function (c) { t += '<th scope="col">' + inline(c) + "</th>"; });
        t += "</tr></thead><tbody>";
        rows.forEach(function (r) {
          var hz = horizonNames.indexOf(r[0]) > -1 ? ' data-hz="' + esc(r[0]) + '"' : "";
          t += "<tr" + hz + ">";
          r.forEach(function (c, k) {
            var chip = /^(\d+(\.\d+)?\s*(YR|GY|BG|PB|RP|Y|R|G|B|P)\s+\d+(\.\d+)?\s*\/\s*\d+|N\s*\d+(\.\d+)?\s*\/)/i.test(c)
              ? '<span class="chip" style="background:' + soilColor(c) + '"></span>' : "";
            t += (k === 0 ? '<th scope="row">' : "<td>") + chip + inline(c) + (k === 0 ? "</th>" : "</td>");
          });
          t += "</tr>";
        });
        out.push(t + "</tbody></table></div>");
        continue;
      }

      var ul = /^\s*[-*]\s+/, ol = /^\s*\d+[.)]\s+/;
      if (ul.test(line) || ol.test(line)) {
        var ordered = ol.test(line), re = ordered ? ol : ul, items = [];
        while (i < lines.length && re.test(lines[i])) { items.push(lines[i].replace(re, "")); i++; }
        out.push((ordered ? '<ol class="story">' : "<ul>") +
          items.map(function (x) { return "<li>" + inline(x) + "</li>"; }).join("") + (ordered ? "</ol>" : "</ul>"));
        continue;
      }

      var para = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|\s*\||\s*[-*]\s+|\s*\d+[.)]\s+|\s*!\[)/.test(lines[i])) {
        para.push(lines[i].trim()); i++;
      }
      if (!para.length) { para.push(line.trim()); i++; }
      var joined = para.join(" ");
      var todo = joined.match(/^TO ?DO\s*:\s*(.*)$/i);
      out.push(todo
        ? '<div class="todo"><p><strong>Still to do.</strong> ' + inline(todo[1]) + "</p></div>"
        : "<p>" + inline(joined) + "</p>");
    }
    closeSection();
    return out.join("\n");
  }

  /* ---------- drawing a soil core ---------- */
  function buildCore(soil, maxDepth, asButtons) {
    var core = document.createElement("div");
    core.className = "core";
    if (!soil.horizons.length) {
      core.classList.add("is-empty");
      core.textContent = "Horizons to come";
      return core;
    }
    soil.horizons.forEach(function (hz) {
      var el = document.createElement(asButtons ? "button" : "div");
      if (asButtons) {
        el.type = "button";
        el.setAttribute("aria-label", hz.name + " horizon, " + hz.top + " to " + hz.bottom + " centimetres");
      }
      el.className = "hz";
      el.dataset.hz = hz.name;
      el.style.background = hz.color;
      el.style.flex = (hz.bottom - hz.top) + " 0 0";
      el.textContent = hz.name;
      core.appendChild(el);
    });
    var gap = maxDepth - depthOf(soil);
    if (gap > 0) {
      var pad = document.createElement("div");
      pad.style.flex = gap + " 0 0";
      core.appendChild(pad);
    }
    return core;
  }

  /* ---------- everyone's soil.txt, loaded once ---------- */
  var soilsReady = Promise.all(PEOPLE.map(function (p) {
    return load("content/" + p.folder + "/soil.txt").then(function (t) {
      var soil = parseSoil(t);
      soil.person = p;
      soil.title = soil.series || p.fallback;
      return soil;
    });
  }));

  // Menu labels follow the series names.
  soilsReady.then(function (soils) {
    soils.forEach(function (soil) {
      document.querySelectorAll('.masthead nav a[href="' + soil.person.page + '"]').forEach(function (a) {
        a.textContent = soil.title;
      });
    });
  });

  /* ---------- home ---------- */
  var grid = document.querySelector("[data-cores]");
  if (grid) {
    soilsReady.then(function (soils) {
      var maxDepth = Math.max.apply(null, soils.map(depthOf).concat([100]));
      var scale = document.createElement("div");
      scale.className = "scale";
      scale.setAttribute("aria-hidden", "true");
      for (var d = 0; d <= maxDepth; d += 50) {
        var t = document.createElement("span");
        t.style.top = (d / maxDepth) * 100 + "%";
        t.textContent = d + " cm";
        scale.appendChild(t);
      }
      grid.appendChild(scale);
      soils.forEach(function (soil) {
        var a = document.createElement("a");
        a.className = "col";
        a.href = soil.person.page;
        a.appendChild(buildCore(soil, maxDepth, false));
        var cap = document.createElement("div");
        cap.className = "cap";
        var name = document.createElement("strong");
        name.textContent = soil.title;
        cap.appendChild(name);
        if (soil.subgroup) {
          var sub = document.createElement("em");
          sub.textContent = soil.subgroup;
          cap.appendChild(sub);
          cap.appendChild(document.createElement("br"));
        }
        cap.appendChild(document.createTextNode(soil.name || "Team member to add"));
        a.appendChild(cap);
        grid.appendChild(a);
      });
    });

    var about = document.querySelector("[data-about]");
    if (about) load("content/group/about.md").then(function (t) { about.innerHTML = md(t, "content/group/"); });

    var map = document.querySelector("[data-map]");
    if (map) load("content/group/map.txt").then(function (t) {
      var m = t.match(/https:\/\/www\.google\.com\/maps\/d\/(?:u\/\d+\/)?embed\?[^"'\s<>]+/);
      if (!m) return;
      var frame = document.createElement("iframe");
      frame.src = m[0].replace(/&amp;/g, "&");
      frame.title = "Map of our three soils";
      frame.loading = "lazy";
      map.innerHTML = "";
      map.appendChild(frame);
    });
  }

  /* ---------- a soil page ---------- */
  var page = document.querySelector("[data-person]");
  if (page) {
    var folder = page.dataset.person, base = "content/" + folder + "/";
    Promise.all([soilsReady, load(base + "page.md")]).then(function (res) {
      var soil = res[0].filter(function (s) { return s.person.folder === folder; })[0];
      var names = soil.horizons.map(function (h) { return h.name; });

      document.title = soil.title + " | Favorite Soils Report";
      document.querySelector("[data-title]").textContent = soil.title;
      document.querySelector("[data-lede]").textContent = soil.name
        ? soil.name + "'s favorite soil. " + soil.summary
        : "This page is waiting for its soil.";

      document.querySelector("[data-body]").innerHTML = md(res[1], base, names) ||
        '<div class="todo"><p><strong>Still to do.</strong> This page has no writing yet.</p></div>';

      var rail = document.querySelector("[data-core]");
      var depth = depthOf(soil);
      var core = buildCore(soil, depth, true);
      rail.appendChild(core);
      var ticks = document.createElement("div");
      ticks.className = "ticks";
      ticks.setAttribute("aria-hidden", "true");
      if (depth) {
        [0].concat(soil.horizons.map(function (h) { return h.bottom; })).forEach(function (cm) {
          var s = document.createElement("span");
          s.style.top = (cm / depth) * 100 + "%";
          s.textContent = cm;
          ticks.appendChild(s);
        });
      }
      rail.appendChild(ticks);

      var readout = document.querySelector("[data-readout]");
      var rows = document.querySelectorAll("tr[data-hz]");
      function show(name) {
        core.querySelectorAll(".hz").forEach(function (el) { el.classList.toggle("is-on", el.dataset.hz === name); });
        rows.forEach(function (r) { r.classList.toggle("is-on", r.dataset.hz === name); });
        var hz = soil.horizons.filter(function (x) { return x.name === name; })[0];
        if (!depth) { readout.textContent = ""; return; }
        if (!hz) { readout.textContent = "Point at a horizon to read it."; return; }
        readout.innerHTML = "";
        var b = document.createElement("b");
        b.textContent = hz.name;
        readout.appendChild(b);
        readout.appendChild(document.createElement("br"));
        readout.appendChild(document.createTextNode(
          hz.top + " to " + hz.bottom + " cm (" + Math.round(hz.top / IN) + " to " + Math.round(hz.bottom / IN) + " in)"));
        if (hz.munsell) {
          readout.appendChild(document.createElement("br"));
          readout.appendChild(document.createTextNode(hz.munsell + " moist"));
        }
      }
      // A click (not a hover) picks a horizon; the 3D model in js/soil3d.js listens for it.
      function pick(name) {
        show(name);
        document.dispatchEvent(new CustomEvent("soil:pick", { detail: name }));
      }
      core.querySelectorAll(".hz").forEach(function (el) {
        el.addEventListener("mouseenter", function () { show(el.dataset.hz); });
        el.addEventListener("focus", function () { show(el.dataset.hz); });
        el.addEventListener("click", function () {
          pick(el.dataset.hz);
          var row = document.querySelector('tr[data-hz="' + el.dataset.hz + '"]');
          if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      });
      rows.forEach(function (r) {
        r.addEventListener("mouseenter", function () { show(r.dataset.hz); });
        r.addEventListener("click", function () { pick(r.dataset.hz); });
      });
      show(null);

      // Hand the finished page to js/soil3d.js, whichever of the two loads first.
      window.soilPage = { soil: soil, show: show };
      document.dispatchEvent(new CustomEvent("soil:page"));
    });
  }

  /* ---------- blog ---------- */
  document.querySelectorAll("[data-posts]").forEach(function (holder) {
    var file = holder.dataset.posts;
    soilsReady.then(function (soils) {
      return Promise.all(soils.map(function (soil) {
        return load("content/" + soil.person.folder + "/" + file).then(function (t) { return { soil: soil, text: t }; });
      }));
    }).then(function (posts) {
      holder.innerHTML = posts.map(function (p) {
        var title = "Post title to add", body = p.text.replace(/\r/g, "");
        var m = body.match(/^\s*#\s+(.*)\n?/);
        if (m) { title = m[1].trim(); body = body.slice(m[0].length); }
        // Sub-headings inside a post should not start new page sections.
        body = body.replace(/^#{1,2}\s+/gm, "### ");
        var who = p.soil.name ? p.soil.name + ", " + p.soil.title + " series" : p.soil.title + ", author to add";
        return '<article class="post" id="' + file.replace(".md", "") + "-" + p.soil.person.folder + '"><header><h3>' +
          esc(title) + '</h3><p class="by">' + esc(who) + "</p></header>" +
          md(body, "content/" + p.soil.person.folder + "/") + "</article>";
      }).join("");
    });
  });
})();
