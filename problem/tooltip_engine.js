(function() {
  const cache = {};
  const preview = document.getElementById('preview');
  const previewLabel = document.getElementById('preview-label');
  const previewTitle = document.getElementById('preview-title');
  const previewBody = document.getElementById('preview-body');
  const previewLink = document.getElementById('preview-link');
  if (!preview) return;

  let hideTimeout = null;
  let activeTouch = null; // track which link was last tapped on mobile

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
    if (isMobile) return; // mobile CSS handles positioning via fixed bottom
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

  // Desktop: hover
  document.querySelectorAll('.tlink').forEach(el => {
    el.addEventListener('mouseenter', () => show(el, el.dataset.key));
    el.addEventListener('mouseleave', hide);

    // Desktop click navigates
    el.addEventListener('click', e => {
      if (window.innerWidth > 768) {
        window.location.href = el.dataset.key + '.html';
      }
    });

    // Mobile: first tap shows preview, second tap navigates
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

  // Close preview when tapping outside on mobile
  document.addEventListener('touchend', e => {
    if (!preview.contains(e.target) && !e.target.classList.contains('tlink')) {
      hide();
    }
  });

  preview.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
  preview.addEventListener('mouseleave', hide);
})();
