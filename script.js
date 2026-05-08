// script.js — Scroll Reveal + Generative Topography
//
// The terrain is a heightmap generated from actual Dirt source code.
// Each character's char code contributes to the elevation at that grid
// cell, smoothed with simple Perlin-like noise interpolation.
// Rendered as a 3D-perspective wireframe mesh with elevation-based
// coloring from the portfolio's palette.


// ═══════════════════════════════════════════════════════════════════════
// 1. SCROLL REVEAL
// ═══════════════════════════════════════════════════════════════════════

var revealObserver = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal").forEach(function (el) {
  revealObserver.observe(el);
});


// ═══════════════════════════════════════════════════════════════════════
// 2. GENERATIVE TOPOGRAPHY
// ═══════════════════════════════════════════════════════════════════════

(function terrain() {
  var canvas = document.getElementById("terrainCanvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");

  // ── Dirt source code seed ──────────────────────────────────────────
  // This actual Dirt code seeds the terrain — the heightmap is shaped
  // by the characters in this program.
  var CODE =
    'let paddleY = 150;\n' +
    'let ballX = 320;\n' +
    'let ballY = 180;\n' +
    'let dx = 3;\n' +
    'let dy = 2;\n\n' +
    'fn update() {\n' +
    '  clear();\n' +
    '  fillColor("#22c55e");\n' +
    '  rect(20, paddleY, 12, 60);\n' +
    '  circle(ballX, ballY, 8);\n' +
    '  ballX = ballX + dx;\n' +
    '  ballY = ballY + dy;\n' +
    '  if (ballY > 350) { dy = 0 - dy; }\n' +
    '  if (ballY < 10)  { dy = 0 - dy; }\n' +
    '  if (ballX > 630) { dx = 0 - dx; }\n' +
    '  if (ballX < 30)  { dx = 0 - dx; }\n' +
    '}\n\n' +
    'onUpdate(update);';

  // ── Grid dimensions ────────────────────────────────────────────────
  var COLS = 60;
  var ROWS = 60;

  // ── Generate heightmap from code characters ────────────────────────
  // Each character's ASCII value becomes a raw elevation, then we
  // smooth with multiple averaging passes for natural-looking terrain.
  var heightmap = [];
  var codeLen = CODE.length;

  for (var r = 0; r < ROWS; r++) {
    heightmap[r] = [];
    for (var c = 0; c < COLS; c++) {
      // sample character from the code string, wrapping around
      var idx = (r * COLS + c) % codeLen;
      var charVal = CODE.charCodeAt(idx);

      // mix in position-based variation so it's not purely repetitive
      var posNoise = Math.sin(r * 0.3 + c * 0.2) * 20 +
                     Math.cos(r * 0.15 - c * 0.25) * 15 +
                     Math.sin((r + c) * 0.1) * 10;

      heightmap[r][c] = (charVal - 30) * 0.4 + posNoise;
    }
  }

  // Smooth the heightmap — average each cell with its neighbors.
  // Run multiple passes for soft, rolling hills.
  function smooth(map, passes) {
    for (var p = 0; p < passes; p++) {
      var next = [];
      for (var r = 0; r < ROWS; r++) {
        next[r] = [];
        for (var c = 0; c < COLS; c++) {
          var sum = map[r][c];
          var count = 1;

          // sample all 8 neighbors if they exist
          for (var dr = -1; dr <= 1; dr++) {
            for (var dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              var nr = r + dr;
              var nc = c + dc;
              if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
                sum += map[nr][nc];
                count++;
              }
            }
          }
          next[r][c] = sum / count;
        }
      }
      map = next;
    }
    return map;
  }

  heightmap = smooth(heightmap, 5);

  // Normalize heights to 0–1 range for consistent coloring
  var minH = Infinity, maxH = -Infinity;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (heightmap[r][c] < minH) minH = heightmap[r][c];
      if (heightmap[r][c] > maxH) maxH = heightmap[r][c];
    }
  }
  var range = maxH - minH || 1;
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      heightmap[r][c] = (heightmap[r][c] - minH) / range;
    }
  }

  // ── Color palette — elevation-based ────────────────────────────────
  // Deep valleys are dark indigo, mid-range is sage/sky, peaks are coral/amber.
  // Matches the portfolio's paint splatter palette.
  function heightColor(h) {
    // 5-stop gradient: indigo → lavender → sage → coral → amber
    var stops = [
      { pos: 0.0, r: 26,  g: 26,  b: 58  },  // deep indigo
      { pos: 0.25, r: 74,  g: 58,  b: 140 },  // dark lavender
      { pos: 0.45, r: 74,  g: 144, b: 120 },  // teal-sage
      { pos: 0.7,  r: 232, g: 99,  b: 74  },  // coral
      { pos: 1.0,  r: 242, g: 169, b: 59  },  // amber peak
    ];

    // find which two stops h falls between
    var lo = stops[0], hi = stops[stops.length - 1];
    for (var i = 0; i < stops.length - 1; i++) {
      if (h >= stops[i].pos && h <= stops[i + 1].pos) {
        lo = stops[i];
        hi = stops[i + 1];
        break;
      }
    }

    // lerp between the two stops
    var t = (h - lo.pos) / (hi.pos - lo.pos || 1);
    var cr = Math.round(lo.r + (hi.r - lo.r) * t);
    var cg = Math.round(lo.g + (hi.g - lo.g) * t);
    var cb = Math.round(lo.b + (hi.b - lo.b) * t);

    return "rgb(" + cr + "," + cg + "," + cb + ")";
  }

  // ── Mouse interaction — shift camera angle ─────────────────────────
  var mouseX = 0.5, mouseY = 0.5; // normalized 0–1

  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width;
    mouseY = (e.clientY - rect.top)  / rect.height;
  });

  canvas.addEventListener("mouseleave", function () {
    // ease back to center when mouse leaves
    mouseX = 0.5;
    mouseY = 0.5;
  });

  // ── Isometric projection ───────────────────────────────────────────
  // Projects a 3D grid point (col, row, elevation) to 2D screen coords.
  // The rotation angle shifts slowly over time + responds to mouse.
  function project(col, row, h, time) {
    // slow auto-rotation + mouse-driven tilt
    var angle = -0.6 + Math.sin(time * 0.0003) * 0.15 + (mouseX - 0.5) * 0.3;
    var tilt  = 0.55 + (mouseY - 0.5) * 0.15;

    // center the grid around origin
    var x3d = (col - COLS / 2) * 6;
    var z3d = (row - ROWS / 2) * 6;
    var y3d = -h * 80; // elevation (negative = up)

    // rotate around Y axis
    var cosA = Math.cos(angle);
    var sinA = Math.sin(angle);
    var rx = x3d * cosA - z3d * sinA;
    var rz = x3d * sinA + z3d * cosA;

    // perspective projection with tilt
    var scale = 600 / (600 + rz * tilt);
    var sx = rx * scale;
    var sy = (y3d + rz * tilt * 0.4) * scale;

    return { x: sx, y: sy, z: rz };
  }

  // ── Render loop ────────────────────────────────────────────────────
  function render(time) {
    // size canvas to its container
    var w = canvas.parentElement.clientWidth;
    var h = canvas.parentElement.clientHeight;
    if (h < 420) h = 420;

    var dpr = window.devicePixelRatio || 1;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width  = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // dark background
    ctx.fillStyle = "#0f0e1a";
    ctx.fillRect(0, 0, w, h);

    var cx = w / 2;
    var cy = h / 2 + 30;

    // Build all quads (grid cells) with their average depth for sorting
    var quads = [];

    for (var r = 0; r < ROWS - 1; r++) {
      for (var c = 0; c < COLS - 1; c++) {
        // four corners of this grid cell
        var h00 = heightmap[r][c];
        var h10 = heightmap[r][c + 1];
        var h01 = heightmap[r + 1][c];
        var h11 = heightmap[r + 1][c + 1];

        var p00 = project(c,     r,     h00, time);
        var p10 = project(c + 1, r,     h10, time);
        var p01 = project(c,     r + 1, h01, time);
        var p11 = project(c + 1, r + 1, h11, time);

        // average height for coloring
        var avgH = (h00 + h10 + h01 + h11) / 4;
        // average depth for painter's algorithm sorting
        var avgZ = (p00.z + p10.z + p01.z + p11.z) / 4;

        quads.push({
          pts: [p00, p10, p11, p01],
          h: avgH,
          z: avgZ,
        });
      }
    }

    // Sort back-to-front (painter's algorithm)
    quads.sort(function (a, b) { return b.z - a.z; });

    // Draw each quad
    quads.forEach(function (q) {
      ctx.beginPath();
      ctx.moveTo(cx + q.pts[0].x, cy + q.pts[0].y);
      ctx.lineTo(cx + q.pts[1].x, cy + q.pts[1].y);
      ctx.lineTo(cx + q.pts[2].x, cy + q.pts[2].y);
      ctx.lineTo(cx + q.pts[3].x, cy + q.pts[3].y);
      ctx.closePath();

      // filled face colored by elevation
      ctx.fillStyle = heightColor(q.h);
      ctx.fill();

      // subtle wireframe edges for that topographic map feel
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
})();
