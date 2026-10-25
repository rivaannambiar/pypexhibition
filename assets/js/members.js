import { ctx, icon, avatar, showModal } from './shell.js';
import { db, rtdb, ref, set, update, collection, getDocs, escapeHtml, formatDate, toast, logActivity, readDemo, writeDemo } from './core.js';
const mount = document.querySelector('#members-content');
const e = escapeHtml;
let invites = [];

async function loadInvites() {
  if (ctx.demo) invites = readDemo('invites', []);
  else {
    const snapshot = await getDocs(collection(db, 'workspaces', ctx.workspaceId, 'invitations'));
    invites = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(x => x.status !== 'accepted');
  }
  render();
}

function render() {
  const members = ctx.members || [];
  const pending = invites.filter(i => i.status === 'pending');
  const used = members.length + pending.length;
  mount.innerHTML = `<div class="page-heading"><div><div class="eyebrow">PRIVATE GROUP ACCESS</div><h1>Your people, all here.</h1><p>Invite only your exhibition teammates. Without a mail service, this page creates a private link for you to share manually through your normal email app.</p></div><button class="btn btn-primary" id="invite-open" ${used >= 5 ? 'disabled' : ''}>${icon('plus')} Invite teammate</button></div>
  <section class="grid three" style="margin-bottom:18px"><div class="surface stat-card"><div class="stat-icon">${icon('users')}</div><div class="stat-label">Accepted members</div><div class="stat-number">${members.length}<span style="font-size:13px;color:var(--muted)"> / 5</span></div><div class="stat-foot">One small, focused team</div></div><div class="surface stat-card"><div class="stat-icon">${icon('bell')}</div><div class="stat-label">Pending invitations</div><div class="stat-number">${pending.length}</div><div class="stat-foot">Waiting for someone to accept</div></div><div class="surface stat-card"><div class="stat-icon">${icon('activity')}</div><div class="stat-label">Open seats</div><div class="stat-number">${Math.max(0, 5 - used)}</div><div class="stat-foot">Maximum five members + pending invites</div></div></section>
  <section class="grid two" style="align-items:start"><div class="surface surface-pad"><div class="section-head"><div><h2>Group members</h2><p>People who have accepted an invitation.</p></div><span class="live-pill"><span class="live-pulse"></span> Live presence</span></div><div class="list">${members.map(m => `<div class="list-row">${avatar(m)}<div class="list-content"><strong>${e(m.displayName || m.email || 'Member')} ${m.uid === ctx.user?.uid ? '<span class="tag">YOU</span>' : ''}</strong><small>${e(m.email || '')} · ${e(m.role || 'member')}</small></div><span class="pill" data-online-uid="${e(m.uid)}"><span class="online-dot" style="width:6px;height:6px"></span><span class="tiny">${ctx.demo ? (m.uid === 'demo-member-1' || m.uid === ctx.user?.uid ? 'Online' : 'Away') : 'Connected'}</span></span></div>`).join('') || '<div class="empty"><strong>No members yet</strong>Create the workspace and invite your teammates.</div>'}</div></div>
  <div class="surface surface-pad"><div class="section-head"><div><h2>Invitations</h2><p>Each teammate must explicitly accept.</p></div></div><div class="list">${invites.length ? invites.map(i => `<div class="list-row"><span class="avatar" style="background:#283244;color:#d5deed">@</span><div class="list-content"><strong>${e(i.email || 'Invited teammate')}</strong><small>${i.status === 'pending' ? 'Awaiting acceptance' : e(i.status || 'Pending')} · ${i.createdAt ? formatDate(i.createdAt) : 'Just invited'}</small></div><span class="pill">${e(i.status || 'pending')}</span></div>`).join('') : '<div class="empty"><strong>No invitations pending</strong>Your invitation links will appear here.</div>'}</div><div class="divider"></div><div class="tiny muted">Links expire after 7 days. With verification disabled, the link is the main gate—only share it with the intended teammate.</div></div></section>
  <section class="surface surface-pad" style="margin-top:16px"><div class="section-head"><div><h2>How joining works</h2><p>No SMTP, no Cloud Functions, no verification email.</p></div></div><div class="grid three"><div><strong style="font-size:12px">01 · Create a link</strong><p class="tiny">Enter your teammate's email and create a one-time invite link.</p></div><div><strong style="font-size:12px">02 · Send it yourself</strong><p class="tiny">Paste the link into an email or message using an app you already have.</p></div><div><strong style="font-size:12px">03 · Accept the invite</strong><p class="tiny">They sign in or create an account using the invited email and accept.</p></div></div></section>`;
  document.querySelector('#invite-open').addEventListener('click', inviteModal);
}

