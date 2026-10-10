/* Draws the soil cores from js/soils.js and links them to the tables. */
(function () {
  var SOILS = window.SOILS || [];
  var IN = 2.54;

  function depthOf(soil) {
    var h = soil.horizons;
    return h.length ? h[h.length - 1].bottom : 0;
  }

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
      if (asButtons) el.type = "button";
      el.className = "hz";
      el.dataset.hz = hz.name;
      el.style.background = hz.color;
      el.style.flex = (hz.bottom - hz.top) + " 0 0";
      el.textContent = hz.name;
      if (asButtons) {
        el.setAttribute("aria-label", hz.name + " horizon, " + hz.top + " to " + hz.bottom + " centimetres");
      }
      core.appendChild(el);
    });
    // A shallower soil leaves open space below it so every core shares one scale.
    var gap = maxDepth - depthOf(soil);
    if (gap > 0) {
      var pad = document.createElement("div");
      pad.style.flex = gap + " 0 0";
      core.appendChild(pad);
    }
    return core;
  }

  /* ---- home page: three cores on one depth scale ---- */
  var grid = document.querySelector("[data-cores]");
  if (grid) {
    var maxDepth = Math.max.apply(null, SOILS.map(depthOf).concat([100]));
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
    SOILS.forEach(function (soil, i) {
      var a = document.createElement("a");
      a.className = "col";
      a.href = soil.page;
      a.appendChild(buildCore(soil, maxDepth, false));
      var cap = document.createElement("div");
      cap.className = "cap";
      var name = document.createElement("strong");
      name.textContent = soil.series || "Soil " + (i + 1);
      cap.appendChild(name);
      if (soil.subgroup) {
        var sub = document.createElement("em");
        sub.textContent = soil.subgroup;
        cap.appendChild(sub);
        cap.appendChild(document.createElement("br"));
      }
      cap.appendChild(document.createTextNode(soil.member || "Team member to add"));
      a.appendChild(cap);
      grid.appendChild(a);
    });
  }

  /* ---- soil page: one core, linked to the DRoCTS+ table ---- */
  var rail = document.querySelector("[data-core]");
  if (rail) {
    var soil = SOILS.filter(function (s) { return s.id === rail.dataset.core; })[0];
    if (!soil) return;
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
    var rows = document.querySelectorAll("table.drocts tbody tr[data-hz]");

    function show(name) {
      core.querySelectorAll(".hz").forEach(function (el) { el.classList.toggle("is-on", el.dataset.hz === name); });
      rows.forEach(function (r) { r.classList.toggle("is-on", r.dataset.hz === name); });
      var hz = soil.horizons.filter(function (h) { return h.name === name; })[0];
      if (!readout) return;
      if (!hz) { readout.textContent = "Point at a horizon to read it."; return; }
      readout.innerHTML = "";
      var b = document.createElement("b");
      b.textContent = hz.name;
      readout.appendChild(b);
      readout.appendChild(document.createElement("br"));
      readout.appendChild(document.createTextNode(
        hz.top + " to " + hz.bottom + " cm (" + Math.round(hz.top / IN) + " to " + Math.round(hz.bottom / IN) + " in)"
      ));
      readout.appendChild(document.createElement("br"));
      readout.appendChild(document.createTextNode(hz.munsell + " moist"));
    }

    core.querySelectorAll(".hz").forEach(function (el) {
      el.addEventListener("mouseenter", function () { show(el.dataset.hz); });
      el.addEventListener("focus", function () { show(el.dataset.hz); });
      el.addEventListener("click", function () {
        show(el.dataset.hz);
        var row = document.querySelector('table.drocts tbody tr[data-hz="' + el.dataset.hz + '"]');
        if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    });
    rows.forEach(function (r) {
      r.addEventListener("mouseenter", function () { show(r.dataset.hz); });
    });
    show(null);
  }
})();
