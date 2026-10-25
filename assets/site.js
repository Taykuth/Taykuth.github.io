/* Strip chart under the name, the copy button and the language choice. No dependencies. */
(function () {
  "use strict";

  /* ---------- Strip chart ---------- */
  var canvas = document.getElementById("trace");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    var dark = window.matchMedia("(prefers-color-scheme: dark)");
    var POINTS = 480;          // 48 hours at 6-minute intervals
    var Y_MAX = 8;             // mm/s
    var THRESHOLD = 4.5;       // mm/s
    var data = makeSignal();
    var crossing = firstCrossing(data);
    var progress = reduce.matches ? 1 : 0;
    var started = false;

    function rand(seed) {     // mulberry32, so the trace is the same on every load
      return function () {
        seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
        var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function makeSignal() {
      var r = rand(42), out = [], drift = 0;
      for (var i = 0; i < POINTS; i++) {
        var x = i / (POINTS - 1);
        var shift = 0.18 * Math.sin(x * Math.PI * 12);            // load changes between shifts
        var wear = x > 0.6 ? Math.pow((x - 0.6) / 0.4, 2.2) * 5.1 : 0;  // bearing wear after 60 %
        drift = drift * 0.92 + (r() - 0.5) * 0.22;
        var spike = r() > 0.985 ? r() * 0.9 : 0;
        out.push(Math.max(0.3, 2.1 + shift + drift + (r() - 0.5) * 0.35 + spike + wear));
      }
      return out;
    }

    function firstCrossing(d) {
      for (var i = 1; i < d.length; i++) {
        if (d[i] >= THRESHOLD && d[i - 1] < THRESHOLD && i / d.length > 0.6) return i;
      }
      return -1;
    }

    function css(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function draw() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      var ink = css("--ink"), steel = css("--steel"), grid = css("--grid"),
          petrol = css("--petrol"), signal = css("--signal");
      var font = '500 12px "Archivo Variable", Archivo, Arial, sans-serif';
      var padL = w < 520 ? 34 : 48, padR = w < 520 ? 14 : 28, padT = 18, padB = 26;
      var pw = w - padL - padR, ph = h - padT - padB;
      var X = function (i) { return padL + (i / (POINTS - 1)) * pw; };
      var Y = function (v) { return padT + ph - (v / Y_MAX) * ph; };

      // Chart paper: hour lines every 6 h, value lines every 2 mm/s
      ctx.lineWidth = 1;
      ctx.strokeStyle = grid;
      ctx.beginPath();
      for (var g = 0; g <= 8; g++) {
        var gx = Math.round(padL + (g / 8) * pw) + 0.5;
        ctx.moveTo(gx, padT); ctx.lineTo(gx, padT + ph);
      }
      for (var v = 0; v <= Y_MAX; v += 2) {
        var gy = Math.round(Y(v)) + 0.5;
        ctx.moveTo(padL, gy); ctx.lineTo(padL + pw, gy);
      }
      ctx.stroke();

      // Axis labels
      ctx.font = font;
      ctx.fillStyle = steel;
      ctx.textBaseline = "middle";
      ctx.textAlign = "right";
      for (var t = 0; t <= Y_MAX; t += 2) ctx.fillText(String(t), padL - 8, Y(t));
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      ctx.fillText(canvas.dataset.yLabel || "", padL + 6, padT + 12);
      var hours = canvas.dataset.hours || "h";
      ctx.textAlign = "left";
      ctx.fillText("−48 " + hours, padL, h - 7);
      ctx.textAlign = "center";
      ctx.fillText("−24 " + hours, padL + pw / 2, h - 7);
      ctx.textAlign = "right";
      ctx.fillText(canvas.dataset.now || "now", padL + pw, h - 7);

      // Threshold
      var ty = Math.round(Y(THRESHOLD)) + 0.5;
      ctx.strokeStyle = signal;
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(padL, ty); ctx.lineTo(padL + pw, ty); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = signal;
      ctx.textAlign = "left";
      ctx.font = '600 12px "Archivo Variable", Archivo, Arial, sans-serif';
      ctx.fillText((canvas.dataset.threshold || "") + "  " + String(THRESHOLD).replace(".", document.documentElement.lang === "tr" ? "," : "."), padL + 6, ty - 7);

      // Trace up to the current progress
      var last = Math.max(1, Math.floor(progress * (POINTS - 1)));
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.75;
      ctx.strokeStyle = petrol;
      ctx.beginPath();
      for (var i = 0; i <= last; i++) {
        var px = X(i), py = Y(data[i]);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        if (crossing > 0 && i === crossing) { ctx.stroke(); ctx.strokeStyle = ink; ctx.beginPath(); ctx.moveTo(px, py); }
      }
      ctx.stroke();

      // Alert marker once the trace has crossed the threshold
      if (crossing > 0 && last >= crossing) {
        var cx = X(crossing), cy = Y(THRESHOLD);
        ctx.fillStyle = signal;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 7, cy); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 7, cy);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = ink; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(Math.round(cx) + 0.5, cy + 8); ctx.lineTo(Math.round(cx) + 0.5, padT + ph); ctx.stroke();
      }
    }

    function animate(t0) {
      function step(t) {
        progress = Math.min(1, (t - t0) / 2200);
        draw();
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function start() {
      if (started) return;
      started = true;
      if (reduce.matches) { progress = 1; draw(); return; }
      requestAnimationFrame(function (t) { animate(t); });
    }

    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); start(); });
    else start();
    setTimeout(start, 600);

    if (window.ResizeObserver) new ResizeObserver(function () { draw(); }).observe(canvas);
    else window.addEventListener("resize", draw);
    var onScheme = function () { draw(); };
    if (dark.addEventListener) dark.addEventListener("change", onScheme); else if (dark.addListener) dark.addListener(onScheme);
  }

  /* ---------- Copy e-mail ---------- */
  document.querySelectorAll("button.copy").forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () {
        btn.textContent = btn.getAttribute("data-done");
        setTimeout(function () { btn.textContent = label; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { selectEmail(); });
      } else {
        selectEmail();
      }
    });
  });

  function selectEmail() {
    var el = document.querySelector(".email");
    if (!el || !window.getSelection) return;
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  /* ---------- Language choice ---------- */
  document.querySelectorAll("[data-lang]").forEach(function (a) {
    a.addEventListener("click", function () {
      try { localStorage.setItem("lang-choice", a.getAttribute("data-lang")); } catch (e) { /* storage blocked */ }
    });
  });
  try {
    if (!localStorage.getItem("lang-choice") && document.documentElement.lang === "tr" && document.referrer.indexOf(location.host) === -1) {
      // A visitor who lands on /tr/ directly has chosen Turkish.
      localStorage.setItem("lang-choice", "tr");
    }
  } catch (e) { /* storage blocked */ }
})();
