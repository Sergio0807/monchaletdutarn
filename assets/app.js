/* Mon Chalet du Tarn — interactions (vanilla, production) */
(function () {
  'use strict';

  /* — Année footer — */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* — Nav : fond au scroll — */
  var nav = document.getElementById('nav');
  var onScroll = function () {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* — Menu mobile — */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobileMenu');
  var toggleMenu = function (open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', function () {
    toggleMenu(!menu.classList.contains('open'));
  });
  menu.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', function () { toggleMenu(false); });
  });

  /* — Reveal au scroll — */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* — FAQ accordéon — */
  document.querySelectorAll('.qa-q').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var qa = btn.closest('.qa');
      var ans = qa.querySelector('.qa-a');
      var open = qa.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0px';
    });
  });
  window.addEventListener('resize', function () {
    document.querySelectorAll('.qa.open .qa-a').forEach(function (ans) {
      ans.style.maxHeight = ans.scrollHeight + 'px';
    });
  });

  /* — Formulaire de demande de renseignements —
     1. Validation côté client (identique à la maquette)
     2. POST JSON vers /api/lead (fonction serverless Vercel)
     3. Repli automatique sur mailto: si l'API échoue/indisponible */
  var form = document.getElementById('leadForm');
  if (!form) return;

  function showSent() {
    form.style.display = 'none';
    var sent = document.getElementById('formSent');
    if (sent) sent.classList.add('show');
  }

  function showError(msg) {
    var el = document.getElementById('formError');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
  }

  function clearError() {
    var el = document.getElementById('formError');
    if (el) { el.textContent = ''; el.classList.remove('show'); }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    /* — Validation — */
    var invalid = false;
    ['f-nom', 'f-prenom', 'f-ville', 'f-tel', 'f-email', 'f-msg'].forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      if (!el.value.trim() || (el.type === 'email' && !/.+@.+\..+/.test(el.value))) {
        el.style.borderColor = '#c0533b';
        invalid = true;
      } else {
        el.style.borderColor = '';
      }
    });
    var projetEl = form.querySelector('input[name="projet"]:checked');
    var pills = document.getElementById('projPills');
    if (!projetEl) {
      invalid = true;
      if (pills) { pills.style.outline = '2px solid #c0533b'; pills.style.outlineOffset = '4px'; pills.style.borderRadius = '6px'; }
    } else if (pills) {
      pills.style.outline = '';
    }
    if (invalid) return;

    clearError();

    var hp = document.getElementById('hp-website');
    var data = {
      nom:     document.getElementById('f-nom').value.trim(),
      prenom:  document.getElementById('f-prenom').value.trim(),
      ville:   document.getElementById('f-ville').value.trim(),
      tel:     document.getElementById('f-tel').value.trim(),
      email:   document.getElementById('f-email').value.trim(),
      projet:  projetEl.value,
      message: document.getElementById('f-msg').value.trim(),
      website: hp ? hp.value : ''
    };

    var btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Envoi en cours…'; }

    fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().then(function (json) {
          if (!res.ok || json.ok === false) throw new Error(json.error || 'Erreur inconnue');
          return json;
        });
      })
      .then(function () {
        showSent();
      })
      .catch(function () {
        showError('Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer ultérieurement.');
      })
      .finally(function () {
        if (btn) { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
      });
  });
})();
