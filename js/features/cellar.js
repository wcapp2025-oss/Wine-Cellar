// Cellar tab: draws each fridge / area with its shelves and one bottle per bottle you own,
// colored by type. Tap a bottle to open that wine. "Find" on a wine highlights its bottles here.
//
// Locations: a "parent" location is a fridge/area; its children are shelves (top to bottom
// in the order they were added). Wines store the names in parent_location / sub_location.

import { state, emit } from '../core/state.js';
import { registerActions } from '../core/ui.js';
import { byId, escapeHtml, bottles, bottleSvg } from '../core/utils.js';
import { parentLocations, childLocations } from '../core/data.js';

const MAX_PER_SHELF = 40; // after this, show "+N" so huge shelves stay tidy

let highlighted = new Set();

const byCreation = (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
const sumQty = list => list.reduce((sum, w) => sum + (w.quantity || 0), 0);

function shelfHtml(label, wines) {
    const total = sumQty(wines);
    // One bottle per unit, grouped by type then name so similar bottles sit together
    const units = [];
    [...wines]
        .sort((a, b) => (a.type || '~').localeCompare(b.type || '~') || (a.name || '').localeCompare(b.name || ''))
        .forEach(w => { for (let i = 0; i < (w.quantity || 0); i++) units.push(w); });

    const shown = units.slice(0, MAX_PER_SHELF);
    const bottlesHtml = shown.map(w => `
        <button class="bottle${highlighted.has(w.id) ? ' highlight' : ''}" data-action="cellar-bottle" data-id="${escapeHtml(w.id)}"
            title="${escapeHtml(`${w.name} ${w.vintage || 'NV'}`)}" aria-label="${escapeHtml(`${w.name} ${w.vintage || 'NV'}`)}">
            ${bottleSvg(w.type)}
        </button>`).join('');
    const more = units.length > shown.length ? `<span class="bottle-more">+${units.length - shown.length}</span>` : '';

    return `
        <div class="shelf">
            <div class="shelf-label"><span>${escapeHtml(label)}</span><span>${total || ''}</span></div>
            <div class="bottles">${bottlesHtml || '<span class="shelf-empty">Empty</span>'}${more}</div>
        </div>`;
}

function fridgeHtml(name, shelves) {
    const total = shelves.reduce((sum, s) => sum + sumQty(s.wines), 0);
    return `
        <div class="fridge">
            <div class="fridge-head"><h2>${escapeHtml(name)}</h2><span>${bottles(total)}</span></div>
            <div class="fridge-body">${shelves.map(s => shelfHtml(s.label, s.wines)).join('')}</div>
        </div>`;
}

function render() {
    const container = byId('cellarView');
    const parents = parentLocations().sort(byCreation);

    if (parents.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="big">🗄️</div>
            <p>No fridges or areas yet. Add them under More › Locations.</p></div>`;
        return;
    }

    const placed = new Set();
    const html = parents.map(parent => {
        const inParent = state.wines.filter(w => w.parent_location === parent.name);
        inParent.forEach(w => placed.add(w.id));
        const children = childLocations(parent.id).sort(byCreation);

        if (children.length === 0) return fridgeHtml(parent.name, [{ label: 'All', wines: inParent }]);

        const shelves = children.map(c => ({ label: c.name, wines: inParent.filter(w => w.sub_location === c.name) }));
        const onShelf = new Set(shelves.flatMap(s => s.wines.map(w => w.id)));
        const loose = inParent.filter(w => !onShelf.has(w.id));
        if (loose.length) shelves.push({ label: 'No shelf set', wines: loose });
        return fridgeHtml(parent.name, shelves);
    });

    const unplaced = state.wines.filter(w => !placed.has(w.id));
    if (unplaced.length) html.push(fridgeHtml('Somewhere else', [{ label: 'Location not set', wines: unplaced }]));

    container.innerHTML = html.join('');
}

function highlight(ids) {
    highlighted = new Set(ids);
    render();
    const first = byId('cellarView').querySelector('.bottle.highlight');
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
        highlighted = new Set();
        byId('cellarView').querySelectorAll('.bottle.highlight').forEach(b => b.classList.remove('highlight'));
    }, 4000);
}

export function init({ on }) {
    registerActions({
        'cellar-bottle': ({ id }) => emit('wine:show', id),
    });
    on('data:changed', render);
    on('cellar:highlight', highlight);
}
