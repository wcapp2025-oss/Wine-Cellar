// Wines tab: search, filters, the grouped wine list, and the vintage / detail pop-ups.

import { state, emit } from '../core/state.js';
import { registerActions } from '../core/ui.js';
import { byId, escapeHtml, bottles, uniqueSorted, optionsHtml } from '../core/utils.js';
import { markConsumed } from '../core/data.js';

const FILTERS = [
    { id: 'filterCountry', field: 'country', label: 'All Countries' },
    { id: 'filterRegion', field: 'region', label: 'All Regions' },
    { id: 'filterSubRegion', field: 'sub_region', label: 'All Sub-regions' },
    { id: 'filterVintage', field: 'vintage', label: 'All Vintages', newestFirst: true },
];

const groupKey = w => `${w.name}|${w.region}|${w.type}`;

function photoHtml(photo) {
    return photo
        ? `<img src="${escapeHtml(photo)}" class="wine-photo">`
        : '<div class="wine-photo" style="background: #e5e7eb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 1.5em;">🍷</div>';
}

function updateFilterDropdowns() {
    for (const { id, field, label, newestFirst } of FILTERS) {
        const select = byId(id);
        const current = select.value;
        let values = uniqueSorted(state.wines.map(w => w[field] == null ? '' : String(w[field])));
        if (newestFirst) values = values.reverse();
        select.innerHTML = `<option value="">${label}</option>` + optionsHtml(values, current);
    }
}

function filteredWines() {
    const search = byId('searchBox').value.toLowerCase();
    const type = byId('filterType').value;
    let list = [...state.wines];

    if (search) {
        list = list.filter(w => ['name', 'region', 'sub_region', 'vintage', 'country']
            .some(f => w[f] != null && String(w[f]).toLowerCase().includes(search)));
    }
    if (type) list = list.filter(w => w.type === type);
    for (const { id, field } of FILTERS) {
        const value = byId(id).value;
        if (value) list = list.filter(w => String(w[field] ?? '') === value);
    }
    return list;
}

function renderWines() {
    const container = byId('wineList');

    if (state.wines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 3em; margin-bottom: 10px;">🍾</div>
                <p>No wines yet. Add your first bottle!</p>
            </div>`;
        return;
    }

    updateFilterDropdowns();

    // Group by name + region + type; count vintages within each group
    const groups = new Map();
    for (const wine of filteredWines()) {
        const key = groupKey(wine);
        if (!groups.has(key)) groups.set(key, { ...wine, key, totalQuantity: 0, vintages: new Set() });
        const g = groups.get(key);
        g.totalQuantity += wine.quantity;
        g.vintages.add(wine.vintage || 'NV');
    }

    const sorted = [...groups.values()].sort((a, b) =>
        (a.region || 'No region').toLowerCase().localeCompare((b.region || 'No region').toLowerCase()) ||
        (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()));

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div style="font-size: 2em; margin-bottom: 10px;">🔍</div>
                <p>No wines match your filters</p>
            </div>`;
        return;
    }

    container.innerHTML = sorted.map(g => {
        const vintageText = g.vintages.size === 1 ? [...g.vintages][0] : `${g.vintages.size} vintages`;
        const details = [
            g.region && `<strong>${escapeHtml(g.region)}</strong>`,
            g.sub_region && escapeHtml(g.sub_region),
            escapeHtml(vintageText),
            g.type && escapeHtml(g.type),
            g.country && escapeHtml(g.country),
            `<strong>${bottles(g.totalQuantity)}</strong>`,
        ].filter(Boolean).join(' • ');

        return `
            <div class="wine-item-compact" data-action="show-vintages" data-key="${escapeHtml(g.key)}" style="cursor: pointer;">
                ${photoHtml(g.photo)}
                <div class="wine-info">
                    <div class="wine-name-compact">${escapeHtml(g.name)}</div>
                    <div class="wine-details-compact">${details}</div>
                </div>
                <div class="wine-actions-compact">
                    <button data-action="show-vintages" data-key="${escapeHtml(g.key)}" style="background: #722f37; padding: 5px 10px; font-size: 0.75em; width: auto;">📅</button>
                </div>
            </div>`;
    }).join('');
}

