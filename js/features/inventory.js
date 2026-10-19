// Wines tab: search, type chips, extra filters, the wine list, and the wine detail sheet
// (vintages, where each bottle is, drink / edit / show in cellar).

import { state, emit } from '../core/state.js';
import { registerActions, openSheet, closeSheet, showTab, toast } from '../core/ui.js';
import { byId, escapeHtml, bottles, uniqueSorted, optionsHtml, bottleSvg } from '../core/utils.js';
import { markConsumed } from '../core/data.js';

const EXTRA_FILTERS = [
    { field: 'country', label: 'Country', all: 'All countries' },
    { field: 'region', label: 'Region', all: 'All regions' },
    { field: 'sub_region', label: 'Sub-region', all: 'All sub-regions' },
    { field: 'vintage', label: 'Vintage', all: 'All vintages', newestFirst: true },
];

const filters = { type: '', country: '', region: '', sub_region: '', vintage: '' };

const groupKey = w => `${w.name}|${w.region}|${w.type}`;
const sumQty = list => list.reduce((sum, w) => sum + (w.quantity || 0), 0);

function thumbHtml(wine) {
    return wine.photo
        ? `<img class="wine-thumb" src="${escapeHtml(wine.photo)}" alt="">`
        : `<div class="wine-thumb">${bottleSvg(wine.type)}</div>`;
}

function filteredWines() {
    const search = byId('searchBox').value.trim().toLowerCase();
    return state.wines.filter(w => {
        if (search && !['name', 'region', 'sub_region', 'vintage', 'country']
            .some(f => w[f] != null && String(w[f]).toLowerCase().includes(search))) return false;
        if (filters.type && w.type !== filters.type) return false;
        return EXTRA_FILTERS.every(({ field }) => !filters[field] || String(w[field] ?? '') === filters[field]);
    });
}

