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

  function bindTlink(el) {
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
  }

  document.querySelectorAll('.tlink').forEach(bindTlink);

  document.addEventListener('touchend', e => {
    if (!preview.contains(e.target) && !e.target.classList.contains('tlink')) {
      hide();
    }
  });

  preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
  preview.addEventListener('mouseleave', hide);

  // ── Edit mode ──────────────────────────────────────────────────────────────

  if (new URLSearchParams(window.location.search).get('edit') !== 'true') return;

  const PAGES = [
    { key: 'public-language',           label: 'Public Language' },
    { key: 'engineered-language',       label: 'Engineered Language' },
    { key: 'engineered-names',          label: 'Engineered Names' },
    { key: 'engineered-words',          label: 'Engineered Words' },
    { key: 'engineered-concepts',       label: 'Engineered Concepts' },
    { key: 'shared-maps',               label: 'Shared Maps' },
    { key: 'social-reality',            label: 'Social Reality' },
    { key: 'legitimacy',                label: 'Legitimacy' },
    { key: 'interlocking-expectations', label: 'Interlocking Expectations' },
    { key: 'political-struggle',        label: 'Political Struggle' },
    { key: 'map-territory',             label: 'Map & Territory' },
    { key: 'map-is-territory',          label: 'Map is Territory' },
    { key: 'material-social',           label: 'Material vs Social' },
    { key: 'concepts',                  label: 'Concepts' },
    { key: 'denotation-connotation',    label: 'Denotation & Connotation' },
    { key: 'examples-words',            label: 'Examples: Words' },
    { key: 'many-others',               label: 'Many Others' },
  ];

  const monoFont = '"JetBrains Mono",monospace';

  // ── Link dropdown ──────────────────────────────────────────────────────────
  const dropdown = document.createElement('div');
  dropdown.id = '__link-dropdown__';
  dropdown.style.cssText = [
    'position:fixed;z-index:10000;',
    'background:#fffff8;border:1px solid #ddd;',
    'box-shadow:0 4px 16px rgba(0,0,0,0.12);',
    'border-radius:2px;padding:0.4rem 0;',
    'display:none;min-width:220px;',
  ].join('');

  PAGES.forEach(function(p) {
    const item = document.createElement('div');
    item.textContent = p.label;
    item.dataset.key = p.key;
    item.style.cssText = [
      'font-family:' + monoFont + ';',
      'font-size:0.5rem;letter-spacing:0.06em;',
      'text-transform:uppercase;padding:0.45rem 0.9rem;',
      'cursor:pointer;color:#333;',
    ].join('');
    item.addEventListener('mouseenter', function() { item.style.background = '#f0f0e8'; });
    item.addEventListener('mouseleave', function() { item.style.background = ''; });
    item.addEventListener('mousedown', function(e) {
      e.preventDefault(); // keep the text selection alive
      applyLink(p.key);
      dropdown.style.display = 'none';
    });
    dropdown.appendChild(item);
  });

  document.body.appendChild(dropdown);

  // Close dropdown on outside click
  document.addEventListener('click', function(e) {
    if (!dropdown.contains(e.target) && e.target !== linkBtn) {
      dropdown.style.display = 'none';
    }
  });

  let savedRange = null;

  function applyLink(key) {
    if (!savedRange) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);

    const selectedText = savedRange.toString().trim();
    if (!selectedText) return;

    // If the selected text is already inside a tlink, just update the key
    const ancestor = savedRange.commonAncestorContainer;
    const parentEl = ancestor.nodeType === 3 ? ancestor.parentElement : ancestor;
    if (parentEl && parentEl.classList && parentEl.classList.contains('tlink')) {
      parentEl.dataset.key = key;
      bindTlink(parentEl);
      savedRange = null;
      return;
    }

    // Wrap selection in a new tlink span
    const span = document.createElement('span');
    span.className = 'tlink';
    span.dataset.key = key;
    try {
      savedRange.surroundContents(span);
    } catch(e) {
      span.appendChild(savedRange.extractContents());
      savedRange.insertNode(span);
    }
    bindTlink(span);
    savedRange = null;
  }

  // ── Edit bar ───────────────────────────────────────────────────────────────
  const bar = document.createElement('div');
  bar.id = '__edit-bar__';
  bar.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;display:flex;gap:0.5rem;align-items:center;';

  const editLabel = document.createElement('span');
  editLabel.textContent = 'Edit mode';
  editLabel.style.cssText = 'font-family:' + monoFont + ';font-size:0.45rem;letter-spacing:0.1em;text-transform:uppercase;color:#999;margin-right:0.2rem;';

  const btnBase = 'font-family:' + monoFont + ';font-size:0.45rem;letter-spacing:0.08em;text-transform:uppercase;border:none;padding:0.4rem 0.8rem;cursor:pointer;border-radius:2px;';

  // Link button
  const linkBtn = document.createElement('button');
  linkBtn.textContent = '+ Link';
  linkBtn.style.cssText = btnBase + 'background:#e8ede8;color:#3a5a3a;';
  linkBtn.title = 'Select some text on the page, then click here to link it';

  linkBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      linkBtn.textContent = 'Select text first';
      setTimeout(function() { linkBtn.textContent = '+ Link'; }, 1800);
      return;
    }
    savedRange = sel.getRangeAt(0).cloneRange();

    // Position dropdown just above the bar
    const barRect = bar.getBoundingClientRect();
    dropdown.style.display = 'block';
    dropdown.style.bottom = (window.innerHeight - barRect.top + 8) + 'px';
    dropdown.style.right = (window.innerWidth - barRect.right) + 'px';
    dropdown.style.top = 'auto';
    dropdown.style.left = 'auto';
  });

  // Copy HTML button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy HTML';
  copyBtn.style.cssText = btnBase + 'background:#1a4a8a;color:#fff;';

  copyBtn.onclick = function() {
    // Strip editing artefacts
    document.querySelectorAll('.content h1, .content p').forEach(function(el) {
      el.removeAttribute('contenteditable');
      el.style.borderBottom = '';
      el.style.outline = '';
    });
    // Remove stale inline styles on tlinks and preview position
    document.querySelectorAll('.tlink').forEach(function(el) { el.style.cssText = ''; });
    const pv = document.getElementById('preview');
    if (pv) { pv.style.top = ''; pv.style.left = ''; }

    // Remove edit UI from DOM before serialising
    bar.remove();
    dropdown.remove();

    const html = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;

    navigator.clipboard.writeText(html).then(function() {
      document.body.appendChild(bar);
      document.body.appendChild(dropdown);
      copyBtn.textContent = 'Copied!';
      setTimeout(function() { copyBtn.textContent = 'Copy HTML'; }, 2000);
      applyEditable();
    }).catch(function() {
      document.body.appendChild(bar);
      document.body.appendChild(dropdown);
    });
  };

  bar.appendChild(editLabel);
  bar.appendChild(linkBtn);
  bar.appendChild(copyBtn);
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
