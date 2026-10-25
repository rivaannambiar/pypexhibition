import { firebaseConfigured, auth, db, rtdb, ref, set, remove, getDoc, doc, logActivity, toast } from './core.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';

const form = document.querySelector('#join-form');
const emailInput = document.querySelector('#join-email');
const passwordInput = document.querySelector('#join-password');
const errorBox = document.querySelector('#join-error');
const desc = document.querySelector('#join-description');
const title = document.querySelector('#join-title');
const submit = form.querySelector('button[type="submit"]');
const params = new URLSearchParams(location.search);
const workspaceId = params.get('wid');
const token = params.get('token');
let invitation = null;
let accountMode = 'create';

async function init() {
  if (!firebaseConfigured) throw new Error('Firebase is not configured. Follow README.md to connect the free Realtime Database project first.');
  if (!workspaceId || !token) throw new Error('This invitation link is incomplete. Ask your group owner to create another link.');
  const snapshot = await getDoc(doc(db, 'workspaces', workspaceId, 'invitations', token));
  if (!snapshot.exists()) throw new Error('This invitation link is not recognised. Ask your group owner to create another.');
  invitation = snapshot.data();
  if (invitation.status !== 'pending') throw new Error(invitation.status === 'accepted' ? 'This invitation has already been accepted.' : 'This invitation is no longer active.');
  if (Number(invitation.expiresAt || 0) < Date.now()) throw new Error('This invitation has expired. Ask your group owner to create another.');
  emailInput.value = invitation.email || '';
  emailInput.readOnly = true;
  title.textContent = `Join ${invitation.workspaceName || 'your group'}.`;
  desc.textContent = `This link was created for ${invitation.email}. Use that email address, then explicitly accept to join the private exhibition workspace. Email verification is disabled, so only accept links shared directly with you.`;
  submit.textContent = 'Create account & accept →';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  errorBox.textContent = '';
  if (!invitation || !firebaseConfigured) return;
  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value;
  submit.disabled = true;
  submit.textContent = accountMode === 'create' ? 'Creating account…' : 'Signing in…';
  try {
    let user;
    if (accountMode === 'create') {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      user = credential.user;
      const defaultName = email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).slice(0, 60) || 'Member';
      await updateProfile(user, { displayName: defaultName });
    } else {
      user = (await signInWithEmailAndPassword(auth, email, password)).user;
    }
    if ((user.email || '').toLowerCase() !== String(invitation.email || '').toLowerCase()) throw new Error('This invitation is for a different email address.');

    // Membership is written only after the invitation exists and the user explicitly submits this form.
    const existingLink = await getDoc(doc(db, 'users', user.uid, 'workspaces', workspaceId));
    if (existingLink.exists()) {
      try { await remove(ref(rtdb, `workspaceInvitations/${workspaceId}/${token}`)); } catch {}
      location.href = 'dashboard.html'; return;
    }
    const now = Date.now();
    // The invitation carries the display name. A non-member must not read workspace data before accepting.
    const workspace = { name: invitation.workspaceName || 'PYP Exhibition' };
    const colours = ['#a9f06a', '#75e5d1', '#a99bff', '#ff9cc9', '#ffd37b'];
    const member = {
      uid: user.uid,
      email: (user.email || '').toLowerCase(),
      displayName: user.displayName || email.split('@')[0],
      role: 'member',
      color: colours[[...token].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % colours.length],
      joinedAt: now,
      invitationId: token
    };
    await set(ref(rtdb, `members/${workspaceId}/${user.uid}`), member);
    await set(ref(rtdb, `workspaceMembers/${workspaceId}/${user.uid}`), true);
    await set(ref(rtdb, `users/${user.uid}/workspaces/${workspaceId}`), { workspaceId, name: workspace.name || 'PYP Exhibition', role: 'member', joinedAt: now });
    await set(ref(rtdb, `profiles/${user.uid}`), { displayName: member.displayName, email: member.email, color: member.color, updatedAt: now });
    // Successful acceptance consumes the one-time invitation token. This also keeps the pending-invite count accurate.
    await remove(ref(rtdb, `workspaceInvitations/${workspaceId}/${token}`));
    await logActivity({ demo: false, user, member, workspaceId }, `${member.displayName} accepted the exhibition invitation`, 'member');
    toast('Invitation accepted. Welcome to the group!');
    location.href = 'dashboard.html';
  } catch (error) {
    console.error(error);
    const messages = {
      'auth/email-already-in-use': 'An account already uses that email. Choose “Already have an account? Sign in”.',
      'auth/invalid-credential': 'The email or password did not match. Try signing in if you already created an account.',
      'auth/weak-password': 'Use a password with at least 6 characters.',
      'auth/invalid-email': 'The invitation email does not look valid.'
    };
    errorBox.textContent = messages[error.code] || error.message || 'Could not accept the invitation. Check the Realtime Database rules.';
  } finally {
    submit.disabled = false;
    submit.textContent = accountMode === 'create' ? 'Create account & accept →' : 'Sign in & accept →';
  }
});

document.querySelector('#join-signin').addEventListener('click', () => {
  accountMode = accountMode === 'create' ? 'signin' : 'create';
  submit.textContent = accountMode === 'create' ? 'Create account & accept →' : 'Sign in & accept →';
  document.querySelector('#join-signin').textContent = accountMode === 'create' ? 'Already have an account? Sign in' : 'Need an account? Create one';
  passwordInput.autocomplete = accountMode === 'create' ? 'new-password' : 'current-password';
  desc.textContent = accountMode === 'create' ? `Create an account using ${invitation?.email || 'the invited email address'}.` : `Sign in with the existing account for ${invitation?.email || 'the invited email address'}.`;
  passwordInput.focus();
});

init().catch(error => {
  errorBox.textContent = error.message || 'Could not load this invitation.';
  submit.disabled = true;
  emailInput.readOnly = false;
});