function renderWines() {
    const container = byId('wineList');
    const total = sumQty(state.wines);
    byId('winesSummary').textContent = state.wines.length ? `${bottles(total)} in your collection` : '';

    if (state.wines.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="big">🍾</div>
                <p>No wines yet.</p>
                <button class="btn btn-primary" data-tab="addWine" style="margin-top:14px">Add your first bottle</button>
            </div>`;
        return;
    }

    // Group by name + region + type
    const groups = new Map();
    for (const wine of filteredWines()) {
        const key = groupKey(wine);
        if (!groups.has(key)) groups.set(key, { ...wine, key, total: 0, vintages: new Set() });
        const g = groups.get(key);
        g.total += wine.quantity || 0;
        g.vintages.add(wine.vintage || 'NV');
    }

    if (groups.size === 0) {
        container.innerHTML = `<div class="empty-state"><div class="big">🔍</div><p>No wines match.</p></div>`;
        return;
    }

    // Section per region, A–Z
    const byRegion = new Map();
    [...groups.values()]
        .sort((a, b) => (a.region || '~').localeCompare(b.region || '~') || (a.name || '').localeCompare(b.name || ''))
        .forEach(g => {
            const region = g.region || 'No region';
            if (!byRegion.has(region)) byRegion.set(region, []);
            byRegion.get(region).push(g);
        });

    container.innerHTML = [...byRegion.entries()].map(([region, list]) => `
        <div class="list-group-title">${escapeHtml(region)}</div>
        <div class="list-group">
            ${list.map(g => {
                const vintageText = g.vintages.size === 1 ? [...g.vintages][0] : `${g.vintages.size} vintages`;
                const sub = [vintageText, g.sub_region, g.country].filter(Boolean).map(escapeHtml).join(' · ');
                return `
                    <button class="wine-row" data-action="show-wine" data-key="${escapeHtml(g.key)}">
                        ${thumbHtml(g)}
                        <div class="wine-main">
                            <div class="wine-title">${escapeHtml(g.name)}</div>
                            <div class="wine-sub">${sub}</div>
                        </div>
                        <span class="count-pill">${g.total}</span>
                    </button>`;
            }).join('')}
        </div>`).join('');
}

function updateFiltersChip() {
    const active = EXTRA_FILTERS.filter(f => filters[f.field]).length;
    const chip = byId('moreFiltersChip');
    chip.textContent = active ? `Filters (${active})` : 'Filters';
    chip.classList.toggle('has-filters', active > 0);
}

function openFilters() {
    const body = openSheet('Filters', `
        ${EXTRA_FILTERS.map(({ field, label, all, newestFirst }) => {
            let values = uniqueSorted(state.wines.map(w => w[field] == null ? '' : String(w[field])));
            if (newestFirst) values = values.reverse();
            return `<label>${label}</label>
                <select data-filter="${field}"><option value="">${all}</option>${optionsHtml(values, filters[field])}</select>`;
        }).join('')}
        <div class="row-2" style="margin-top:20px">
            <button class="btn btn-secondary" data-action="clear-filters">Clear</button>
            <button class="btn btn-primary" data-action="close-sheet">Show wines</button>
        </div>`);
    body.querySelectorAll('select[data-filter]').forEach(sel => sel.addEventListener('change', () => {
        filters[sel.dataset.filter] = sel.value;
        updateFiltersChip();
        renderWines();
    }));
}

// ----- Wine detail sheet -----

function showWine({ key }) {
    const matching = state.wines.filter(w => groupKey(w) === key);
    if (matching.length === 0) return closeSheet();
    const first = matching[0];

    const byVintage = {};
    for (const wine of matching) (byVintage[wine.vintage || 'NV'] ||= []).push(wine);
    const vintages = Object.entries(byVintage).sort(([a], [b]) =>
        a === 'NV' ? 1 : b === 'NV' ? -1 : String(b).localeCompare(String(a)));

    const tags = [first.type, first.country, first.region, first.sub_region].filter(Boolean)
        .map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('');
    const notes = [...new Set(matching.map(w => w.notes).filter(Boolean))];

    openSheet(first.name, `
        ${first.photo ? `<img class="detail-photo" src="${escapeHtml(first.photo)}" alt="">` : ''}
        <div class="detail-meta">${tags}<span class="tag">${bottles(sumQty(matching))}</span></div>
        ${notes.map(n => `<p class="detail-notes">${escapeHtml(n)}</p>`).join('')}
        ${vintages.map(([vintage, list]) => `
            <div class="vintage-block">
                <div class="vintage-head"><span>${vintage === 'NV' ? 'Non-vintage' : escapeHtml(vintage)}</span><span>${bottles(sumQty(list))}</span></div>
                ${list.map(w => `
                    <div class="place-row">
                        <div class="place-row-top">
                            <span>📍 ${escapeHtml(w.location || 'No location')}</span>
                            <b>${w.quantity}</b>
                        </div>
                        <div class="place-actions">
                            <button class="btn btn-small btn-secondary" data-action="show-in-cellar" data-id="${escapeHtml(w.id)}">Find</button>
                            <button class="btn btn-small btn-secondary" data-action="edit-wine" data-id="${escapeHtml(w.id)}">Edit</button>
                            <button class="btn btn-small btn-primary" data-action="drink-one" data-id="${escapeHtml(w.id)}">Drink 1</button>
                        </div>
                    </div>`).join('')}
            </div>`).join('')}`);
}

function askTastingNotes(wine) {
    const body = openSheet(`Drink ${wine.name}`, `
        <p class="muted">${escapeHtml([wine.vintage || 'NV', wine.location].filter(Boolean).join(' · '))}</p>
        <label for="tastingNotes">Tasting notes (optional)</label>
        <textarea id="tastingNotes" rows="4" placeholder="How was it?"></textarea>
        <div class="row-2" style="margin-top:16px">
            <button class="btn btn-secondary" data-action="show-wine" data-key="${escapeHtml(groupKey(wine))}">Back</button>
            <button class="btn btn-primary" data-action="confirm-drink" data-id="${escapeHtml(wine.id)}">Mark as drunk</button>
        </div>`);
    body.querySelector('textarea').focus();
}

export function init({ on }) {
    let searchTimeout;
    byId('searchBox').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderWines, 200);
    });

    registerActions({
        'show-wine': showWine,
        'open-filters': openFilters,
        'filter-type': ({ type }) => {
            filters.type = type;
            document.querySelectorAll('#typeChips [data-action="filter-type"]')
                .forEach(c => c.classList.toggle('active', c.dataset.type === type));
            renderWines();
        },
        'clear-filters': () => {
            EXTRA_FILTERS.forEach(f => { filters[f.field] = ''; });
            document.querySelectorAll('#sheetBody select[data-filter]').forEach(s => { s.value = ''; });
            updateFiltersChip();
            renderWines();
        },
        'edit-wine': ({ id }) => {
            closeSheet();
            emit('wine:edit', id);
        },
        'show-in-cellar': ({ id }) => {
            closeSheet();
            showTab('cellar');
            emit('cellar:highlight', [id]);
        },
        'drink-one': ({ id }) => {
            const wine = state.wines.find(w => w.id === id);
            if (wine) askTastingNotes(wine);
        },
        'confirm-drink': async ({ id }, button) => {
            const wine = state.wines.find(w => w.id === id);
            if (!wine) return;
            button.disabled = true;
            try {
                await markConsumed(id, byId('tastingNotes')?.value || '');
            } catch (error) {
                console.error('Error:', error);
                toast('Could not save: ' + error.message, 'error');
                button.disabled = false;
                return;
            }
            toast(`🥂 Enjoy! ${wine.name} added to History`);
            showWine({ key: groupKey(wine) }); // reopens with updated counts, or closes if none left
        },
    });

    on('data:changed', renderWines);
    on('wine:show', id => {
        const wine = state.wines.find(w => w.id === id);
        if (wine) showWine({ key: groupKey(wine) });
    });
}
