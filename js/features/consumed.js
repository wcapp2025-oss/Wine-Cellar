// Consumed tab: history of bottles you've drunk, with tasting notes.

import { state } from '../core/state.js';
import { registerActions } from '../core/ui.js';
import { byId, escapeHtml } from '../core/utils.js';
import { deleteConsumed } from '../core/data.js';

function render() {
    const container = byId('consumedList');

    if (state.consumedWines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3em; margin-bottom: 10px;">🥂</div>
                <p>No consumed wines yet.</p>
                <p>Mark a wine as consumed to see it here!</p>
            </div>`;
        return;
    }

    const sorted = [...state.consumedWines].sort((a, b) => new Date(b.consumed_date) - new Date(a.consumed_date));

    container.innerHTML = sorted.map(wine => `
        <div class="wine-item">
            ${wine.photo ? `<img src="${escapeHtml(wine.photo)}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">` : ''}
            <div class="wine-name">${escapeHtml(wine.name)}</div>
            <div class="wine-details">
                ${wine.vintage ? `${escapeHtml(wine.vintage)} • ` : ''}
                ${wine.type ? `${escapeHtml(wine.type)} • ` : ''}
                Consumed on ${new Date(wine.consumed_date).toLocaleDateString()}
            </div>
            ${wine.consumed_notes ? `
                <div style="background: #fef3c7; padding: 10px; border-radius: 6px; margin-top: 10px;">
                    <strong>Tasting Notes:</strong> ${escapeHtml(wine.consumed_notes)}
                </div>` : ''}
            <div class="wine-actions">
                <button class="delete-btn" data-action="delete-consumed" data-id="${escapeHtml(wine.id)}">Delete from History</button>
            </div>
        </div>`).join('');
}

export function init({ on }) {
    registerActions({
        'delete-consumed': async ({ id }) => {
            if (!confirm('Delete this wine from history?')) return;
            try {
                await deleteConsumed(id);
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to delete: ' + error.message);
            }
        },
    });

    on('data:changed', render);
}
