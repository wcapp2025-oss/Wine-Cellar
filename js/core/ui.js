import { emit } from './state.js';
import { escapeHtml } from './utils.js';

// ---------- Tabs ----------
// Tab buttons and dashboard boxes use data-tab="inventory" (matches the panel id "inventoryTab").

export function showTab(name) {
    const panel = document.getElementById(`${name}Tab`);
    if (!panel) return;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === name));
    document.querySelectorAll('.tab-content').forEach(p => p.classList.toggle('active', p === panel));
    emit('tab:shown', name);
}

export function hideTab(name) {
    document.querySelector(`.tab-btn[data-tab="${name}"]`)?.remove();
    document.getElementById(`${name}Tab`)?.remove();
    document.querySelectorAll(`.dashboard-box[data-tab="${name}"]`).forEach(el => el.remove());
}

// ---------- Actions ----------
// Instead of onclick="someGlobalFunction('...')", buttons say data-action="mark-consumed" data-id="123".
// Features register handlers with registerActions(). One click listener runs them,
// each in its own try/catch, so a broken button can't break the page.

const actions = {};

export function registerActions(map) {
    Object.assign(actions, map);
}

document.addEventListener('click', async (e) => {
    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
        const handler = actions[actionEl.dataset.action];
        if (!handler) return console.warn(`No handler for action "${actionEl.dataset.action}"`);
        e.preventDefault();
        e.stopPropagation();
        try {
            await handler(actionEl.dataset, actionEl);
        } catch (err) {
            console.error(`Action "${actionEl.dataset.action}" failed:`, err);
            alert('Something went wrong: ' + (err.message || err));
        }
        return;
    }

    const tabEl = e.target.closest('[data-tab]');
    if (tabEl) showTab(tabEl.dataset.tab);
});

// ---------- Errors ----------

export function showFeatureError(featureName, err, container) {
    const target = container || document.querySelector('.tab-content.active .card') || document.getElementById('mainApp');
    if (!target) return;
    target.querySelectorAll(`.feature-error[data-feature="${featureName}"]`).forEach(el => el.remove());
    const box = document.createElement('div');
    box.className = 'feature-error';
    box.dataset.feature = featureName;
    box.innerHTML = `⚠️ The <strong>${escapeHtml(featureName)}</strong> feature hit an error. The rest of the app still works.
        <code>${escapeHtml(err?.message || err)}</code>`;
    target.prepend(box);
}
