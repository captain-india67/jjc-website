(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!document.querySelector('.splash')) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { document.body.classList.add('page-ready'); });
    });
  } else {
    document.body.classList.add('page-ready');
  }

  function removeSplash() {
    var splash = document.querySelector('.splash');
    if (!splash) return;
    if (reducedMotion) { splash.style.display = 'none'; return; }
    splash.style.transition = 'opacity 0.9s ease';
    splash.style.opacity = '0';
    setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 1000);
  }
  window.addEventListener('load', function () { setTimeout(removeSplash, 1400); });
  setTimeout(removeSplash, 4000);

  function initAOS() {
    if (window.AOS) {
      window.AOS.init({ duration: 700, once: true, offset: 40, easing: 'ease-out-cubic', disable: reducedMotion });
    }
  }
  initAOS();
  window.addEventListener('load', initAOS);

  var hamburger = document.querySelector('.hamburger');
  var overlay = document.querySelector('.nav-overlay');
  if (hamburger && overlay) {
    var setMenu = function (open) {
      hamburger.classList.toggle('active', open);
      overlay.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    hamburger.addEventListener('click', function (e) {
      if (e) e.preventDefault();
      setMenu(!overlay.classList.contains('open'));
    });
    overlay.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) setMenu(false);
    });
    overlay.querySelectorAll('.menu-link').forEach(function (a, i) {
      a.style.transitionDelay = (0.05 + i * 0.045) + 's';
    });
  }

  var header = document.querySelector('.site-header');
  var hasHero = !!document.querySelector('.hero, .hero-photo');
  function updateHeader() {
    if (!header) return;
    if (window.scrollY > 60) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  if (!hasHero && header) header.classList.add('solid');
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  var progress = document.querySelector('.scroll-progress');
  if (progress) {
    var onScroll = function () {
      var h = document.documentElement;
      var scrolled = h.scrollTop || document.body.scrollTop;
      var total = (h.scrollHeight - h.clientHeight) || 1;
      progress.style.width = (scrolled / total * 100) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  var countedEls = [];
  function animateCount(el) {
    if (countedEls.indexOf(el) !== -1) return;
    countedEls.push(el);
    var target = parseFloat(el.dataset.count);
    var dur = parseInt(el.dataset.duration || 1600, 10);
    var suffix = el.dataset.suffix || '';
    var prefix = el.dataset.prefix || '';
    if (isNaN(target)) return;
    var start = performance.now();
    function step(now) {
      var t = Math.min((now - start) / dur, 1);
      var v = Math.floor(target * easeOutCubic(t));
      el.textContent = prefix + v.toLocaleString() + suffix;
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toLocaleString() + suffix;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { animateCount(e.target); co.unobserve(e.target); }
      });
    }, { threshold: 0.2 });
    counters.forEach(function (c) { co.observe(c); });
    window.addEventListener('load', function () {
      counters.forEach(function (c) {
        var r = c.getBoundingClientRect();
        if (r.top < window.innerHeight) animateCount(c);
      });
    });
  } else {
    counters.forEach(animateCount);
  }

  var timeline = document.querySelector('.timeline');
  var timelineFill = document.querySelector('.timeline-fill');
  var timelineItems = document.querySelectorAll('.timeline-item');
  if (timeline && timelineFill && !reducedMotion) {
    var updateTimelineFill = function () {
      var rect = timeline.getBoundingClientRect();
      var vh = window.innerHeight;
      var start = vh * 0.7;
      var end = vh * 0.3;
      var total = rect.height;
      var scrolled = start - rect.top;
      var drawable = total + (start - end);
      var pct = Math.max(0, Math.min(1, scrolled / drawable));
      timelineFill.style.height = (pct * total) + 'px';
    };
    updateTimelineFill();
    window.addEventListener('scroll', updateTimelineFill, { passive: true });
    window.addEventListener('resize', updateTimelineFill);
  } else if (timelineFill) {
    timelineFill.style.height = '100%';
  }
  if (timelineItems.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.25 });
    timelineItems.forEach(function (i) { io.observe(i); });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var EVENTS = window.JJC_EVENTS || [];
  if (EVENTS.length) {
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var parseDate = function (d) { var p = d.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var sorted = EVENTS.slice().sort(function (a, b) {
      return (a.date + (a.start || '99:99')).localeCompare(b.date + (b.start || '99:99'));
    });
    var isPast = function (e) { return parseDate(e.date) < today; };
    var timeText = function (e) {
      if (e.start && e.end) return escapeHtml(e.start) + ' to ' + escapeHtml(e.end);
      if (e.start) return escapeHtml(e.start);
      return '<span class="event-tbc">Time TBC</span>';
    };
    var venueText = function (e) {
      return e.venue ? escapeHtml(e.venue) : '<span class="event-tbc">Venue TBC</span>';
    };
    var card = function (e) {
      var d = parseDate(e.date);
      var title = escapeHtml(e.title);
      if (e.link) title = '<a href="' + escapeHtml(e.link) + '">' + title + '</a>';
      return '<article class="event-card' + (isPast(e) ? ' past' : '') + '">' +
        '<div class="event-date"><span class="dow">' + DAYS[d.getDay()] + '</span><span class="day">' + d.getDate() + '</span><span class="month">' + MONTHS[d.getMonth()] + '</span></div>' +
        '<div class="event-body"><span class="event-committee">' + escapeHtml(e.committee) + (isPast(e) ? ' &middot; Done' : '') + '</span>' +
        '<h3>' + title + '</h3>' +
        '<div class="event-meta"><span>' + timeText(e) + '</span><span>' + venueText(e) + '</span></div>' +
        '</div></article>';
    };
    document.querySelectorAll('[data-events]').forEach(function (host) {
      var mode = host.getAttribute('data-events');
      var limit = parseInt(host.getAttribute('data-limit') || '0', 10);
      var list = mode === 'past' ? sorted.filter(isPast) : sorted.filter(function (e) { return !isPast(e); });
      if (limit) list = list.slice(0, limit);
      var section = host.closest('[data-events-section]');
      if (!list.length) {
        if (section) section.style.display = 'none';
        else host.innerHTML = '<p class="dim">Nothing scheduled yet. Check back soon.</p>';
        return;
      }
      host.innerHTML = list.map(card).join('');
    });
    document.querySelectorAll('[data-committee-events]').forEach(function (host) {
      var name = host.getAttribute('data-committee-events');
      var list = sorted.filter(function (e) { return e.committee === name && !isPast(e); });
      if (!list.length) return;
      host.innerHTML = '<p class="c-label">Coming up</p><ul class="committee-events">' + list.map(function (e) {
        var d = parseDate(e.date);
        return '<li><span class="when">' + DAYS[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</span>' + escapeHtml(e.title) + (e.venue ? ', ' + escapeHtml(e.venue) : '') + '</li>';
      }).join('') + '</ul>';
    });
  }

  var contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    var ok = contactForm.querySelector('.form-success');
    var err = contactForm.querySelector('.form-error');
    var button = contactForm.querySelector('button[type="submit"]');
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!contactForm.checkValidity()) { contactForm.reportValidity(); return; }
      if (ok) ok.classList.remove('visible');
      if (err) err.classList.remove('visible');
      button.disabled = true;
      var body = new URLSearchParams(new FormData(contactForm)).toString();
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body })
        .then(function (res) {
          if (!res.ok) throw new Error('status ' + res.status);
          if (ok) { ok.classList.add('visible'); ok.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
          contactForm.reset();
        })
        .catch(function () {
          if (err) { err.classList.add('visible'); err.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        })
        .then(function () { button.disabled = false; });
    });
  }

  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();

(function () {
  if (!('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        var delay = parseInt(e.target.getAttribute('data-aos-delay') || '0', 10);
        setTimeout(function () { e.target.classList.add('aos-animate'); }, delay);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('[data-aos]').forEach(function (el) { io.observe(el); });
})();

function forceVisible() {
  document.body.setAttribute('data-loaded', '1');
  document.querySelectorAll('[data-aos]:not(.aos-animate)').forEach(function (el) { el.classList.add('aos-animate'); });
  document.querySelectorAll('.timeline-item:not(.in)').forEach(function (el) { el.classList.add('in'); });
  var splash = document.querySelector('.splash');
  if (splash) {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(function () { if (splash.parentNode) splash.parentNode.removeChild(splash); }, 400);
  }
}
window.addEventListener('load', function () { setTimeout(forceVisible, 600); });
setTimeout(forceVisible, 4000);
