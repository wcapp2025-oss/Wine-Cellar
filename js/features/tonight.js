// Tonight tab:
//   • "What are you eating?" → best matches from your own cellar (built-in rules),
//     with an "Ask AI" button for a smarter answer.
//   • Drinking windows: what to drink soon, what's ready now, what to keep waiting on.
// Tap any wine to drink or move it.

import { state, emit } from '../core/state.js';
import { registerActions, toast } from '../core/ui.js';
import { byId, escapeHtml, bottleSvg } from '../core/utils.js';
import { pairWines, windowStatus, windowBadgeHtml, drinkingWindow } from '../core/wine-knowledge.js';
import { askAI, wineForAI } from '../core/ai.js';

const QUICK_FOODS = ['Steak', 'Lamb', 'Chicken', 'Pork', 'Salmon', 'Seafood', 'Pasta with tomato', 'Pizza', 'Mushroom risotto', 'Spicy curry', 'Cheese board', 'Dessert'];

let lastFood = '';

function wineRow(wine, extra = '') {
    return `
        <button class="wine-row" data-action="tonight-open" data-id="${escapeHtml(wine.id)}">
            ${wine.photo ? `<img class="wine-thumb" src="${escapeHtml(wine.photo)}" alt="">` : `<div class="wine-thumb">${bottleSvg(wine.type)}</div>`}
            <div class="wine-main">
                <div class="wine-title">${escapeHtml(wine.name)}</div>
                <div class="wine-sub">${escapeHtml([wine.vintage || 'NV', wine.sub_location || wine.parent_location].filter(Boolean).join(' · '))}</div>
                ${extra}
            </div>
            <span class="count-pill">${wine.quantity}</span>
        </button>`;
}

const aiButton = label => `<button class="btn btn-ai btn-block" data-action="ask-ai-pairing">✨ ${label}</button>`;

function renderPairing() {
    const box = byId('pairResults');
    if (!lastFood) { box.innerHTML = ''; return; }

    const { foods, picks } = pairWines(lastFood, state.wines);
    if (foods.length === 0) {
        box.innerHTML = `
            <div class="card">
                <p>I don't have a rule for “${escapeHtml(lastFood)}” yet. Try a main ingredient (like chicken or salmon), or ask the AI.</p>
                ${aiButton('Ask AI')}
            </div>`;
        return;
    }
    if (picks.length === 0) {
        box.innerHTML = `
            <div class="card">
                <p>Nothing in your cellar is a classic match for ${escapeHtml(foods.map(f => f.name).join(' / '))}.</p>
                ${aiButton('Ask AI for the best of what I have')}
            </div>`;
        return;
    }

    box.innerHTML = `
        <h2 class="section-title">Best matches for ${escapeHtml(lastFood)}</h2>
        <div class="list-group">
            ${picks.map(p => wineRow(p.wine, `
                <div class="pick-reason">${escapeHtml(p.reason)}</div>
                <div class="pick-meta">${windowBadgeHtml(p.wine)}</div>`)).join('')}
        </div>
        ${aiButton('Ask AI for a second opinion')}
        <div id="aiPairing"></div>`;
}

async function askAIPairing(_, button) {
    if (!lastFood) return toast('Type what you are eating first', 'error');
    if (state.wines.length === 0) return toast('Add some wines first', 'error');

    let target = byId('aiPairing');
    if (!target) {
        byId('pairResults').insertAdjacentHTML('beforeend', '<div id="aiPairing"></div>');
        target = byId('aiPairing');
    }
    button.disabled = true;
    target.innerHTML = '<div class="ai-box">✨ Thinking…</div>';

    try {
        const wines = state.wines.map(w => {
            const s = windowStatus(w);
            return wineForAI(w, { window: s.range || '', readiness: s.key });
        });
        const result = await askAI('pairing', { food: lastFood, wines });
        const picks = (result.picks || [])
            .map(p => ({ ...p, wine: state.wines.find(w => w.id === String(p.id)) }))
            .filter(p => p.wine);

        target.innerHTML = `
            <div class="ai-box">
                <h3>✨ AI suggests</h3>
                ${picks.length ? `<div class="list-group">${picks.map(p => wineRow(p.wine,
                    `<div class="pick-reason">${escapeHtml(p.reason || '')}</div><div class="pick-meta">${windowBadgeHtml(p.wine)}</div>`)).join('')}</div>`
                    : '<p>No good match in your cellar.</p>'}
                ${result.tip ? `<p class="ai-tip">💡 ${escapeHtml(result.tip)}</p>` : ''}
            </div>`;
    } catch (error) {
        target.innerHTML = `<div class="notice notice-error">${escapeHtml(error.message)}</div>`;
    } finally {
        button.disabled = false;
    }
}

function renderWindows() {
    const box = byId('drinkWindows');
    if (state.wines.length === 0) { box.innerHTML = ''; return; }

    const withStatus = state.wines.map(w => ({ wine: w, status: windowStatus(w), win: drinkingWindow(w) }));
    const byEnd = (a, b) => (a.win?.to ?? 9999) - (b.win?.to ?? 9999);

    const soon = withStatus.filter(x => x.status.key === 'soon' || x.status.key === 'past').sort(byEnd);
    const ready = withStatus.filter(x => x.status.key === 'ready').sort(byEnd);
    const young = withStatus.filter(x => x.status.key === 'young').sort((a, b) => a.win.from - b.win.from);
    const bottlesIn = list => list.reduce((sum, x) => sum + (x.wine.quantity || 0), 0);

    const section = (title, list, note, max = 8) => list.length === 0 ? '' : `
        <h2 class="section-title">${title} · ${bottlesIn(list)}</h2>
        ${note ? `<p class="hint" style="margin-top:-4px">${note}</p>` : ''}
        <div class="list-group">
            ${list.slice(0, max).map(x => wineRow(x.wine, `<div class="pick-meta">${windowBadgeHtml(x.wine, true)}</div>`)).join('')}
        </div>
        ${list.length > max ? `<p class="hint">+ ${list.length - max} more</p>` : ''}`;

    box.innerHTML = `
        ${section('Drink soon', soon, 'At the end of their window, or past it')}
        ${section('Ready now', ready, 'In their drinking window, ending soonest first')}
        ${section('Keep waiting', young, 'Will be better with more time', 5)}
        <p class="hint">Windows are estimates from region, type and vintage. ★ = a window you set. Edit a wine to set your own.</p>`;
}

export function init({ on }) {
    byId('foodChips').innerHTML = QUICK_FOODS.map(f =>
        `<button type="button" class="chip" data-action="quick-food" data-food="${escapeHtml(f)}">${escapeHtml(f)}</button>`).join('');

    byId('pairForm').addEventListener('submit', e => {
        e.preventDefault();
        lastFood = byId('foodInput').value.trim();
        byId('foodInput').blur(); // hide the iPhone keyboard
        renderPairing();
    });

    registerActions({
        'quick-food': ({ food }) => {
            byId('foodInput').value = food;
            lastFood = food;
            renderPairing();
        },
        'ask-ai-pairing': askAIPairing,
        'tonight-open': ({ id }) => emit('bottle:open', id),
    });

    on('data:changed', () => { renderPairing(); renderWindows(); });
}
