// Cellar tab, three levels:
//   1. List of locations (fridges / areas)
//   2. Tap one → drawing of that fridge, shelf by shelf, one bottle per bottle owned, colored by type
//   3. Tap a shelf → the wines on that shelf; tap a wine for its details
// "Find" on a wine jumps to its fridge and highlights its bottles.
//
// Locations: a "parent" location is a fridge/area; its children are shelves (top to bottom
// in the order they were added). Wines store the names in parent_location / sub_location.

import { state, emit } from '../core/state.js';
import { registerActions } from '../core/ui.js';
import { byId, escapeHtml, bottles, bottleSvg, typeKey } from '../core/utils.js';
import { parentLocations, childLocations } from '../core/data.js';

const MAX_PER_SHELF = 40; // after this, show "+N" so huge shelves stay tidy
const ELSEWHERE = 'Somewhere else';

let view = { fridge: null, shelf: null }; // fridge = null → location list
let highlighted = new Set();

const byCreation = (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
const sumQty = list => list.reduce((sum, w) => sum + (w.quantity || 0), 0);

// Builds [{ name, shelves: [{ label, wines }] }] from locations and wines.
function buildModel() {
    const placed = new Set();
    const fridges = parentLocations().sort(byCreation).map(parent => {
        const inParent = state.wines.filter(w => w.parent_location === parent.name);
        inParent.forEach(w => placed.add(w.id));
        const children = childLocations(parent.id).sort(byCreation);
        if (children.length === 0) return { name: parent.name, shelves: [{ label: 'All', wines: inParent }] };

        const shelves = children.map(c => ({ label: c.name, wines: inParent.filter(w => w.sub_location === c.name) }));
        const onShelf = new Set(shelves.flatMap(s => s.wines.map(w => w.id)));
        const loose = inParent.filter(w => !onShelf.has(w.id));
        if (loose.length) shelves.push({ label: 'No shelf set', wines: loose });
        return { name: parent.name, shelves };
    });

    const unplaced = state.wines.filter(w => !placed.has(w.id));
    if (unplaced.length) fridges.push({ name: ELSEWHERE, shelves: [{ label: 'Location not set', wines: unplaced }] });
    return fridges;
}

const fridgeWines = fridge => fridge.shelves.flatMap(s => s.wines);

function typeBar(wines) {
    const total = sumQty(wines);
    if (!total) return '';
    const counts = {};
    wines.forEach(w => { const k = typeKey(w.type); counts[k] = (counts[k] || 0) + (w.quantity || 0); });
    return `<div class="type-bar mini">${['red', 'white', 'rose', 'sparkling', 'unknown']
        .filter(k => counts[k]).map(k => `<i style="width:${(counts[k] / total) * 100}%;background:var(--wine-${k})"></i>`).join('')}</div>`;
}

// ----- Level 1: locations -----

function renderList(fridges) {
    if (fridges.length === 0) {
        return `<div class="empty-state"><div class="big">🗄️</div>
            <p>No fridges or areas yet. Add them under More › Locations.</p></div>`;
    }
    return `<div class="list-group">${fridges.map(f => {
        const wines = fridgeWines(f);
        const shelfCount = f.shelves.length === 1 && ['All', 'Location not set'].includes(f.shelves[0].label) ? '' : `${f.shelves.length} shelves · `;
        return `
            <button class="wine-row" data-action="open-fridge" data-fridge="${escapeHtml(f.name)}">
                <div class="wine-thumb location-icon">${f.name === ELSEWHERE ? '❔' : '🗄️'}</div>
                <div class="wine-main">
                    <div class="wine-title">${escapeHtml(f.name)}</div>
                    <div class="wine-sub">${shelfCount}${bottles(sumQty(wines))}</div>
                    ${typeBar(wines)}
                </div>
                <span class="chevron">›</span>
            </button>`;
    }).join('')}</div>`;
}

// ----- Level 2: one fridge, drawn -----

function shelfHtml(shelf, clickable = true) {
    const units = [];
    [...shelf.wines]
        .sort((a, b) => (a.type || '~').localeCompare(b.type || '~') || (a.name || '').localeCompare(b.name || ''))
        .forEach(w => { for (let i = 0; i < (w.quantity || 0); i++) units.push(w); });

    const shown = units.slice(0, MAX_PER_SHELF);
    const bottlesHtml = shown.map(w =>
        `<span class="bottle${highlighted.has(w.id) ? ' highlight' : ''}">${bottleSvg(w.type)}</span>`).join('');
    const more = units.length > shown.length ? `<span class="bottle-more">+${units.length - shown.length}</span>` : '';

    const inner = `
        <div class="shelf-label"><span>${escapeHtml(shelf.label)}</span><span>${units.length || ''}${clickable ? ' ›' : ''}</span></div>
        <div class="bottles">${bottlesHtml || '<span class="shelf-empty">Empty</span>'}${more}</div>`;
    return clickable
        ? `<button class="shelf" data-action="open-shelf" data-shelf="${escapeHtml(shelf.label)}">${inner}</button>`
        : `<div class="shelf">${inner}</div>`;
}

function renderFridge(fridge) {
    return `
        <button class="back-link" data-action="cellar-back">‹ All locations</button>
        <div class="fridge">
            <div class="fridge-head"><h2>${escapeHtml(fridge.name)}</h2><span>${bottles(sumQty(fridgeWines(fridge)))}</span></div>
            <p class="hint" style="margin-top:0">Tap a shelf to see what's on it</p>
            <div class="fridge-body">${fridge.shelves.map(s => shelfHtml(s)).join('')}</div>
        </div>`;
}

// ----- Level 3: one shelf, as a list -----

function renderShelf(fridge, shelf) {
    // Group the same wine + vintage together
    const groups = new Map();
    shelf.wines.forEach(w => {
        const key = `${w.name}|${w.vintage}|${w.type}`;
        if (!groups.has(key)) groups.set(key, { ...w, qty: 0 });
        groups.get(key).qty += w.quantity || 0;
    });
    const list = [...groups.values()].sort((a, b) =>
        (a.type || '~').localeCompare(b.type || '~') || (a.name || '').localeCompare(b.name || ''));

    return `
        <button class="back-link" data-action="cellar-back">‹ ${escapeHtml(fridge.name)}</button>
        <header class="page-header" style="padding-top:4px">
            <h1>${escapeHtml(shelf.label)}</h1>
            <p class="muted">${escapeHtml(fridge.name)} · ${bottles(sumQty(shelf.wines))}</p>
        </header>
        <div class="fridge-body single">${shelfHtml(shelf, false)}</div>
        ${list.length === 0 ? '<div class="empty-state">This shelf is empty.</div>' : `
        <div class="list-group" style="margin-top:14px">
            ${list.map(w => `
                <button class="wine-row" data-action="cellar-wine" data-id="${escapeHtml(w.id)}">
                    ${w.photo ? `<img class="wine-thumb" src="${escapeHtml(w.photo)}" alt="">` : `<div class="wine-thumb">${bottleSvg(w.type)}</div>`}
                    <div class="wine-main">
                        <div class="wine-title">${escapeHtml(w.name)}</div>
                        <div class="wine-sub">${escapeHtml([w.vintage || 'NV', w.type, w.region].filter(Boolean).join(' · '))}</div>
                    </div>
                    <span class="count-pill">${w.qty}</span>
                </button>`).join('')}
        </div>`}`;
}

function render() {
    const container = byId('cellarView');
    const fridges = buildModel();
    const fridge = fridges.find(f => f.name === view.fridge);
    const shelf = fridge?.shelves.find(s => s.label === view.shelf);

    // The legend and page title only make sense on the list
    byId('cellarTab').classList.toggle('cellar-detail', !!fridge);

    if (fridge && shelf) container.innerHTML = renderShelf(fridge, shelf);
    else if (fridge) container.innerHTML = renderFridge(fridge);
    else {
        view = { fridge: null, shelf: null };
        container.innerHTML = renderList(fridges);
    }
}

function go(next) {
    view = next;
    render();
    window.scrollTo(0, 0);
}

function highlight(ids) {
    const fridge = buildModel().find(f => fridgeWines(f).some(w => ids.includes(w.id)));
    highlighted = new Set(ids);
    go({ fridge: fridge?.name || null, shelf: null });
    byId('cellarView').querySelector('.bottle.highlight')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
        highlighted = new Set();
        byId('cellarView').querySelectorAll('.bottle.highlight').forEach(b => b.classList.remove('highlight'));
    }, 4000);
}

export function init({ on }) {
    registerActions({
        'open-fridge': ({ fridge }) => go({ fridge, shelf: null }),
        'open-shelf': ({ shelf }) => go({ fridge: view.fridge, shelf }),
        'cellar-back': () => go(view.shelf ? { fridge: view.fridge, shelf: null } : { fridge: null, shelf: null }),
        'cellar-wine': ({ id }) => emit('wine:show', id),
    });
    on('data:changed', render);
    on('cellar:highlight', highlight);
    // Tapping the Cellar tab starts again from the location list
    on('tab:shown', tab => { if (tab === 'cellar') go({ fridge: null, shelf: null }); });
}
