import { emit } from './state.js';
import { escapeHtml } from './utils.js';

// ---------- Tabs ----------
// Tab-bar buttons use data-tab="wines" (matches the panel id "winesTab").

export function showTab(name) {
    const panel = document.getElementById(`${name}Tab`);
    if (!panel) return;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
    document.querySelectorAll('.tab-content').forEach(p => p.classList.toggle('active', p === panel));
    if (name === 'more') closeSubpage();
    window.scrollTo(0, 0);
    emit('tab:shown', name);
}

export function hideTab(name) {
    document.querySelector(`.tab-btn[data-tab="${name}"]`)?.remove();
    document.getElementById(`${name}Tab`)?.remove();
}

// ---------- Sub-pages inside the More tab ----------

export function openSubpage(name) {
    const more = document.getElementById('moreTab');
    more.classList.add('show-subpage');
    more.querySelectorAll('.subpage').forEach(p => p.classList.toggle('active', p.dataset.subpage === name));
    window.scrollTo(0, 0);
    emit('subpage:shown', name);
}

export function closeSubpage() {
    const more = document.getElementById('moreTab');
    more?.classList.remove('show-subpage');
    more?.querySelectorAll('.subpage').forEach(p => p.classList.remove('active'));
}

// ---------- Bottom sheet ----------
// One shared pop-up that slides up from the bottom. Pass a title and HTML.

export function openSheet(title, html) {
    document.getElementById('sheetTitle').textContent = title;
    document.getElementById('sheetBody').innerHTML = html;
    document.getElementById('sheet').hidden = false;
    document.body.style.overflow = 'hidden';
    return document.getElementById('sheetBody');
}

export function closeSheet() {
    document.getElementById('sheet').hidden = true;
    document.body.style.overflow = '';
}

export function isSheetOpen() {
    return !document.getElementById('sheet').hidden;
}

// ---------- Toast (short message at the bottom) ----------

let toastTimer;
export function toast(message, kind = 'info') {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.className = `toast ${kind}`;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, kind === 'error' ? 5000 : 2500);
}

// ---------- Actions ----------
// Buttons say data-action="mark-consumed" data-id="123". Features register handlers with
// registerActions(). One click listener runs them, each in its own try/catch.

const actions = {
    'close-sheet': closeSheet,
};

export function registerActions(map) {
    Object.assign(actions, map);
}

document.addEventListener('click', async (e) => {
    // Tap on the dark area around the sheet closes it
    if (e.target.id === 'sheet') return closeSheet();

    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
        const handler = actions[actionEl.dataset.action];
        if (!handler) return console.warn(`No handler for action "${actionEl.dataset.action}"`);
        e.preventDefault();
        try {
            await handler(actionEl.dataset, actionEl);
        } catch (err) {
            console.error(`Action "${actionEl.dataset.action}" failed:`, err);
            toast('Something went wrong: ' + (err.message || err), 'error');
        }
        return;
    }

    const openEl = e.target.closest('[data-open]');
    if (openEl) return openSubpage(openEl.dataset.open);

    if (e.target.closest('[data-close]')) return closeSubpage();

    const tabEl = e.target.closest('[data-tab]');
    if (tabEl) showTab(tabEl.dataset.tab);
});

document.addEventListener('keydown', e => { if (e.key === 'Escape' && isSheetOpen()) closeSheet(); });

// ---------- Errors ----------

export function showFeatureError(featureName, err, container) {
    const target = container || document.querySelector('.tab-content.active') || document.getElementById('mainApp');
    if (!target) return;
    target.querySelectorAll(`.feature-error[data-feature="${featureName}"]`).forEach(el => el.remove());
    const box = document.createElement('div');
    box.className = 'feature-error';
    box.dataset.feature = featureName;
    box.innerHTML = `⚠️ <strong>${escapeHtml(featureName)}</strong> hit an error. The rest of the app still works.
        <code>${escapeHtml(err?.message || err)}</code>`;
    target.prepend(box);
}
