/* ------------------------------------------------------------------
   Favorite Soils Report: page builder.
   Nobody needs to edit this file. All the writing lives in the
   "content" folder, one sub-folder per person. See README.md.
------------------------------------------------------------------- */
(function () {
  var PEOPLE = [
    { folder: "andy", page: "wauseon.html", fallback: "Soil 1" },
    { folder: "partner-2", page: "soil-2.html", fallback: "Soil 2" },
    { folder: "partner-3", page: "soil-3.html", fallback: "Soil 3" }
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

  /* Rough screen colour for a Munsell notation such as "10YR 4/3".
     Close enough to tell horizons apart; it is not a calibrated conversion. */
  function soilColor(munsell) {
    var hex = munsell.match(/#[0-9a-f]{6}\b/i);
    if (hex) return hex[0];
    var m = munsell.toUpperCase().match(/(\d+(?:\.\d+)?)\s*(YR|GY|BG|R|Y|G|B|N)?\s+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
    if (!m) {
      var n = munsell.toUpperCase().match(/N\s*(\d+(?:\.\d+)?)/);
      return n ? "hsl(40 3% " + (parseFloat(n[1]) * 9.5 + 2) + "%)" : "#6b635b";
    }
    var step = parseFloat(m[1]), fam = m[2] || "YR", value = parseFloat(m[3]), chroma = parseFloat(m[4]);
    var start = { R: -10, YR: 12, Y: 34, GY: 60, G: 120, BG: 170, B: 205, N: 40 }[fam];
    var hue = start + step * 2.1;
    var sat = fam === "N" ? 3 : Math.min(chroma * 9, 70);
    return "hsl(" + hue.toFixed(0) + " " + sat.toFixed(0) + "% " + (value * 9.5 + 2).toFixed(0) + "%)";
  }

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
            var chip = /^\d+(\.\d+)?\s*(YR|Y|R|GY|G|BG|B)\s+\d+(\.\d+)?\s*\/\s*\d+/i.test(c)
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
      core.querySelectorAll(".hz").forEach(function (el) {
        el.addEventListener("mouseenter", function () { show(el.dataset.hz); });
        el.addEventListener("focus", function () { show(el.dataset.hz); });
        el.addEventListener("click", function () {
          show(el.dataset.hz);
          var row = document.querySelector('tr[data-hz="' + el.dataset.hz + '"]');
          if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      });
      rows.forEach(function (r) { r.addEventListener("mouseenter", function () { show(r.dataset.hz); }); });
      show(null);
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
