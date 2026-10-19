// The "bottle" sheet: one wine in one specific spot, with big Drink and Move buttons.
// Opened with emit('bottle:open', wineId) from the Cellar shelf view and wine details.
// Drinking or moving takes the bottle out of that spot automatically.

import { state, emit } from '../core/state.js';
import { registerActions, openSheet, closeSheet, toast } from '../core/ui.js';
import { byId, escapeHtml, bottles, bottleSvg } from '../core/utils.js';
import { markConsumed, moveBottles, parentLocations, childLocations } from '../core/data.js';

const byCreation = (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
const placeName = w => [w.parent_location, w.sub_location].filter(Boolean).join(' › ') || 'No location';

function shelfOptions(parentId) {
    const shelves = parentId ? childLocations(parentId).sort(byCreation) : [];
    return shelves.length === 0
        ? '<option value="">—</option>'
        : '<option value="">Choose shelf…</option>' + shelves.map(s =>
            `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');
}

function open(id) {
    const wine = state.wines.find(w => w.id === id);
    if (!wine) return closeSheet();
    const qty = wine.quantity || 1;
    const parents = parentLocations().sort(byCreation);

    const body = openSheet(wine.name, `
        <div class="bottle-here">
            ${wine.photo ? `<img class="wine-thumb" src="${escapeHtml(wine.photo)}" alt="">` : `<div class="wine-thumb">${bottleSvg(wine.type)}</div>`}
            <div>
                <div class="wine-sub">${escapeHtml([wine.vintage || 'NV', wine.type, wine.region].filter(Boolean).join(' · '))}</div>
                <div class="here-place">📍 ${escapeHtml(placeName(wine))}</div>
                <div class="wine-sub">${bottles(qty)} here</div>
            </div>
        </div>

        <div class="action-card">
            <h3>🥂 Drink one</h3>
            <textarea id="bottleNotes" rows="2" placeholder="Tasting notes (optional)"></textarea>
            <button class="btn btn-primary btn-block" data-action="bottle-drink" data-id="${escapeHtml(id)}">Drink one</button>
        </div>

        <div class="action-card">
            <h3>↪️ Move</h3>
            <div class="row-2">
                <div>
                    <label for="moveParent">To</label>
                    <select id="moveParent">
                        <option value="">Choose…</option>
                        ${parents.map(p => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label for="moveShelf">Shelf</label>
                    <select id="moveShelf" disabled><option value="">—</option></select>
                </div>
            </div>
            ${qty > 1 ? `
                <label for="moveCount">How many</label>
                <div class="stepper">
                    <button type="button" class="btn btn-secondary" data-action="move-count" data-step="-1" data-max="${qty}" aria-label="Fewer">−</button>
                    <input type="number" id="moveCount" inputmode="numeric" min="1" max="${qty}" value="1">
                    <button type="button" class="btn btn-secondary" data-action="move-count" data-step="1" data-max="${qty}" aria-label="More">+</button>
                </div>` : ''}
            <button class="btn btn-secondary btn-block" data-action="bottle-move" data-id="${escapeHtml(id)}">Move</button>
        </div>

        <button class="btn btn-secondary btn-block" data-action="bottle-details" data-id="${escapeHtml(id)}" style="background:none;color:var(--accent)">All details for this wine ›</button>`);

    body.querySelector('#moveParent').addEventListener('change', e => {
        const shelf = body.querySelector('#moveShelf');
        shelf.innerHTML = shelfOptions(e.target.value);
        shelf.disabled = shelf.options.length <= 1;
    });
}

export function init({ on }) {
    registerActions({
        'bottle-drink': async ({ id }, button) => {
            const wine = state.wines.find(w => w.id === id);
            if (!wine) return;
            button.disabled = true;
            try {
                await markConsumed(id, byId('bottleNotes')?.value.trim() || '');
            } catch (error) {
                button.disabled = false;
                return toast('Could not save: ' + error.message, 'error');
            }
            closeSheet();
            toast(`🥂 Enjoy! ${wine.name} moved to History`);
        },

        'move-count': ({ step, max }) => {
            const input = byId('moveCount');
            input.value = Math.min(Number(max), Math.max(1, (parseInt(input.value) || 1) + Number(step)));
        },

        'bottle-move': async ({ id }, button) => {
            const wine = state.wines.find(w => w.id === id);
            const parent = state.locations.find(l => l.id === byId('moveParent').value);
            const shelfSelect = byId('moveShelf');
            if (!wine) return;
            if (!parent) return toast('Choose where to move it', 'error');
            if (!shelfSelect.disabled && !shelfSelect.value) return toast('Choose a shelf', 'error');

            const shelf = shelfSelect.disabled ? '' : shelfSelect.value;
            if (parent.name === wine.parent_location && shelf === (wine.sub_location || '')) {
                return toast("It's already there", 'error');
            }
            const count = parseInt(byId('moveCount')?.value) || 1;

            button.disabled = true;
            try {
                await moveBottles(id, count, parent.name, shelf);
            } catch (error) {
                button.disabled = false;
                return toast('Could not move: ' + error.message, 'error');
            }
            closeSheet();
            toast(`Moved ${bottles(count)} to ${[parent.name, shelf].filter(Boolean).join(' › ')}`);
        },

        'bottle-details': ({ id }) => emit('wine:show', id),
    });

    on('bottle:open', open);
}
