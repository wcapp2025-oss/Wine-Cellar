// Sign in, sign up, password reset, and log out.

import { supabase } from './supabase.js';
import { state, emit } from './state.js';
import { registerActions } from './ui.js';
import { byId } from './utils.js';
import { PASSWORD_RESET_REDIRECT } from '../config.js';

const AUTH_FORMS = ['loginForm', 'signupForm', 'forgotPasswordForm', 'newPasswordForm'];

function showAuthForm(id) {
    AUTH_FORMS.forEach(f => { byId(f).style.display = f === id ? 'block' : 'none'; });
    byId('authError').style.display = 'none';
    byId('authSuccess').style.display = 'none';
}

function showMessage(kind, message) {
    const [show, hide] = kind === 'error' ? ['authError', 'authSuccess'] : ['authSuccess', 'authError'];
    byId(show).textContent = message;
    byId(show).style.display = 'block';
    byId(hide).style.display = 'none';
}

function showApp(visible) {
    byId('authModal').style.display = visible ? 'none' : 'flex';
    byId('mainApp').style.display = visible ? 'block' : 'none';
}

function signedIn(user) {
    state.user = user;
    showApp(true);
    emit('auth:signed-in', user);
}

async function checkAuth() {
    // A password-recovery link from the reset email
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlParams = new URLSearchParams(window.location.search);
    const isRecovery = hashParams.get('type') === 'recovery' || urlParams.get('type') === 'recovery';

    const { data: { session } } = await supabase.auth.getSession();

    if (isRecovery && session) {
        state.user = session.user;
        showAuthForm('newPasswordForm');
        showApp(false);
    } else if (session) {
        signedIn(session.user);
    } else {
        showApp(false);
    }
}

function wireForms() {
    const link = (id, form) => byId(id).addEventListener('click', e => { e.preventDefault(); showAuthForm(form); });
    link('showSignup', 'signupForm');
    link('showLogin', 'loginForm');
    link('showForgotPassword', 'forgotPasswordForm');
    link('showLoginFromReset', 'loginForm');

    byId('loginBtn').addEventListener('click', async () => {
        const email = byId('loginEmail').value;
        const password = byId('loginPassword').value;
        if (!email || !password) return;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) showMessage('error', error.message);
        else signedIn(data.user);
    });

    byId('signupBtn').addEventListener('click', async () => {
        const email = byId('signupEmail').value;
        const password = byId('signupPassword').value;
        if (password !== byId('signupPasswordConfirm').value) return showMessage('error', 'Passwords do not match');
        if (!email || !password) return;

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return showMessage('error', error.message);
        if (data.user) {
            await supabase.from('user_profiles').insert([{ id: data.user.id, email }]);
        }
        showMessage('success', 'Account created! Please check your email to verify your account, then sign in.');
        setTimeout(() => showAuthForm('loginForm'), 3000);
    });

    byId('resetPasswordBtn').addEventListener('click', async () => {
        const email = byId('resetEmail').value;
        if (!email) return showMessage('error', 'Please enter your email');
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: PASSWORD_RESET_REDIRECT });
        if (error) return showMessage('error', error.message);
        showMessage('success', 'Password reset link sent! Check your email.');
        byId('resetEmail').value = '';
    });

    byId('updatePasswordBtn').addEventListener('click', async () => {
        const password = byId('newPassword').value;
        if (password !== byId('confirmNewPassword').value) return showMessage('error', 'Passwords do not match');
        if (password.length < 6) return showMessage('error', 'Password must be at least 6 characters');

        const { error } = await supabase.auth.updateUser({ password });
        if (error) return showMessage('error', error.message);
        showMessage('success', 'Password updated successfully!');
        setTimeout(() => signedIn(state.user), 1500);
    });

    registerActions({
        logout: async () => {
            await supabase.auth.signOut();
            state.user = null;
            emit('auth:signed-out');
            showAuthForm('loginForm');
            showApp(false);
        },
    });
}

export async function startAuth() {
    wireForms();
    await checkAuth();
}
