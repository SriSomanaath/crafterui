(() => {
  const root = document.querySelector('section.animate-fade-in');
  if (!root) return 'NO_PREVIEW';
  const cv = document.createElement('canvas'); cv.width = cv.height = 1;
  const cx = cv.getContext('2d', { willReadFrequently: true });
  const rgb = (css) => { cx.clearRect(0,0,1,1); cx.fillStyle = '#00ff00';
    cx.fillStyle = css; if (cx.fillStyle === '#00ff00' && css !== '#00ff00') return null;
    cx.fillRect(0,0,1,1); const d = cx.getImageData(0,0,1,1).data;
    return d[3] < 128 ? null : { l: (0.2126*d[0] + 0.7152*d[1] + 0.0722*d[2]) / 255 }; };
  const out = [];
  for (const el of root.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width * r.height < 5000) continue;
    const cs = getComputedStyle(el);
    const b = rgb(cs.backgroundColor);
    if (b && b.l > 0.75) out.push({ why: 'LIGHT_SURFACE_IN_DARK', cls: (el.className.baseVal ?? el.className ?? '').toString().slice(0,70), bg: cs.backgroundColor, area: Math.round(r.width*r.height) });
    const txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (txt && b) { const f = rgb(cs.color);
      if (f && Math.abs(b.l - f.l) < 0.15) out.push({ why: 'LOW_CONTRAST_TEXT', cls: (el.className.baseVal ?? el.className ?? '').toString().slice(0,70), bg: cs.backgroundColor, fg: cs.color }); }
  }
  return JSON.stringify(out.slice(0, 5));
})()
