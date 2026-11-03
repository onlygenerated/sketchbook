// Shared overlay for every sketch: back link, title, save-PNG button and an
// interaction hint from meta.json. Fades out when idle so the art is unobstructed.
(() => {
  const shell = document.createElement('div');
  shell.className = 'shell';
  shell.innerHTML = `
    <div class="shell-bar">
      <a class="shell-back" href="../../" aria-label="Back to sketchbook">&larr; sketchbook</a>
      <span class="shell-title"></span>
      <span class="shell-spacer"></span>
      <button class="shell-save" type="button" aria-label="Save a PNG of the canvas">save png</button>
    </div>
    <div class="shell-hint"><span></span></div>`;

  // Keep taps on the overlay controls from reaching the sketch underneath.
  for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click']) {
    shell.addEventListener(type, (e) => {
      if (e.target.closest('a, button')) e.stopPropagation();
    });
  }

  const slug = location.pathname.split('/').filter(Boolean).pop() || 'sketch';

  shell.querySelector('.shell-save').addEventListener('click', () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${slug}_${stamp}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }, 'image/png');
  });

  fetch('meta.json')
    .then((r) => (r.ok ? r.json() : {}))
    .then((meta) => {
      const num = parseInt(slug, 10);
      const title = meta.title || slug;
      shell.querySelector('.shell-title').textContent = Number.isFinite(num)
        ? `${String(num).padStart(3, '0')}  ${title}`
        : title;
      shell.querySelector('.shell-hint span').textContent = meta.interaction || '';
    })
    .catch(() => {});

  let timer;
  const wake = () => {
    shell.classList.remove('idle');
    clearTimeout(timer);
    timer = setTimeout(() => shell.classList.add('idle'), 2500);
  };
  for (const type of ['pointermove', 'pointerdown', 'keydown']) {
    window.addEventListener(type, wake, { passive: true });
  }

  const mount = () => { document.body.appendChild(shell); wake(); };
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
