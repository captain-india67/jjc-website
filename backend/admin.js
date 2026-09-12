(function () {
  if (!window.JJC) {
    var box = document.getElementById('auth-error');
    if (box) { box.textContent = 'The sign-in library could not be loaded. Check your connection and reload.'; box.classList.add('visible'); }
    return;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { n = Number(n) || 0; return n.toFixed(n % 1 === 0 ? 0 : 1); }

  var gate = document.getElementById('admin-gate');
  var gateMsg = document.getElementById('gate-msg');
  var gateSignin = document.getElementById('gate-signin');
  var content = document.getElementById('admin-content');
  var who = document.getElementById('admin-who');
  var reviewList = document.getElementById('review-list');
  var rosterBody = document.getElementById('roster-body');
  var pendingCount = document.getElementById('pending-count');
  var errorBox = document.getElementById('auth-error');
  var booted = false;

  function showError(msg) {
    if (!errorBox) return;
    if (!msg) { errorBox.classList.remove('visible'); errorBox.textContent = ''; return; }
    errorBox.textContent = msg;
    errorBox.classList.add('visible');
  }

  var urlError = JJC.authErrorFromUrl();
  if (urlError) showError('Google sign-in did not complete: ' + urlError);
  if (!JJC.configured) showError('This page is not connected to the council database yet.');

  gateSignin.addEventListener('click', async function () {
    var res = await JJC.signInWithGoogle();
    if (res && res.error) showError('Could not start sign-in: ' + res.error.message);
  });
  document.getElementById('admin-signout').addEventListener('click', function () { JJC.signOut(); });

  document.querySelectorAll('.admin-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.admin-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.admin-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
    });
  });

  async function loadReview() {
    var got = await JJC.getPendingHours();
    if (got.error) { showError('Could not load the review queue: ' + got.error.message); return; }
    var rows = got.rows;
    pendingCount.textContent = rows.length;
    if (!rows.length) {
      reviewList.innerHTML = '<div class="empty-state"><span class="empty-icon">All clear</span>No hours waiting for review.</div>';
      return;
    }
    reviewList.innerHTML = rows.map(function (r) {
      var p = r.profiles || {};
      return '<div class="review-card" data-id="' + esc(r.id) + '">' +
        '<div><div class="review-who">' + esc(p.full_name || p.email || 'Unknown') + '</div>' +
        '<div class="review-meta">' + esc(p.school || 'No school set') + (p.committee ? ' &middot; ' + esc(p.committee) : '') + '</div>' +
        '<div class="review-detail"><strong>' + fmt(r.hours) + 'h</strong>' + esc(r.activity || '') +
        (r.category ? ' &middot; ' + esc(r.category) : '') + ' &middot; ' + esc(r.date || '') + '</div>' +
        (r.reflection ? '<div class="review-reflection">' + esc(r.reflection) + '</div>' : '') + '</div>' +
        '<div class="review-actions">' +
        '<button type="button" class="btn-approve" data-act="approved">Approve</button>' +
        '<button type="button" class="btn-reject" data-act="rejected">Reject</button>' +
        '</div></div>';
    }).join('');
    reviewList.querySelectorAll('.review-card').forEach(function (card) {
      card.querySelectorAll('button').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          var id = card.dataset.id, decision = btn.dataset.act;
          btn.disabled = true;
          var res = await JJC.reviewHours(id, decision);
          if (res && res.error) { showError('Could not save the decision: ' + res.error.message); btn.disabled = false; return; }
          card.style.transition = 'opacity .3s'; card.style.opacity = '0';
          setTimeout(function () { loadReview(); loadRoster(); }, 280);
        });
      });
    });
  }

  async function loadRoster() {
    var students = await JJC.getAllStudents();
    var all = await JJC.getAllHours();
    if (students.error || all.error) { showError('Could not load councillors: ' + (students.error || all.error).message); return; }
    var byUser = {};
    all.rows.forEach(function (h) {
      var u = byUser[h.user_id] || (byUser[h.user_id] = { a: 0, p: 0 });
      if (h.status === 'approved') u.a += Number(h.hours);
      else if (h.status === 'pending') u.p += Number(h.hours);
    });
    if (!students.rows.length) {
      rosterBody.innerHTML = '<tr><td colspan="6" class="empty-state">No councillors have signed in yet.</td></tr>';
      return;
    }
    rosterBody.innerHTML = students.rows.map(function (s) {
      var t = byUser[s.id] || { a: 0, p: 0 };
      return '<tr><td><span class="nm">' + esc(s.full_name || s.email || '?') + '</span>' + (s.role === 'admin' ? ' <small>(admin)</small>' : '') + '</td>' +
        '<td class="hide-sm">' + esc(s.school || '') + '</td>' +
        '<td class="hide-sm">' + esc(s.committee || '') + '</td>' +
        '<td class="hide-sm">' + esc(s.email || '') + '</td>' +
        '<td>' + fmt(t.a) + 'h</td><td>' + fmt(t.p) + 'h</td></tr>';
    }).join('');
  }

  async function boot() {
    if (booted) return;
    var user = await JJC.getUser();
    if (!user) {
      gateMsg.textContent = 'Sign in with an admin account to continue.';
      gateSignin.style.display = '';
      return;
    }
    var got = await JJC.getProfile();
    if (got.error) {
      gateMsg.textContent = 'Signed in, but your profile could not be loaded.';
      showError(got.error.message);
      return;
    }
    if (!got.profile || got.profile.role !== 'admin') {
      gateMsg.innerHTML = 'This account is not an admin. <a href="log-hours.html" class="accent">Go to your hours</a> instead.';
      gateSignin.style.display = 'none';
      return;
    }
    booted = true;
    JJC.cleanUrl();
    showError(null);
    who.textContent = 'Signed in as ' + (got.profile.full_name || got.profile.email);
    gate.style.display = 'none';
    content.style.display = '';
    await loadReview();
    await loadRoster();
  }

  boot();
  JJC.client.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_IN') boot();
    if (event === 'SIGNED_OUT') window.location.href = 'index.html';
  });
})();
