// Collection stats at the top of the More tab.

import { state } from '../core/state.js';
import { byId } from '../core/utils.js';
import { parentLocations } from '../core/data.js';

const sumQty = list => list.reduce((sum, w) => sum + (w.quantity || 0), 0);
const countUnique = values => new Set(values.filter(Boolean)).size;
const TYPES = [['Red', 'statRed', 'red'], ['White', 'statWhite', 'white'], ['Rosé', 'statRose', 'rose'], ['Sparkling', 'statSparkling', 'sparkling']];

function render() {
    const { wines } = state;
    const total = sumQty(wines);

    byId('dashTotalBottles').textContent = total;
    byId('dashConsumedBottles').textContent = state.consumedWines.length;
    byId('dashLocations').textContent = parentLocations().length;
    byId('statUniqueWines').textContent = countUnique(wines.map(w => `${w.name}|${w.region}`));

    const bar = [];
    for (const [type, id, key] of TYPES) {
        const count = sumQty(wines.filter(w => w.type === type));
        byId(id).textContent = count;
        if (count) bar.push(`<i style="width:${(count / total) * 100}%;background:var(--wine-${key})"></i>`);
    }
    byId('typeBar').innerHTML = bar.join('');

    byId('statCountries').textContent = countUnique(wines.map(w => w.country));
    byId('statRegions').textContent = countUnique(wines.map(w => w.region));
    byId('statVintages').textContent = countUnique(wines.map(w => w.vintage));
}

export function init({ on }) {
    on('data:changed', render);
}
