// Wines tab: search, type chips, extra filters, the wine list, and the wine detail sheet
// (vintages, where each bottle is, drink / edit / show in cellar).

import { state, emit } from '../core/state.js';
import { registerActions, openSheet, closeSheet, showTab } from '../core/ui.js';
import { byId, escapeHtml, bottles, uniqueSorted, optionsHtml, bottleSvg, typeKey } from '../core/utils.js';

const EXTRA_FILTERS = [
    { field: 'country', label: 'Country', all: 'All countries' },
    { field: 'region', label: 'Region', all: 'All regions' },
    { field: 'sub_region', label: 'Sub-region', all: 'All sub-regions' },
    { field: 'vintage', label: 'Vintage', all: 'All vintages', newestFirst: true },
];

const filters = { type: '', country: '', region: '', sub_region: '', vintage: '' };

const NO_REGION = 'No region';
let currentRegion = null; // null = showing the region list

const groupKey = w => `${w.name}|${w.region}|${w.type}`;
const regionOf = w => w.region || NO_REGION;
// Lowercase without accents, so "chateau" finds "Château"
const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const sumQty = list => list.reduce((sum, w) => sum + (w.quantity || 0), 0);

function thumbHtml(wine) {
    return wine.photo
        ? `<img class="wine-thumb" src="${escapeHtml(wine.photo)}" alt="">`
        : `<div class="wine-thumb">${bottleSvg(wine.type)}</div>`;
}

function filteredWines() {
    const search = plain(byId('searchBox').value.trim());
    return state.wines.filter(w => {
        if (search && !['name', 'region', 'sub_region', 'vintage', 'country']
            .some(f => w[f] != null && plain(String(w[f])).includes(search))) return false;
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

    const matching = filteredWines();
    const searching = byId('searchBox').value.trim() !== '';

    if (matching.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="big">🔍</div><p>No wines match.</p></div>`;
        return;
    }

    // Start page: regions to tap into. Searching skips straight to matching wines.
    if (!searching && currentRegion === null) return renderRegions(container, matching);

    const inView = searching ? matching : matching.filter(w => regionOf(w) === currentRegion);
    if (inView.length === 0) {
        currentRegion = null;
        return renderRegions(container, matching);
    }

    // Group by name + region + type
    const groups = new Map();
    for (const wine of inView) {
        const key = groupKey(wine);
        if (!groups.has(key)) groups.set(key, { ...wine, key, total: 0, vintages: new Set() });
        const g = groups.get(key);
        g.total += wine.quantity || 0;
        g.vintages.add(wine.vintage || 'NV');
    }

    // Section per region, A–Z
    const byRegion = new Map();
    [...groups.values()]
        .sort((a, b) => (a.region || '~').localeCompare(b.region || '~') || (a.name || '').localeCompare(b.name || ''))
        .forEach(g => {
            const region = regionOf(g);
            if (!byRegion.has(region)) byRegion.set(region, []);
            byRegion.get(region).push(g);
        });

    const header = searching ? '' : `
        <button class="back-link" data-action="all-regions">‹ All regions</button>
        <h2 class="region-title">${escapeHtml(currentRegion)}</h2>`;

    container.innerHTML = header + [...byRegion.entries()].map(([region, list]) => `
        ${searching ? `<div class="list-group-title">${escapeHtml(region)}</div>` : ''}
        <div class="list-group"${searching ? '' : ' style="margin-top:10px"'}>
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

// Regions grouped under their country, each with its wine and bottle count.
function renderRegions(container, wines) {
    const countries = new Map();
    for (const w of wines) {
        const country = w.country || 'Other';
        if (!countries.has(country)) countries.set(country, new Map());
        const regions = countries.get(country);
        const region = regionOf(w);
        if (!regions.has(region)) regions.set(region, { bottles: 0, names: new Set(), types: new Set() });
        const r = regions.get(region);
        r.bottles += w.quantity || 0;
        r.names.add(`${w.name}|${w.type}`);
        if (w.type) r.types.add(w.type);
    }

    const sortedCountries = [...countries.keys()].sort((a, b) => a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b));

    container.innerHTML = sortedCountries.map(country => {
        const regions = [...countries.get(country).entries()]
            .sort(([a], [b]) => a === NO_REGION ? 1 : b === NO_REGION ? -1 : a.localeCompare(b));
        return `
            <div class="list-group-title">${escapeHtml(country)}</div>
            <div class="list-group">
                ${regions.map(([region, r]) => `
                    <button class="wine-row" data-action="open-region" data-region="${escapeHtml(region)}">
                        <div class="region-dots">${[...r.types].map(t => `<i class="dot dot-${typeKey(t)}"></i>`).join('')}</div>
                        <div class="wine-main">
                            <div class="wine-title">${escapeHtml(region)}</div>
                            <div class="wine-sub">${r.names.size} ${r.names.size === 1 ? 'wine' : 'wines'}</div>
                        </div>
                        <span class="count-pill">${r.bottles}</span>
                        <span class="chevron">›</span>
                    </button>`).join('')}
            </div>`;
    }).join('');
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
                            <button class="btn btn-small btn-primary" data-action="drink-move" data-id="${escapeHtml(w.id)}">Drink / Move</button>
                        </div>
                    </div>`).join('')}
            </div>`).join('')}`);
}

export function init({ on }) {
    let searchTimeout;
    byId('searchBox').addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(renderWines, 200);
    });

    registerActions({
        'show-wine': showWine,
        'open-region': ({ region }) => {
            currentRegion = region;
            renderWines();
            window.scrollTo(0, 0);
        },
        'all-regions': () => {
            currentRegion = null;
            renderWines();
            window.scrollTo(0, 0);
        },
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
        'drink-move': ({ id }) => emit('bottle:open', id),
    });

    on('data:changed', renderWines);
    on('wine:show', id => {
        const wine = state.wines.find(w => w.id === id);
        if (wine) showWine({ key: groupKey(wine) });
    });
}
