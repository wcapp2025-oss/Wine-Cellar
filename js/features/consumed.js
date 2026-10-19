// History tab: bottles you've opened, newest first, with tasting notes.

import { state } from '../core/state.js';
import { registerActions, toast } from '../core/ui.js';
import { byId, escapeHtml, bottleSvg } from '../core/utils.js';
import { deleteConsumed } from '../core/data.js';

function monthLabel(date) {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function render() {
    const container = byId('consumedList');

    if (state.consumedWines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big">🥂</div>
                <p>Nothing here yet.</p>
                <p>Open a wine and tap <b>Drink 1</b> to log it.</p>
            </div>`;
        return;
    }

    const sorted = [...state.consumedWines].sort((a, b) => new Date(b.consumed_date) - new Date(a.consumed_date));
    const months = new Map();
    sorted.forEach(w => {
        const label = monthLabel(new Date(w.consumed_date));
        if (!months.has(label)) months.set(label, []);
        months.get(label).push(w);
    });

    container.innerHTML = [...months.entries()].map(([month, list]) => `
        <div class="list-group-title">${escapeHtml(month)}</div>
        <div class="list-group">
            ${list.map(wine => `
                <div class="history-item">
                    <div class="history-head">
                        <div class="wine-row" style="padding:0;border:none">
                            ${wine.photo ? `<img class="wine-thumb" src="${escapeHtml(wine.photo)}" alt="">` : `<div class="wine-thumb">${bottleSvg(wine.type)}</div>`}
                            <div class="wine-main">
                                <div class="wine-title">${escapeHtml(wine.name)}</div>
                                <div class="wine-sub">${escapeHtml([wine.vintage || 'NV', wine.type, new Date(wine.consumed_date).toLocaleDateString()].filter(Boolean).join(' · '))}</div>
                            </div>
                        </div>
                        <button class="btn btn-small btn-secondary" data-action="delete-consumed" data-id="${escapeHtml(wine.id)}" aria-label="Delete from history">🗑️</button>
                    </div>
                    ${wine.consumed_notes ? `<div class="history-notes">${escapeHtml(wine.consumed_notes)}</div>` : ''}
                </div>`).join('')}
        </div>`).join('');
}

export function init({ on }) {
    registerActions({
        'delete-consumed': async ({ id }) => {
            if (!confirm('Delete this from your history?')) return;
            try {
                await deleteConsumed(id);
                toast('Deleted');
            } catch (error) {
                console.error('Error:', error);
                toast('Could not delete: ' + error.message, 'error');
            }
        },
    });

    on('data:changed', render);
}