function showVintages({ key }) {
    const matching = state.wines.filter(w => groupKey(w) === key);
    if (matching.length === 0) return;

    const byVintage = {};
    for (const wine of matching) (byVintage[wine.vintage || 'NV'] ||= []).push(wine);

    const entries = Object.entries(byVintage).sort(([a], [b]) => {
        if (a === 'NV') return 1;
        if (b === 'NV') return -1;
        return String(b).localeCompare(String(a)); // Most recent first
    });

    byId('vintageWineName').textContent = matching[0].name;
    byId('vintageDetailContent').innerHTML = entries.map(([vintage, list]) => {
        const ids = escapeHtml(list.map(w => w.id).join(','));
        const qty = list.reduce((sum, w) => sum + w.quantity, 0);
        return `
            <div style="margin-bottom: 20px; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div data-action="show-wine-detail" data-ids="${ids}" style="background: #f9fafb; padding: 16px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 1.1em; font-weight: 600; color: #722f37;">${vintage === 'NV' ? 'Non-Vintage' : escapeHtml(vintage)}</div>
                        <div style="color: #6b7280; font-size: 0.9em; margin-top: 4px;">${bottles(qty)} • ${list.length} ${list.length > 1 ? 'locations' : 'location'}</div>
                    </div>
                    <button data-action="show-wine-detail" data-ids="${ids}" style="width: auto; padding: 8px 16px; background: #722f37;">View Locations →</button>
                </div>
            </div>`;
    }).join('');

    byId('vintageDetailModal').style.display = 'flex';
}

function showWineDetail({ ids }) {
    const idList = ids.split(',');
    const instances = state.wines.filter(w => idList.includes(w.id));
    const wine = instances[0];
    if (!wine) return closeWineDetail();

    const total = instances.reduce((sum, w) => sum + w.quantity, 0);
    const row = (label, value) => value ? `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>` : '';

    byId('detailWineName').textContent = wine.name;
    byId('wineDetailContent').innerHTML = `
        ${wine.photo ? `<img src="${escapeHtml(wine.photo)}" style="width: 100%; max-height: 300px; object-fit: contain; border-radius: 8px; margin-bottom: 20px;">` : ''}
        <div style="margin-bottom: 20px;">
            <h4 style="color: #722f37; margin-bottom: 10px;">Wine Details</h4>
            ${row('Vintage', wine.vintage)}
            ${row('Type', wine.type)}
            ${row('Country', wine.country)}
            ${row('Region', wine.region)}
            ${row('Sub-region', wine.sub_region)}
            <p><strong>Total Quantity:</strong> ${bottles(total)}</p>
            ${row('Notes', wine.notes)}
        </div>
        <div style="margin-bottom: 20px;">
            <h4 style="color: #722f37; margin-bottom: 10px;">Storage Locations</h4>
            ${instances.map(w => `
                <div style="background: #f9fafb; padding: 12px; border-radius: 6px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 600;">${escapeHtml(w.location)}</div>
                        <div style="font-size: 0.9em; color: #6b7280;">${bottles(w.quantity)}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <button data-action="edit-wine" data-id="${escapeHtml(w.id)}" style="width: auto; padding: 6px 12px; background: #3b82f6; font-size: 0.85em;">Edit</button>
                        <button data-action="mark-consumed" data-id="${escapeHtml(w.id)}" class="consumed-btn" style="width: auto; padding: 6px 12px; font-size: 0.85em;">Consumed</button>
                    </div>
                </div>`).join('')}
        </div>`;

    byId('wineDetailModal').style.display = 'flex';
}

function closeVintages() {
    byId('vintageDetailModal').style.display = 'none';
}

function closeWineDetail() {
    byId('wineDetailModal').style.display = 'none';
}

export function init({ on }) {
    ['filterType', ...FILTERS.map(f => f.id)].forEach(id => byId(id).addEventListener('change', renderWines));

    let searchTimeout;
    byId('searchBox').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderWines, 300);
    });

    registerActions({
        'show-vintages': showVintages,
        'show-wine-detail': showWineDetail,
        'close-vintages': closeVintages,
        'close-wine-detail': closeWineDetail,
        'clear-filters': () => {
            byId('searchBox').value = '';
            ['filterType', ...FILTERS.map(f => f.id)].forEach(id => { byId(id).value = ''; });
            renderWines();
        },
        'edit-wine': ({ id }) => {
            closeWineDetail();
            closeVintages();
            emit('wine:edit', id);
        },
        'mark-consumed': async ({ id }) => {
            const wine = state.wines.find(w => w.id === id);
            if (!wine) return;
            const notes = prompt('Tasting notes:', wine.notes || '');
            if (notes === null) return;
            try {
                await markConsumed(id, notes);
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to mark as consumed: ' + error.message);
                return;
            }
            // Refresh the open pop-up so the consumed bottle disappears from it
            const remaining = state.wines.filter(w => groupKey(w) === groupKey(wine));
            if (remaining.length) showVintages({ key: groupKey(wine) });
            else closeVintages();
            closeWineDetail();
        },
    });

    on('data:changed', renderWines);
}