function inviteModal() {
  if ((ctx.members.length + invites.filter(i => i.status === 'pending').length) >= 5) return toast('This workspace is limited to five people.');
  showModal('Create an invite link', `<p>No email is sent by the website. This creates a link you can copy into your normal email app.</p><form id="invite-form" class="grid" style="gap:12px"><div class="field"><label for="invite-email">Teammate's email</label><input id="invite-email" class="input" type="email" placeholder="teammate@example.com" required></div><div class="field"><label for="invite-message">Optional note</label><textarea id="invite-message" class="textarea" rows="3" placeholder="Join our PYP Exhibition workspace…"></textarea></div><button class="btn btn-primary" type="submit">Create invite link →</button><div class="tiny muted">The invited account must use the same email entered above and accept before joining.</div></form>`, wrap => wrap.querySelector('#invite-form').addEventListener('submit', async event => {
    event.preventDefault();
    const email = wrap.querySelector('#invite-email').value.trim().toLowerCase();
    const note = wrap.querySelector('#invite-message').value.trim();
    if (!email || !email.includes('@')) return toast('Enter a valid email address.', 'error');
    if (ctx.members.some(m => (m.email || '').toLowerCase() === email) || invites.some(i => (i.email || '').toLowerCase() === email && i.status === 'pending')) return toast('That email is already a member or has a pending invite.', 'error');
    if (ctx.members.length + invites.filter(i => i.status === 'pending').length >= 5) return toast('This workspace is limited to five people.', 'error');
    const submit = wrap.querySelector('button[type="submit"]'); submit.disabled = true; submit.textContent = 'Creating…';
    try {
      const token = `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
      const now = Date.now();
      const invitation = { id: token, workspaceId: ctx.workspaceId, workspaceName: ctx.workspace?.name || 'PYP Exhibition', email, note, invitedByUid: ctx.user.uid, invitedByName: ctx.member?.displayName || ctx.user.displayName || 'A teammate', status: 'pending', createdAt: now, expiresAt: now + 7 * 24 * 60 * 60 * 1000 };
      let inviteUrl;
      if (ctx.demo) {
        inviteUrl = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}join.html?wid=${encodeURIComponent(ctx.workspaceId)}&token=${encodeURIComponent(token)}`;
        invites.unshift({ ...invitation, demoOnly: true }); writeDemo('invites', invites);
      } else {
        await set(ref(rtdb, `workspaceInvitations/${ctx.workspaceId}/${token}`), invitation);
        inviteUrl = new URL(`join.html?wid=${encodeURIComponent(ctx.workspaceId)}&token=${encodeURIComponent(token)}`, location.href).href;
        invites.unshift(invitation);
      }
      await logActivity(ctx, `created an invitation for ${email}`, 'member');
      render();
      wrap.querySelector('.modal')?.remove();
      // Keep the link visible in a new modal so the inviter can copy it after creation.
      showModal('Invite link ready', `<p>Send this link to <strong>${e(email)}</strong> using your regular email app. Anyone who has the link may attempt to accept it, so share it privately.</p><div class="field"><label for="generated-invite-link">Private invite link</label><textarea class="textarea" id="generated-invite-link" rows="3" readonly>${e(inviteUrl)}</textarea></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn btn-primary" id="copy-invite-link">Copy invite link</button><button class="btn" id="open-email-draft">Open email draft</button><button class="btn" id="close-invite-link">Done</button></div>`, dlg => {
        dlg.querySelector('#copy-invite-link').addEventListener('click', async () => { try { await navigator.clipboard.writeText(inviteUrl); toast('Invite link copied. Paste it into your email.'); } catch { const input = dlg.querySelector('#generated-invite-link'); input.select(); toast('Select and copy the link manually.'); } });
        dlg.querySelector('#open-email-draft').addEventListener('click', () => { const subject = encodeURIComponent('PYP Exhibition Workspace invitation'); const body = encodeURIComponent(`Hi! Please join our private PYP Exhibition workspace using this invitation link:\n\n${inviteUrl}\n\nOpen the link, sign in or create an account using ${email}, and explicitly accept the invitation. This link expires in seven days.`); window.location.href = `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`; });
        dlg.querySelector('#close-invite-link').addEventListener('click', () => dlg.remove());
      });
    } catch (error) {
      console.error(error); toast(error.message || 'Could not create invite link. Check the Realtime Database rules.', 'error'); submit.disabled = false; submit.textContent = 'Create invite link →';
    }
  }));
}

loadInvites().catch(error => { console.error(error); mount.innerHTML = '<div class="empty"><strong>Could not load members</strong>Check your Firebase configuration and Realtime Database rules.</div>'; });
