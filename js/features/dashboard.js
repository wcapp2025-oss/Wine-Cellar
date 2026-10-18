// Home tab: bottle counts and collection breakdown.

import { state } from '../core/state.js';
import { byId } from '../core/utils.js';
import { parentLocations } from '../core/data.js';

const sumQty = list => list.reduce((sum, w) => sum + (w.quantity || 0), 0);
const countUnique = values => new Set(values.filter(Boolean)).size;

function render() {
    const { wines } = state;

    byId('dashTotalBottles').textContent = sumQty(wines);
    byId('dashConsumedBottles').textContent = state.consumedWines.length;
    byId('dashLocations').textContent = parentLocations().length;

    byId('statRed').textContent = sumQty(wines.filter(w => w.type === 'Red'));
    byId('statWhite').textContent = sumQty(wines.filter(w => w.type === 'White'));
    byId('statRose').textContent = sumQty(wines.filter(w => w.type === 'Rosé'));
    byId('statSparkling').textContent = sumQty(wines.filter(w => w.type === 'Sparkling'));

    byId('statCountries').textContent = countUnique(wines.map(w => w.country));
    byId('statRegions').textContent = countUnique(wines.map(w => w.region));
    byId('statVintages').textContent = countUnique(wines.map(w => w.vintage));
    byId('statUniqueWines').textContent = countUnique(wines.map(w => `${w.name}|${w.region}`));
}

export function init({ on }) {
    on('data:changed', render);
    on('tab:shown', tab => { if (tab === 'dashboard') render(); });
}
