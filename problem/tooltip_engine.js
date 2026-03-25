(function() {
  const cache = {};
  const preview = document.getElementById('preview');
  const previewLabel = document.getElementById('preview-label');
  const previewTitle = document.getElementById('preview-title');
  const previewBody = document.getElementById('preview-body');
  const previewLink = document.getElementById('preview-link');
  if (!preview) return;
  let hideTimeout = null;
  let activeTouch = null;

  async function fetchPage(key) {
    if (cache[key]) return cache[key];
    try {
      const res = await fetch(key + '.html');
      if (!res.ok) throw new Error('fetch failed');
      const text = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const h1 = doc.querySelector('h1');
      const labelEl = doc.querySelector('.label, .breadcrumb');
      const paras = Array.from(doc.querySelectorAll('main p, .content p'))
        .filter(p => !p.classList.contains('thesis-lead') && !p.classList.contains('hidden-map'))
        .slice(0, 5);
      cache[key] = {
        label: labelEl ? labelEl.textContent.trim().split('→').pop().trim() : key,
        title: h1 ? h1.textContent.trim() : '',
        paragraphs: paras.map(p => p.textContent.trim()).filter(t => t.length > 10)
      };
    } catch(e) {
      cache[key] = { label: key, title: '', paragraphs: ['Loading...'] };
    }
    return cache[key];
  }

  function position(el) {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) return;
    const rect = el.getBoundingClientRect();
    const m = 12, pw = 360;
    let top = rect.bottom + m;
    let left = rect.left;
    if (left + pw > window.innerWidth - m) left = window.innerWidth - pw - m;
    if (left < m) left = m;
    const h = preview.offsetHeight || 200;
    if (top + h > window.innerHeight - m) top = rect.top - h - m;
    if (top < m) top = m;
    preview.style.top = top + 'px';
    preview.style.left = left + 'px';
  }

  async function show(el, key) {
    clearTimeout(hideTimeout);
    preview.classList.add('visible');
    previewLabel.textContent = '...';
    previewTitle.textContent = '';
    previewBody.innerHTML = '';
    previewLink.href = key + '.html';
    position(el);
    const data = await fetchPage(key);
    previewLabel.textContent = data.label;
    previewTitle.textContent = data.title;
    previewBody.innerHTML = data.paragraphs.map(p => `<p>${p}</p>`).join('');
    previewBody.scrollTop = 0;
    position(el);
  }

  function hide() {
    hideTimeout = setTimeout(() => {
      preview.classList.remove('visible');
      activeTouch = null;
    }, 220);
  }

  document.querySelectorAll('.tlink').forEach(el => {
    el.addEventListener('mouseenter', () => show(el, el.dataset.key));
    el.addEventListener('mouseleave', hide);

    el.addEventListener('click', e => {
      if (window.innerWidth > 768) {
        e.preventDefault();
        const url = el.dataset.key + '.html';
        if (e.metaKey || e.ctrlKey) {
          window.open(url, '_blank');
        } else {
          window.location.href = url;
        }
      }
    });

    el.addEventListener('touchend', e => {
      e.preventDefault();
      if (activeTouch === el.dataset.key && preview.classList.contains('visible')) {
        window.location.href = el.dataset.key + '.html';
      } else {
        activeTouch = el.dataset.key;
        show(el, el.dataset.key);
      }
    });
  });

  document.addEventListener('touchend', e => {
    if (!preview.contains(e.target) && !e.target.classList.contains('tlink')) {
      hide();
    }
  });

  preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
  preview.addEventListener('mouseleave', hide);

  // ── Edit mode ──────────────────────────────────────────────────────────────
  // Activated by ?edit=true in the URL. Handles Copy HTML cleanly by removing
  // itself from the DOM before serialising, so it never appears in the output.

  if (new URLSearchParams(window.location.search).get('edit') !== 'true') return;

  const bar = document.createElement('div');
  bar.id = '__edit-bar__';
  bar.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;gap:0.6rem;align-items:center;';

  const label = document.createElement('span');
  label.textContent = 'Edit mode';
  label.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:0.45rem;letter-spacing:0.1em;text-transform:uppercase;color:#999;';

  const btn = document.createElement('button');
  btn.textContent = 'Copy HTML';
  btn.style.cssText = 'font-family:"JetBrains Mono",monospace;font-size:0.45rem;letter-spacing:0.08em;text-transform:uppercase;background:#1a4a8a;color:#fff;border:none;padding:0.4rem 0.8rem;cursor:pointer;border-radius:2px;';

  btn.onclick = function() {
    // Strip contenteditable and edit styling before copying
    document.querySelectorAll('.content h1, .content p').forEach(function(el) {
      el.removeAttribute('contenteditable');
      el.style.borderBottom = '';
      el.style.outline = '';
    });
    // Remove bar from DOM so it doesn't appear in copied HTML
    bar.remove();
    // Also remove any stale hardcoded edit bars from previous copies
    document.querySelectorAll('[id="__edit-bar__"], style[data-edit]').forEach(n => n.remove());

    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    navigator.clipboard.writeText(html).then(function() {
      // Restore bar and editing
      document.body.appendChild(bar);
      btn.textContent = 'Copied!';
      setTimeout(function() { btn.textContent = 'Copy HTML'; }, 2000);
      applyEditable();
    }).catch(function() {
      document.body.appendChild(bar);
      applyEditable();
    });
  };

  bar.appendChild(label);
  bar.appendChild(btn);
  document.body.appendChild(bar);

  function applyEditable() {
    document.querySelectorAll('.content h1, .content p').forEach(function(el) {
      el.contentEditable = 'true';
      el.style.outline = 'none';
      el.style.borderBottom = '1px dashed #ccc';
      el.addEventListener('focus', function() { el.style.borderBottom = '1px dashed #1a4a8a'; });
      el.addEventListener('blur',  function() { el.style.borderBottom = '1px dashed #ccc'; });
    });
  }

  applyEditable();
})();
