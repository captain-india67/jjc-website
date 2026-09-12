(function () {
  if (!window.JJC) {
    var box = document.getElementById('auth-error');
    if (box) { box.textContent = 'The sign-in library could not be loaded. Check your connection and reload.'; box.classList.add('visible'); }
    return;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n) { n = Number(n) || 0; return n.toFixed(n % 1 === 0 ? 0 : 1); }
  function initials(name) { return (String(name || '').split(' ').map(function (w) { return w.charAt(0).toUpperCase(); }).slice(0, 2).join('')) || '?'; }

  var els = {
    name: document.getElementById('profile-name'),
    meta: document.getElementById('profile-meta'),
    ini: document.getElementById('profile-initials'),
    signin: document.getElementById('profile-signin'),
    signout: document.getElementById('profile-signout'),
    edit: document.getElementById('profile-edit'),
    admin: document.getElementById('profile-admin'),
    editForm: document.getElementById('profile-edit-form'),
    cancel: document.getElementById('profile-cancel'),
    note: document.getElementById('auth-note'),
    error: document.getElementById('auth-error'),
    form: document.getElementById('hours-form'),
    formError: document.getElementById('hours-error'),
    host: document.getElementById('hours-entries'),
    sumTotal: document.getElementById('summary-total'),
    sumPending: document.getElementById('summary-pending'),
    sumEntries: document.getElementById('summary-entries')
  };

  var currentProfile = null;

  function showError(msg) {
    if (!els.error) return;
    if (!msg) { els.error.classList.remove('visible'); els.error.textContent = ''; return; }
    els.error.textContent = msg;
    els.error.classList.add('visible');
  }

  var urlError = JJC.authErrorFromUrl();
  if (urlError) showError('Google sign-in did not complete: ' + urlError);
  if (!JJC.configured) showError('This page is not connected to the council database yet. The site admin needs to add the Supabase keys.');

  els.signin.addEventListener('click', async function () {
    showError(null);
    var res = await JJC.signInWithGoogle();
    if (res && res.error) showError('Could not start sign-in: ' + res.error.message);
  });
  els.signout.addEventListener('click', function () { JJC.signOut(); });

  function renderSignedOut() {
    currentProfile = null;
    els.name.textContent = 'Sign in to start logging';
    els.meta.textContent = 'Use your Google account';
    els.ini.textContent = '?';
    els.signin.style.display = '';
    els.signout.style.display = 'none';
    els.edit.style.display = 'none';
    els.admin.style.display = 'none';
    els.editForm.classList.remove('visible');
    if (els.note) els.note.style.display = '';
    if (els.form) { els.form.style.opacity = '0.45'; els.form.style.pointerEvents = 'none'; }
    if (els.host) els.host.innerHTML = '<div class="empty-state"><span class="empty-icon">&middot;</span>Sign in to see and log your hours.</div>';
    if (els.sumTotal) els.sumTotal.textContent = '0';
    if (els.sumPending) els.sumPending.textContent = '0';
    if (els.sumEntries) els.sumEntries.textContent = '0';
  }

  function renderSignedIn(profile) {
    currentProfile = profile;
    els.name.textContent = profile.full_name || 'Councillor';
    var bits = [];
    if (profile.school) bits.push(profile.school);
    if (profile.committee) bits.push(profile.committee);
    els.meta.textContent = bits.length ? bits.join(' / ') : 'Add your school and committee under Edit profile';
    els.ini.textContent = initials(profile.full_name);
    els.signin.style.display = 'none';
    els.signout.style.display = '';
    els.edit.style.display = '';
    els.admin.style.display = (profile.role === 'admin') ? '' : 'none';
    if (els.note) els.note.style.display = 'none';
    if (els.form) { els.form.style.opacity = ''; els.form.style.pointerEvents = ''; }
    var hc = document.getElementById('hf-committee');
    if (hc && !hc.value && profile.committee) hc.value = profile.committee;
  }

  async function syncHours() {
    var totals = await JJC.getMyTotals();
    if (totals.error) { showError('Could not load your hours: ' + totals.error.message); return; }
    if (els.sumTotal) els.sumTotal.textContent = fmt(totals.approved);
    if (els.sumPending) els.sumPending.textContent = fmt(totals.pending);
    if (els.sumEntries) els.sumEntries.textContent = String(totals.entries);
    var list = totals.all;
    if (!list.length) {
      els.host.innerHTML = '<div class="empty-state"><span class="empty-icon">0h</span>No entries yet. Use the form above to log your first hours.</div>';
      return;
    }
    els.host.innerHTML = list.slice(0, 20).map(function (e) {
      var statusClass = e.status === 'approved' ? 'approved' : (e.status === 'rejected' ? 'rejected' : '');
      var del = e.status === 'pending' ? '<button type="button" class="hours-entry-delete" data-id="' + esc(e.id) + '">Delete</button>' : '';
      return '<article class="hours-entry"><div class="hours-entry-date">' + esc(e.date || '-') + '</div>' +
        '<div><div class="hours-entry-row"><strong>' + fmt(e.hours) + 'h</strong>' +
        '<span class="hours-entry-meta">' + esc(e.category || '') + (e.activity ? ' / ' + esc(e.activity) : '') + '</span></div>' +
        (e.reflection ? '<div class="hours-entry-reflection">' + esc(e.reflection) + '</div>' : '') + del + '</div>' +
        '<div class="hours-entry-status ' + statusClass + '">' + esc(e.status || 'pending') + '</div></article>';
    }).join('');
    els.host.querySelectorAll('.hours-entry-delete').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('Delete this entry?')) return;
        btn.disabled = true;
        var res = await JJC.deleteHours(btn.dataset.id);
        if (res && res.error) { showError('Could not delete: ' + res.error.message); btn.disabled = false; return; }
        await syncHours();
      });
    });
  }

  els.edit.addEventListener('click', function () {
    if (!currentProfile) return;
    document.getElementById('pe-name').value = currentProfile.full_name || '';
    document.getElementById('pe-school').value = currentProfile.school || '';
    document.getElementById('pe-committee').value = currentProfile.committee || '';
    els.editForm.classList.add('visible');
    els.edit.style.display = 'none';
    document.getElementById('pe-name').focus();
  });
  if (els.cancel) els.cancel.addEventListener('click', function () {
    els.editForm.classList.remove('visible'); els.edit.style.display = '';
  });
  document.getElementById('profile-form-inner').addEventListener('submit', async function (e) {
    e.preventDefault();
    var f = this.elements;
    var res = await JJC.updateProfile({
      full_name: (f['pe-name'].value || '').trim(),
      school: f['pe-school'].value,
      committee: f['pe-committee'].value
    });
    if (res && res.error) { showError('Could not save your profile: ' + res.error.message); return; }
    var got = await JJC.getProfile();
    if (got.profile) renderSignedIn(got.profile);
    els.editForm.classList.remove('visible'); els.edit.style.display = '';
  });

  if (els.form) {
    els.form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var f = els.form.elements;
      var ok = els.form.querySelector('.form-success');
      if (ok) ok.classList.remove('visible');
      if (els.formError) els.formError.classList.remove('visible');
      var res = await JJC.logHours({
        activity: f.activity.value,
        category: f.committee.value,
        hours: parseFloat(f.hours.value) || 0,
        date: f.date.value,
        reflection: f.reflection ? f.reflection.value.trim() : ''
      });
      if (res && res.error) {
        if (els.formError) { els.formError.textContent = 'Could not submit: ' + res.error.message; els.formError.classList.add('visible'); }
        return;
      }
      if (ok) { ok.classList.add('visible'); ok.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      f.date.value = ''; f.hours.value = ''; f.activity.value = '';
      if (f.reflection) f.reflection.value = '';
      await syncHours();
      setTimeout(function () { if (ok) ok.classList.remove('visible'); }, 6000);
    });
  }

  async function boot() {
    var got = await JJC.getProfile();
    if (got.error) {
      showError('Signed in, but your profile could not be loaded: ' + got.error.message);
      renderSignedOut();
      els.signout.style.display = '';
      return;
    }
    if (got.profile) { JJC.cleanUrl(); showError(null); renderSignedIn(got.profile); await syncHours(); }
    else renderSignedOut();
  }

  boot();
  JJC.client.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_IN' && !currentProfile) boot();
    if (event === 'SIGNED_OUT') renderSignedOut();
  });
})();
