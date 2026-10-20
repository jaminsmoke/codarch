(function () {
  "use strict";

  var data = JSON.parse(document.getElementById("codarch-data").textContent);
  var F = data.files;
  var N = F.length;
  var METRIC_OFFSET = 8;

  function pathOf(index) {
    var row = F[index];
    return row[0] < 0 ? row[1] : data.dirs[row[0]] + "/" + row[1];
  }

  var RISK_STOPS = [
    [0, "#ebe7df"],
    [0.35, "#e9cd98"],
    [0.65, "#d68a54"],
    [1, "#a42e2c"]
  ];
  var METRIC_STOPS = [
    [0, "#ebe7df"],
    [0.5, "#b9c9cf"],
    [1, "#355b6b"]
  ];
  var RISK_GRADIENT =
    "linear-gradient(90deg, #ebe7df 0%, #e9cd98 35%, #d68a54 65%, #a42e2c 100%)";
  var METRIC_GRADIENT =
    "linear-gradient(90deg, #ebe7df 0%, #b9c9cf 50%, #355b6b 100%)";

  var metricIndex = new Map();
  for (var mi = 0; mi < data.metrics.length; mi++) {
    metricIndex.set(data.metrics[mi].key, mi);
  }

  var lens = data.lens || "risk";
  var metricKey =
    data.metric && metricIndex.has(data.metric)
      ? data.metric
      : data.metrics.length > 0
        ? data.metrics[0].key
        : null;
  var selected = null;
  var query = "";
  var firstHit = -1;

  var svg = document.getElementById("map");
  var edgesEl = document.getElementById("edges");
  var tooltip = document.getElementById("tooltip");
  var inspector = document.getElementById("inspector");
  var crumbs = document.getElementById("crumbs");
  var legendEl = document.getElementById("legend");
  var searchInput = document.getElementById("q");
  var metricPicker = document.getElementById("metric-pick");
  var metricSelect = document.getElementById("metric-select");

  var cellByIndex = Array.from({ length: N });
  var rects = Array.from({ length: N });
  var texts = Array.from({ length: N });
  for (var ti = 0; ti < N; ti++) texts[ti] = [];
  var cells = Array.prototype.slice.call(
    document.querySelectorAll("#map rect[data-i]")
  );
  for (var ci = 0; ci < cells.length; ci++) {
    var cell = cells[ci];
    var index = Number(cell.dataset.i);
    cellByIndex[index] = cell;
    rects[index] = cell;
    var sibling = cell.nextElementSibling;
    while (
      sibling &&
      sibling.tagName === "text" &&
      (sibling.classList.contains("a") || sibling.classList.contains("b"))
    ) {
      texts[index].push(sibling);
      sibling = sibling.nextElementSibling;
    }
  }
  var folderEls = Array.prototype.slice.call(document.querySelectorAll(".folder"));
  var folderPathCache = new Map();

  function folderPath(el) {
    var known = folderPathCache.get(el);
    if (known !== undefined) return known;
    var parts = [];
    var cursor = el;
    while (cursor) {
      if (cursor.classList && cursor.classList.contains("folder")) {
        parts.unshift(cursor.dataset.nm || "");
      }
      cursor = cursor.parentElement;
    }
    var path = parts.filter(Boolean).join("/");
    folderPathCache.set(el, path);
    return path;
  }

  /* ------------------------------------------------------------------ *
   *  Dependencias
   * ------------------------------------------------------------------ */
  var out = Array.from({ length: N });
  var inc = Array.from({ length: N });
  for (var ai = 0; ai < N; ai++) {
    out[ai] = [];
    inc[ai] = [];
  }
  var edgeSet = new Set();
  for (var ei = 0; ei < data.edges.length; ei += 2) {
    var from = data.edges[ei];
    var to = data.edges[ei + 1];
    out[from].push(to);
    inc[to].push(from);
    edgeSet.add(from * N + to);
  }
  var cycleSet = new Set();
  for (var cci = 0; cci < data.cycles.length; cci += 2) {
    cycleSet.add(data.cycles[cci] * N + data.cycles[cci + 1]);
  }

  function isCycle(a, b) {
    return cycleSet.has(a * N + b) || edgeSet.has(b * N + a);
  }

  /* ------------------------------------------------------------------ *
   *  Color
   * ------------------------------------------------------------------ */
  function clamp01(value) {
    if (!isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
  }

  function hexToRgb(hex) {
    var value = hex.replace("#", "");
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16)
    ];
  }

  function rgbToHex(rgb) {
    return (
      "#" +
      rgb
        .map(function (channel) {
          return channel.toString(16).padStart(2, "0");
        })
        .join("")
    );
  }

  function mix(a, b, t) {
    var from = hexToRgb(a);
    var to = hexToRgb(b);
    return rgbToHex([
      Math.round(from[0] + (to[0] - from[0]) * t),
      Math.round(from[1] + (to[1] - from[1]) * t),
      Math.round(from[2] + (to[2] - from[2]) * t)
    ]);
  }

  function ramp(stops, t) {
    var value = clamp01(t);
    for (var i = 0; i < stops.length - 1; i++) {
      var start = stops[i];
      var end = stops[i + 1];
      if (value <= end[0]) {
        var span = end[0] - start[0] || 1;
        return mix(start[1], end[1], (value - start[0]) / span);
      }
    }
    return stops[stops.length - 1][1];
  }

  function riskColor(risk) {
    return ramp(RISK_STOPS, risk);
  }

  function metricColor(value, metric) {
    if (value === null || value === undefined) return METRIC_STOPS[0][1];
    var t;
    if (metric.mode === "log") {
      var span = Math.max(1e-9, metric.max - metric.min);
      t = Math.log1p(Math.max(0, value - metric.min)) / Math.log1p(span);
    } else {
      var linear = metric.max - metric.min;
      t = linear > 0 ? (value - metric.min) / linear : 0;
    }
    return ramp(METRIC_STOPS, t);
  }

  function inkFor(color) {
    var rgb = hexToRgb(color);
    var luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
    return luminance > 0.52 ? "#1a1a1a" : "#f7f5f1";
  }

  function metricFor(key) {
    var index = metricIndex.get(key);
    return index === undefined ? undefined : data.metrics[index];
  }

  function metricValue(index, key) {
    var position = metricIndex.get(key);
    if (position === undefined) return null;
    return F[index][METRIC_OFFSET + position];
  }

  function sectionFor(index) {
    return (
      data.sections[F[index][2]] || {
        key: "",
        color: "#ddd8cf",
        files: 0,
        area: 0
      }
    );
  }

  function colorFor(index) {
    if (lens === "structure") return sectionFor(index).color;
    if (lens === "risk") return riskColor(F[index][5]);
    var metric = metricFor(metricKey);
    if (!metric) return riskColor(F[index][5]);
    return metricColor(metricValue(index, metricKey), metric);
  }

  /* ------------------------------------------------------------------ *
   *  Formato y escape
   * ------------------------------------------------------------------ */
  var HTML_ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return HTML_ESCAPES[character];
    });
  }

  function fmt(value) {
    if (value === null || value === undefined || !isFinite(value)) return "—";
    var rounded = Math.round(value * 100) / 100;
    var parts = String(rounded).split(".");
    var integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.length > 1 && parts[1] ? integer + "," + parts[1] : integer;
  }

  function pct(risk) {
    return Math.round(risk * 100);
  }

  function nameOf(path) {
    var slash = path.lastIndexOf("/");
    return slash >= 0 ? path.slice(slash + 1) : path;
  }

  function inFolder(path, folder) {
    return path === folder || path.indexOf(folder + "/") === 0;
  }

  /* ------------------------------------------------------------------ *
   *  Lentes, leyenda y selector de métrica
   * ------------------------------------------------------------------ */
  function applyLens() {
    for (var i = 0; i < N; i++) {
      var rect = rects[i];
      if (!rect) continue;
      var color = colorFor(i);
      rect.setAttribute("fill", color);
      var ink = inkFor(color);
      var labels = texts[i];
      for (var t = 0; t < labels.length; t++) {
        labels[t].setAttribute("fill", ink);
      }
    }
    renderLegend();
    updateMetricPicker();
    if (selected) renderInspector();
  }

  function setLens(next) {
    if (next === "metric" && !metricKey) return;
    lens = next;
    var buttons = document.querySelectorAll(".lens");
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute("aria-selected", String(buttons[i].dataset.lens === lens));
    }
    applyLens();
  }

  function updateMetricPicker() {
    if (!metricPicker) return;
    metricPicker.hidden = lens !== "metric";
    if (metricSelect && metricKey) metricSelect.value = metricKey;
  }

  function renderLegend() {
    if (lens === "structure") {
      var swatches = data.sections
        .slice(0, 6)
        .map(function (section) {
          return (
            '<span><i style="background:' +
            section.color +
            '"></i>' +
            esc(section.key) +
            "</span>"
          );
        })
        .join("");
      legendEl.innerHTML =
        '<span>Carpeta</span><span class="sws">' + swatches + "</span>";
      return;
    }

    if (lens === "metric") {
      var metric = metricFor(metricKey);
      if (metric) {
        var direction =
          metric.dir === -1
            ? " · menos es mejor"
            : metric.dir === 1
              ? " · más es mejor"
              : "";
        legendEl.innerHTML =
          "<span>" +
          esc(metric.title) +
          direction +
          '</span><span class="mono">' +
          esc(fmt(metric.min)) +
          '</span><span class="bar" style="background:' +
          METRIC_GRADIENT +
          '"></span><span class="mono">' +
          esc(fmt(metric.max)) +
          "</span>";
        return;
      }
    }

    legendEl.innerHTML =
      '<span>Riesgo (0–100)</span><span class="mono">0</span><span class="bar" style="background:' +
      RISK_GRADIENT +
      '"></span><span class="mono">100</span>';
  }

  /* ------------------------------------------------------------------ *
   *  Búsqueda
   * ------------------------------------------------------------------ */
  function syncText(index) {
    var cell = cellByIndex[index];
    if (!cell) return;
    var dim = cell.classList.contains("dim") || cell.classList.contains("outside");
    var labels = texts[index];
    for (var i = 0; i < labels.length; i++) {
      labels[i].style.opacity = dim ? "0.12" : "";
    }
  }

  function applySearch() {
    var needle = query.trim().toLowerCase();
    var hits = 0;
    firstHit = -1;
    var bestArea = -Infinity;

    for (var i = 0; i < N; i++) {
      var cell = cellByIndex[i];
      if (!cell) continue;
      var hit = Boolean(needle) && pathOf(i).toLowerCase().indexOf(needle) !== -1;
      if (hit) {
        hits++;
        if (F[i][4] > bestArea) {
          bestArea = F[i][4];
          firstHit = i;
        }
      }
      cell.classList.toggle("hit", hit);
      cell.classList.toggle("dim", Boolean(needle) && !hit);
      syncText(i);
    }

    for (var f = 0; f < folderEls.length; f++) {
      var folder = folderEls[f];
      var folderMatch =
        Boolean(needle) &&
        folderPath(folder).toLowerCase().indexOf(needle) !== -1;
      var hasHit =
        Boolean(needle) && folder.querySelector("rect[data-i].hit") !== null;
      folder.classList.toggle("dim", Boolean(needle) && !folderMatch && !hasHit);
      folder.classList.toggle("hit-folder", folderMatch);
    }

    var status = document.getElementById("search-status");
    if (status) {
      status.textContent = needle
        ? hits + (hits === 1 ? " coincidencia" : " coincidencias")
        : "";
    }
  }

  /* ------------------------------------------------------------------ *
   *  Selección, aristas, inspector
   * ------------------------------------------------------------------ */
  function selectFile(index) {
    selected = { kind: "file", index: index };
    afterSelectionChange();
  }

  function selectFolder(path) {
    selected = { kind: "folder", path: path };
    afterSelectionChange();
  }

  function clearSelection() {
    selected = null;
    afterSelectionChange();
  }

  function afterSelectionChange() {
    applySelection();
    renderInspector();
    drawEdges();
    updateCrumbs();
    inspector.scrollTop = 0;
  }

  function applySelection() {
    var active = selected && selected.kind === "file" ? selected.index : -1;
    var related = new Set();
    if (active >= 0) {
      related.add(active);
      for (var oi = 0; oi < Math.min(8, out[active].length); oi++) {
        related.add(out[active][oi]);
      }
      for (var ii = 0; ii < Math.min(8, inc[active].length); ii++) {
        related.add(inc[active][ii]);
      }
    }

    for (var i = 0; i < N; i++) {
      var cell = cellByIndex[i];
      if (!cell) continue;
      cell.classList.toggle("selected", i === active);
      cell.classList.toggle("related", active >= 0 && i !== active && related.has(i));
      cell.classList.toggle(
        "outside",
        Boolean(selected && selected.kind === "folder" && !inFolder(pathOf(i), selected.path))
      );
      syncText(i);
    }

    for (var f = 0; f < folderEls.length; f++) {
      var folder = folderEls[f];
      var path = folderPath(folder);
      var focused =
        Boolean(selected && selected.kind === "folder" && path === selected.path);
      var inside =
        Boolean(selected && selected.kind === "folder") &&
        (path === selected.path || path.indexOf(selected.path + "/") === 0);
      folder.classList.toggle("focused", focused);
      folder.classList.toggle(
        "outside",
        Boolean(selected && selected.kind === "folder") && !inside
      );
    }
  }

  function drawEdges() {
    while (edgesEl.firstChild) edgesEl.removeChild(edgesEl.firstChild);
    if (!selected || selected.kind !== "file") return;

    var source = rects[selected.index];
    if (!source) return;
    var sx = Number(source.getAttribute("x")) + Number(source.getAttribute("width")) / 2;
    var sy = Number(source.getAttribute("y")) + Number(source.getAttribute("height")) / 2;
    var namespace = "http://www.w3.org/2000/svg";

    function curve(other, incoming) {
      var target = rects[other];
      if (!target) return;
      var tx =
        Number(target.getAttribute("x")) + Number(target.getAttribute("width")) / 2;
      var ty =
        Number(target.getAttribute("y")) + Number(target.getAttribute("height")) / 2;
      var startX = incoming ? tx : sx;
      var startY = incoming ? ty : sy;
      var endX = incoming ? sx : tx;
      var endY = incoming ? sy : ty;
      var middleX = (startX + endX) / 2;
      var middleY =
        (startY + endY) / 2 - Math.min(70, Math.abs(endX - startX) * 0.18 + 22);
      var bad = incoming ? isCycle(other, selected.index) : isCycle(selected.index, other);

      var path = document.createElementNS(namespace, "path");
      path.setAttribute(
        "d",
        "M " +
          startX +
          " " +
          startY +
          " Q " +
          middleX +
          " " +
          middleY +
          " " +
          endX +
          " " +
          endY
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", bad ? "#a42e2c" : "#1a1a1a");
      path.setAttribute("stroke-width", bad ? "1.8" : "1.1");
      path.setAttribute("stroke-opacity", bad ? "0.95" : "0.32");
      path.setAttribute("vector-effect", "non-scaling-stroke");
      if (incoming) path.setAttribute("stroke-dasharray", "3 3");
      edgesEl.appendChild(path);

      var circle = document.createElementNS(namespace, "circle");
      circle.setAttribute("cx", endX);
      circle.setAttribute("cy", endY);
      circle.setAttribute("r", bad ? "3" : "2.2");
      circle.setAttribute("fill", bad ? "#a42e2c" : "#1a1a1a");
      circle.setAttribute("fill-opacity", bad ? "1" : "0.45");
      edgesEl.appendChild(circle);
    }

    for (var i = 0; i < Math.min(8, out[selected.index].length); i++) {
      curve(out[selected.index][i], false);
    }
    for (var j = 0; j < Math.min(8, inc[selected.index].length); j++) {
      curve(inc[selected.index][j], true);
    }
  }

  function dependencyList(indices, emptyText) {
    if (!indices.length) return '<p class="empty">' + emptyText + "</p>";
    return (
      '<ul class="deps">' +
      indices
        .slice(0, 8)
        .map(function (index) {
          return (
            '<li data-file="' +
            index +
            '"><i class="sw" style="background:' +
            colorFor(index) +
            '"></i><span>' +
            esc(pathOf(index)) +
            "</span><em>" +
            pct(F[index][5]) +
            "</em></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function cycleWarning(index) {
    var partners = new Set();
    for (var i = 0; i < out[index].length; i++) {
      if (isCycle(index, out[index][i])) partners.add(out[index][i]);
    }
    for (var j = 0; j < inc[index].length; j++) {
      if (isCycle(inc[index][j], index)) partners.add(inc[index][j]);
    }
    if (partners.size === 0) return "";
    var first = partners.values().next().value;
    return (
      '<div class="violation"><b>Ciclo de dependencias</b>Este fichero participa en un ciclo con ' +
      esc(nameOf(pathOf(first))) +
      ".</div>"
    );
  }

  function renderInspector() {
    if (!selected) {
      var top = [];
      for (var i = 0; i < N; i++) top.push(i);
      top.sort(function (a, b) {
        return F[b][5] - F[a][5] || pathOf(a).localeCompare(pathOf(b));
      });
      top = top.slice(0, 5);
      inspector.innerHTML =
        '<div class="summary">' +
        '<div class="sub">Proyecto</div>' +
        '<div class="big">' +
        esc(fmt(data.fileCount)) +
        "</div>" +
        '<div class="sub">ficheros · ' +
        esc(fmt(data.folderCount)) +
        " carpetas</div>" +
        "<p>" +
        esc(fmt(data.totalArea)) +
        " de " +
        esc(data.area.title.toLowerCase()) +
        " · " +
        esc(fmt(data.metrics.length)) +
        " métricas · " +
        esc(fmt(data.hot)) +
        " hotspots.</p>" +
        "<h4>Mayor riesgo</h4>" +
        '<ul class="deps">' +
        top
          .map(function (index) {
            return (
              '<li data-file="' +
              index +
              '"><i class="sw" style="background:' +
              riskColor(F[index][5]) +
              '"></i><span>' +
              esc(pathOf(index)) +
              "</span><em>" +
              pct(F[index][5]) +
              "</em></li>"
            );
          })
          .join("") +
        "</ul>" +
        "<p>Selecciona un bloque para ver sus métricas y sus dependencias. Clic en la cabecera de una carpeta para enfocarla.</p>" +
        "</div>";
      return;
    }

    if (selected.kind === "folder") {
      var folderPath = selected.path;
      var indexes = [];
      var total = 0;
      for (var fi = 0; fi < N; fi++) {
        if (inFolder(pathOf(fi), folderPath)) {
          indexes.push(fi);
          total += F[fi][4];
        }
      }
      indexes.sort(function (a, b) {
        return F[b][5] - F[a][5] || pathOf(a).localeCompare(pathOf(b));
      });
      inspector.innerHTML =
        '<div class="insp">' +
        '<div class="insp-path">' +
        esc(folderPath) +
        "</div>" +
        '<div class="tags"><span class="tag">carpeta</span><span class="tag">' +
        esc(fmt(indexes.length)) +
        " ficheros</span></div>" +
        '<dl class="metrics">' +
        '<div class="metric"><dt>' +
        esc(data.area.title) +
        "</dt><dd>" +
        esc(fmt(total)) +
        "</dd></div>" +
        '<div class="metric"><dt>Hotspots</dt><dd>' +
        esc(fmt(indexes.filter(function (index) { return F[index][5] >= 0.66; }).length)) +
        "</dd></div>" +
        "</dl>" +
        "<h4>Mayor riesgo en la carpeta</h4>" +
        dependencyList(indexes.slice(0, 8), "carpeta vacía") +
        "</div>";
      return;
    }

    var index = selected.index;
    var file = F[index];
    var section = sectionFor(index);
    var name = file[1];
    var dot = name.lastIndexOf(".");
    var extension = dot > 0 ? name.slice(dot + 1) : "—";
    var functions = metricValue(index, "number_of_functions");
    var hotspot = file[5] >= 0.66;

    inspector.innerHTML =
      '<div class="insp">' +
      '<div class="insp-path">' +
      esc(pathOf(index)) +
      "</div>" +
      '<div class="tags"><span class="tag">' +
      esc(extension) +
      '</span><span class="tag">' +
      esc(section.key) +
      "</span>" +
      (hotspot ? '<span class="tag bad">hotspot</span>' : "") +
      "</div>" +
      '<dl class="metrics">' +
      '<div class="metric"><dt>' +
      esc(data.area.title) +
      "</dt><dd>" +
      esc(fmt(file[4])) +
      "</dd></div>" +
      '<div class="metric"><dt>Complejidad</dt><dd>' +
      esc(fmt(file[6])) +
      "</dd></div>" +
      '<div class="metric"><dt>Churn</dt><dd>' +
      esc(fmt(file[7])) +
      " <small>commits</small></dd></div>" +
      '<div class="metric"><dt>Fan-in / out</dt><dd>' +
      esc(fmt(inc[index].length)) +
      " / " +
      esc(fmt(out[index].length)) +
      "</dd></div>" +
      (functions === null
        ? ""
        : '<div class="metric"><dt>Funciones</dt><dd>' +
          esc(fmt(functions)) +
          "</dd></div>") +
      "</dl>" +
      '<div class="risk-row"><span>Riesgo</span><b>' +
      pct(file[5]) +
      "/100</b></div>" +
      '<div class="risk-track"><div class="risk-fill" style="width:' +
      pct(file[5]) +
      '%"></div></div>' +
      "<h4>Depende de</h4>" +
      dependencyList(out[index], "sin dependencias conocidas") +
      "<h4>Usado por</h4>" +
      dependencyList(inc[index], "nadie lo importa") +
      cycleWarning(index) +
      "</div>";
  }

  function updateCrumbs() {
    var root = data.meta.root
      ? esc(data.meta.project) + ' <span class="sep">/</span> ' + esc(data.meta.root)
      : esc(data.meta.project);

    if (!selected) {
      crumbs.innerHTML = root;
      return;
    }

    var path = selected.kind === "file" ? pathOf(selected.index) : selected.path;
    var parts = path.split("/");
    crumbs.innerHTML = [esc(data.meta.project)]
      .concat(
        parts.map(function (part, index) {
          return index === parts.length - 1 ? "<b>" + esc(part) + "</b>" : esc(part);
        })
      )
      .join(' <span class="sep">/</span> ');
  }

  /* ------------------------------------------------------------------ *
   *  Tooltip
   * ------------------------------------------------------------------ */
  function showCellTooltip(index) {
    var file = F[index];
    tooltip.innerHTML =
      "<b>" +
      esc(file[1]) +
      "</b><br><span class=\"t-metrics\">" +
      esc(pathOf(index)) +
      "<br>" +
      esc(data.area.title) +
      " " +
      esc(fmt(file[4])) +
      " · riesgo " +
      pct(file[5]) +
      " · cx " +
      esc(fmt(file[6])) +
      " · churn " +
      esc(fmt(file[7])) +
      "</span>";
    tooltip.style.display = "block";
  }

  function showFolderTooltip(folder) {
    tooltip.innerHTML =
      "<b>" +
      esc(folderPath(folder)) +
      "</b><br><span class=\"t-metrics\">" +
      esc(fmt(Number(folder.dataset.n))) +
      " ficheros · " +
      esc(fmt(Number(folder.dataset.a))) +
      " " +
      esc(data.area.title.toLowerCase()) +
      "</span>";
    tooltip.style.display = "block";
  }

  function moveTooltip(event) {
    if (tooltip.style.display !== "block") return;
    var pad = 14;
    var x = event.clientX + pad;
    var y = event.clientY + pad;
    var rect = tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
    if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - pad;
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
  }

  function hideTooltip() {
    tooltip.style.display = "none";
  }

  /* ------------------------------------------------------------------ *
   *  Eventos
   * ------------------------------------------------------------------ */
  svg.addEventListener("click", function (event) {
    var cell = event.target.closest("rect[data-i]");
    if (cell) {
      selectFile(Number(cell.dataset.i));
      return;
    }
    var folder = event.target.closest(".folder");
    if (folder) {
      selectFolder(folderPath(folder));
      return;
    }
    clearSelection();
  });

  svg.addEventListener("mouseover", function (event) {
    var cell = event.target.closest("rect[data-i]");
    if (cell) {
      showCellTooltip(Number(cell.dataset.i));
      return;
    }
    var folder = event.target.closest(".folder");
    if (folder) {
      showFolderTooltip(folder);
      return;
    }
    hideTooltip();
  });

  svg.addEventListener("mousemove", moveTooltip);
  svg.addEventListener("mouseleave", hideTooltip);

  inspector.addEventListener("click", function (event) {
    var fileItem = event.target.closest("[data-file]");
    if (fileItem) {
      selectFile(Number(fileItem.dataset.file));
      return;
    }
    var folderItem = event.target.closest("[data-folder]");
    if (folderItem) selectFolder(folderItem.dataset.folder);
  });

  var lensButtons = document.querySelectorAll(".lens");
  for (var li = 0; li < lensButtons.length; li++) {
    lensButtons[li].addEventListener("click", function (event) {
      setLens(event.currentTarget.dataset.lens);
    });
  }

  if (metricSelect) {
    metricSelect.addEventListener("change", function () {
      metricKey = metricSelect.value;
      setLens("metric");
    });
  }

  var focusButtons = document.querySelectorAll(".finding[data-focus]");
  for (var fbi = 0; fbi < focusButtons.length; fbi++) {
    focusButtons[fbi].addEventListener("click", function (event) {
      var focus = event.currentTarget.dataset.focus;
      if (focus === "cycle" && data.cycles.length >= 2) {
        selectFile(data.cycles[0]);
        return;
      }
      var best = -1;
      for (var i = 0; i < N; i++) {
        if (best === -1 || F[i][5] > F[best][5]) best = i;
      }
      if (best !== -1) selectFile(best);
    });
  }

  searchInput.addEventListener("input", function () {
    query = searchInput.value;
    applySearch();
  });

  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && firstHit !== -1) {
      selectFile(firstHit);
      searchInput.blur();
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      query = "";
      searchInput.value = "";
      applySearch();
      clearSelection();
      searchInput.blur();
      hideTooltip();
      return;
    }
    if (
      event.key === "/" &&
      document.activeElement !== searchInput &&
      !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)
    ) {
      event.preventDefault();
      searchInput.focus();
    }
  });

  /* ------------------------------------------------------------------ *
   *  Arranque
   * ------------------------------------------------------------------ */
  applySearch();
  applyLens();
  if (data.default !== null && data.default !== undefined && cellByIndex[data.default]) {
    selectFile(data.default);
  } else {
    renderInspector();
    updateCrumbs();
  }
})();
