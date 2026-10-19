/* engine.js — frame-exact 2D/WebGL compositor for the film.
 * Everything is a pure function of time t (seconds). One 1920×1080 canvas.
 *   FX     — WebGL2 effects: photo grade, dot-matrix "model vision", thermal/spectral remap, grain.
 *   Frames — clip frame loader (JPEG sequences extracted at 24 fps), cached.
 *   Draw   — backgrounds (black grid / cream paper), tiles, labels, type helpers.
 */
(function () {
  'use strict';
  const W = (window.FILM_SIZE || [1920, 1080])[0], H = (window.FILM_SIZE || [1920, 1080])[1]; // set window.FILM_SIZE before engine.js for 9:16 [1080,1920] or 1:1 [1080,1080]

  /* ---------------- palette ---------------- */
  const P = {
    black: '#050505', ink: '#0B0B0C', panel: '#151315',
    cream: '#EFE8DE', paper2: '#E6DDD0', creamInk: '#1A1714',
    pink: '#F49AC8', magenta: '#E8559B', blue: '#3F6FE8', apricot: '#F7B27A',
    orange: '#F07A2E', butter: '#F6E27A', mint: '#7FE8C8', lime: '#E4F58C',
    gridDot: '#262626', gridLine: '#2E2E2E', creamDot: '#D3C8B8',
  };
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };

  /* ---------------- math / easing ---------------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const prog = (t, t0, t1) => clamp((t - t0) / (t1 - t0));
  const E = {
    lin: (x) => x,
    out3: (x) => 1 - Math.pow(1 - x, 3),
    out5: (x) => 1 - Math.pow(1 - x, 5),
    in3: (x) => x * x * x,
    inOut3: (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    expo: (x) => x === 1 ? 1 : 1 - Math.pow(2, -10 * x),
    inExpo: (x) => x === 0 ? 0 : Math.pow(2, 10 * x - 10),
  };
  // deterministic PRNG
  function rng(seed) { let s = (seed * 2654435761) >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

  /* ---------------- WebGL2 FX ---------------- */
  const glc = document.createElement('canvas'); glc.width = W; glc.height = H;
  const gl = glc.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true, antialias: false });
  if (!gl) throw new Error('WebGL2 unavailable');
  const VS = `#version 300 es
  in vec2 p; out vec2 uv; void main(){ uv = p*0.5+0.5; uv.y = 1.0-uv.y; gl_Position = vec4(p,0,1); }`;
  const FS = `#version 300 es
  precision highp float;
  in vec2 uv; out vec4 o;
  uniform sampler2D tex; uniform vec2 res; uniform vec2 texRes; uniform vec4 crop; // crop: x,y,w,h in tex UV
  uniform float dots, thermal, grain, seed, cell, expo, sat, contrast, alpha, blurLod, dotsLive;
  uniform float sweep, sweepSoft, dotsInv, dotsGain, dotsBias, sweepAxis;
  uniform vec3 cBg, cFill, cRing, cTiny;
  uniform vec3 th0, th1, th2, th3, th4, th5, th6;
  float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
  vec3 sampleTex(vec2 u, float lod){ return textureLod(tex, crop.xy + u*crop.zw, lod).rgb; }
  float luma(vec3 c){ return dot(c, vec3(0.2126,0.7152,0.0722)); }
  vec3 grade(vec3 c){ c *= expo; c = (c-0.5)*contrast+0.5; float l = luma(c); c = mix(vec3(l), c, sat); return clamp(c,0.0,1.0); }
  vec3 thermalMap(float x){
    x = clamp(x,0.0,1.0);
    if(x<0.16) return mix(th0,th1,x/0.16);
    if(x<0.34) return mix(th1,th2,(x-0.16)/0.18);
    if(x<0.50) return mix(th2,th3,(x-0.34)/0.16);
    if(x<0.66) return mix(th3,th4,(x-0.50)/0.16);
    if(x<0.84) return mix(th4,th5,(x-0.66)/0.18);
    return mix(th5,th6,(x-0.84)/0.16);
  }
  void main(){
    vec2 px = uv*res;
    // source texels per output pixel (for mip selection)
    float tpp = max(texRes.x*crop.z/res.x, texRes.y*crop.w/res.y);
    vec3 photo = grade(sampleTex(uv, log2(max(tpp,1.0))*0.5 + blurLod));
    vec3 col = photo;
    float sc = (sweepAxis > 0.5 ? uv.y : uv.x);
    float msk = 1.0 - smoothstep(sweep - sweepSoft, sweep, sc);
    if(thermal > 0.0){
      float l = luma(grade(sampleTex(uv, log2(max(tpp,1.0)) + 2.5 + blurLod)));
      vec3 th = thermalMap(smoothstep(0.03,0.92,l));
      col = mix(col, th, thermal*msk);
    }
    if(dots > 0.0){
      vec2 g = floor(px/cell); vec2 cc = (g+0.5)*cell; vec2 cuv = cc/res;
      float lod = log2(max(cell*tpp,1.0));
      float l = luma(grade(sampleTex(cuv, lod)));
      if(dotsInv > 0.5) l = 1.0 - l;
      l = clamp(l*dotsGain + dotsBias, 0.0, 1.0);
      float h = hash(g + seed*dotsLive);
      float d = length(px-cc);
      vec3 dcol = cBg; float a = 0.0;
      float L = l + (h-0.5)*0.08;
      if(L > 0.58){ float r = cell*mix(0.30,0.48,smoothstep(0.58,0.95,L)); a = 1.0-smoothstep(r-1.0,r+0.6,d); dcol = cFill; }
      else if(L > 0.34){ float r = cell*0.34; float w = max(1.2, cell*0.07); a = 1.0-smoothstep(w-0.6,w+0.6,abs(d-r)); dcol = cRing; }
      else if(L > 0.16){ float r = cell*mix(0.07,0.12,h); a = 1.0-smoothstep(r-0.6,r+0.6,d); dcol = cTiny; }
      vec3 dm = mix(cBg, dcol, a);
      col = mix(col, dm, dots*msk);
    }
    if(grain > 0.0){ float n = hash(px + vec2(seed*17.0, seed*31.0)) - 0.5; col += n*grain; }
    o = vec4(clamp(col,0.0,1.0), alpha);
  }`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  const prog_ = gl.createProgram(); gl.attachShader(prog_, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog_, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog_);
  if (!gl.getProgramParameter(prog_, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog_));
  gl.useProgram(prog_);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog_, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['tex', 'res', 'texRes', 'crop', 'dots', 'thermal', 'grain', 'seed', 'cell', 'expo', 'sat', 'contrast', 'alpha', 'blurLod', 'dotsLive', 'cBg', 'cFill', 'cRing', 'cTiny', 'sweep', 'sweepSoft', 'dotsInv', 'dotsGain', 'dotsBias', 'sweepAxis', 'th0', 'th1', 'th2', 'th3', 'th4', 'th5', 'th6'].forEach((n) => U[n] = gl.getUniformLocation(prog_, n));
  const TH = ['#141A5C', '#3F6FE8', '#9A6BE0', '#F49AC8', '#F07A2E', '#F6E27A', '#FFF6DA'];
  TH.forEach((c, i) => gl.uniform3fv(U['th' + i], hex(c)));
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  let lastSrc = null;

  /** Render `src` (img/canvas) with effects into ctx at rect. o: {crop:[x,y,w,h] UV, dots, thermal, grain, cell, expo, sat, contrast, alpha, blur, seed, dotsBg, dotsFill, dotsRing, dotsTiny} */
  function fx(ctx, src, rect, o = {}) {
    const [dx, dy, dw, dh] = rect.map(Math.round);
    if (dw <= 0 || dh <= 0) return;
    if (src !== lastSrc) {
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
      gl.generateMipmap(gl.TEXTURE_2D); lastSrc = src;
    }
    const sw = src.naturalWidth || src.width, shh = src.naturalHeight || src.height;
    // default crop = cover-fit of rect aspect into source
    let crop = o.crop;
    if (!crop) {
      const ra = dw / dh, sa = sw / shh;
      if (ra > sa) { const h = sa / ra; crop = [0, (1 - h) / 2, 1, h]; } else { const w = ra / sa; crop = [(1 - w) / 2, 0, w, 1]; }
    }
    if (o.zoom && o.zoom !== 1) { const z = o.zoom, fx_ = o.focus || [0.5, 0.5]; const nw = crop[2] / z, nh = crop[3] / z; crop = [crop[0] + (crop[2] - nw) * fx_[0], crop[1] + (crop[3] - nh) * fx_[1], nw, nh]; }
    gl.viewport(0, 0, dw, dh);
    gl.uniform1i(U.tex, 0); gl.uniform2f(U.res, dw, dh); gl.uniform2f(U.texRes, sw, shh); gl.uniform4f(U.crop, ...crop);
    gl.uniform1f(U.dots, o.dots || 0); gl.uniform1f(U.thermal, o.thermal || 0); gl.uniform1f(U.grain, o.grain ?? 0.06);
    gl.uniform1f(U.seed, o.seed || 0); gl.uniform1f(U.cell, o.cell || 22); gl.uniform1f(U.expo, o.expo ?? 1); gl.uniform1f(U.sat, o.sat ?? 1);
    gl.uniform1f(U.contrast, o.contrast ?? 1); gl.uniform1f(U.alpha, 1); gl.uniform1f(U.blurLod, o.blur || 0); gl.uniform1f(U.dotsLive, o.dotsLive ?? 0);
    gl.uniform1f(U.sweep, o.sweep ?? 2); gl.uniform1f(U.sweepSoft, o.sweepSoft ?? 0.04); gl.uniform1f(U.sweepAxis, o.sweepAxis === 'y' ? 1 : 0);
    gl.uniform1f(U.dotsInv, o.dotsInv ? 1 : 0); gl.uniform1f(U.dotsGain, o.dotsGain ?? 1); gl.uniform1f(U.dotsBias, o.dotsBias ?? 0);
    gl.uniform3fv(U.cBg, hex(o.dotsBg || P.panel)); gl.uniform3fv(U.cFill, hex(o.dotsFill || P.pink)); gl.uniform3fv(U.cRing, hex(o.dotsRing || P.pink)); gl.uniform3fv(U.cTiny, hex(o.dotsTiny || P.mint));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
    if (o.radius) { roundRect(ctx, dx, dy, dw, dh, o.radius); ctx.clip(); }
    ctx.drawImage(glc, 0, H - dh, dw, dh, dx, dy, dw, dh);
    ctx.restore();
  }

  /* ---------------- frames ---------------- */
  const cache = new Map(); const order = [];
  function loadImg(url) {
    if (cache.has(url)) return cache.get(url);
    const p = new Promise((res, rej) => { const im = new Image(); im.onload = () => im.decode().then(() => res(im), () => res(im)); im.onerror = () => rej(new Error('img ' + url)); im.src = url; });
    cache.set(url, p); order.push(url);
    while (order.length > 260) { cache.delete(order.shift()); }
    return p;
  }
  const Frames = {
    meta: {}, // id -> {dir, frames, fps}
    async get(id, sec) {
      const m = Frames.meta[id]; if (!m) throw new Error('no clip ' + id);
      const i = clamp(Math.floor(sec * m.fps + 1e-6), 0, m.frames - 1);
      return loadImg(`${m.dir}/f_${String(i).padStart(4, '0')}.jpg`);
    },
    img: loadImg,
  };

  /* ---------------- drawing helpers ---------------- */
  function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  function bgBlack(ctx, o = {}) {
    ctx.fillStyle = P.black; ctx.fillRect(0, 0, W, H);
    const s = o.spacing || 60, ox = ((o.ox || 0) % s + s) % s, oy = ((o.oy || 0) % s + s) % s;
    ctx.fillStyle = o.dot || P.gridDot;
    for (let y = oy - s; y < H + s; y += s) for (let x = ox - s; x < W + s; x += s) ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
    if (o.lines !== false) {
      ctx.save(); ctx.strokeStyle = o.line || P.gridLine; ctx.lineWidth = 1; ctx.setLineDash([3, 7]); ctx.globalAlpha = o.lineAlpha ?? 1;
      const cols = o.cols || [5, 13, 21, 27], rows = o.rows || [3, 9, 15];
      for (const c of cols) { const x = Math.round(c * s + ox) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (const r of rows) { const y = Math.round(r * s + oy) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.restore();
    }
  }
  function bgCream(ctx, o = {}) {
    ctx.fillStyle = P.cream; ctx.fillRect(0, 0, W, H);
    const s = o.spacing || 60, ox = ((o.ox || 0) % s + s) % s, oy = ((o.oy || 0) % s + s) % s;
    ctx.fillStyle = o.dot || P.creamDot;
    for (let y = oy - s; y < H + s; y += s) for (let x = ox - s; x < W + s; x += s) ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
  }

  // grain overlay (deterministic) — prebuilt noise tiles
  const NT = []; for (let k = 0; k < 6; k++) { const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); const id = x.createImageData(512, 512); const r = rng(k + 11); for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } x.putImageData(id, 0, 0); NT.push(c); }
  function grain(ctx, t, amt = 0.07, mode = 'overlay') {
    const f = Math.floor(t * 24); const c = NT[f % NT.length]; const r = rng(f + 3);
    ctx.save(); ctx.globalCompositeOperation = mode; ctx.globalAlpha = amt;
    const ox = -Math.floor(r() * 512), oy = -Math.floor(r() * 512);
    for (let y = oy; y < H; y += 512) for (let x = ox; x < W; x += 512) ctx.drawImage(c, x, y);
    ctx.restore();
  }

  // small square corner handles on a rect (ref1/2)
  function handles(ctx, x, y, w, h, o = {}) {
    const s = o.size || 8, c = o.color || P.mint; ctx.save(); ctx.fillStyle = c; ctx.globalAlpha = o.alpha ?? 1;
    const pts = o.corners || [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
    for (const [px, py] of pts) ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
    ctx.restore();
  }

  // mono label chip(s), anchored at (x,y) top-left; lines: array of strings
  function label(ctx, x, y, lines, o = {}) {
    const fs = o.size || 22, pad = o.pad || 8, lh = fs + 2 * pad + 2;
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1;
    ctx.font = `${o.weight || 500} ${fs}px ${o.font || '"JetBrains Mono", monospace'}`; ctx.textBaseline = 'middle';
    let yy = y;
    lines.forEach((s, i) => {
      const w = Math.ceil(ctx.measureText(s).width) + pad * 2;
      const xx = o.align === 'right' ? x - w : x;
      const style = (o.styles && o.styles[i]) || o.style || 'dark';
      if (style === 'dark') { ctx.fillStyle = 'rgba(18,18,20,0.92)'; ctx.fillRect(xx, yy, w, lh - 2); ctx.fillStyle = '#F2F2F2'; }
      else if (style === 'outline') { ctx.fillStyle = 'rgba(10,10,10,0.85)'; ctx.fillRect(xx, yy, w, lh - 2); ctx.strokeStyle = P.mint; ctx.lineWidth = 2; ctx.strokeRect(xx + 1, yy + 1, w - 2, lh - 4); ctx.fillStyle = '#F2F2F2'; }
      else if (style === 'lime') { ctx.fillStyle = P.lime; ctx.fillRect(xx, yy, w, lh - 2); ctx.fillStyle = '#141414'; }
      else if (style === 'plain') { ctx.fillStyle = o.color || '#F2F2F2'; }
      else if (style === 'plainDark') { ctx.fillStyle = o.color || P.creamInk; }
      ctx.fillText(s, xx + pad, yy + (lh - 2) / 2 + 1);
      yy += lh;
    });
    ctx.restore();
    return yy;
  }

  // text with tracking, optional per-character reveal (0..1), blur, alpha
  function text(ctx, s, x, y, o = {}) {
    const size = o.size || 96;
    ctx.save();
    ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 600} ${size}px ${o.font || '"Inter Tight", sans-serif'}`;
    ctx.textBaseline = o.baseline || 'alphabetic';
    ctx.fillStyle = o.color || '#F4F1EC';
    ctx.globalAlpha = o.alpha ?? 1;
    if (o.blur) ctx.filter = `blur(${o.blur}px)`;
    const tr = (o.tracking || 0) * size; // em tracking
    // measure with tracking
    const chars = [...s]; const widths = chars.map((c) => ctx.measureText(c).width);
    const total = widths.reduce((a, b) => a + b, 0) + tr * (chars.length - 1);
    let xx = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
    const rev = o.reveal ?? 1; const n = chars.length;
    chars.forEach((c, i) => {
      const k = o.revealMode === 'none' ? 1 : clamp(rev * (n + (o.revealSoft || 3)) - i, 0, 1);
      if (k > 0) {
        ctx.save(); ctx.globalAlpha = (o.alpha ?? 1) * (o.revealFade === false ? (k > 0 ? 1 : 0) : k);
        const dy = (1 - E.out3(k)) * (o.rise || 0);
        ctx.fillText(c, xx, y + dy); ctx.restore();
      }
      xx += widths[i] + tr;
    });
    ctx.restore();
    return total;
  }
  function measure(ctx, s, o = {}) {
    const size = o.size || 96; ctx.save(); ctx.font = `${o.italic ? 'italic ' : ''}${o.weight || 600} ${size}px ${o.font || '"Inter Tight", sans-serif'}`;
    const chars = [...s]; const w = chars.reduce((a, c) => a + ctx.measureText(c).width, 0) + (o.tracking || 0) * size * (chars.length - 1); ctx.restore(); return w;
  }

  // dashed orbit / circle arcs
  function circle(ctx, cx, cy, r, o = {}) {
    ctx.save(); ctx.strokeStyle = o.color || '#3A3A3A'; ctx.lineWidth = o.width || 1.5; ctx.globalAlpha = o.alpha ?? 1;
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath(); ctx.arc(cx, cy, r, o.a0 || 0, o.a1 ?? Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  window.ENG = { W, H, P, clamp, lerp, prog, E, rng, fx, Frames, bgBlack, bgCream, grain, handles, label, text, measure, circle, roundRect };
})();
