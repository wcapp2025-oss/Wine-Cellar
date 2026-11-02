// Demo mode for testing on your own computer: http://localhost:8080/?demo
// Skips sign-in and swaps the database for a pretend one in memory, filled with sample wines.
// Nothing is sent to Supabase, and everything resets when you reload.
// Only ever runs on localhost (see app.js), never on the live site.

import { supabase } from '../core/supabase.js';
import { state, emit } from '../core/state.js';

const USER_ID = 'demo-user';
const year = new Date().getFullYear();
let nextId = Date.now();
const id = () => String(nextId++);

const loc = (lid, name, parent = null) => ({ id: lid, name, user_id: USER_ID, is_parent: !parent, parent_id: parent });
const wine = (name, type, vintage, region, country, qty, parent, shelf, extra = {}) => ({
    id: id(), user_id: USER_ID, name, type, vintage: vintage ? String(vintage) : '', region, country, sub_region: '',
    quantity: qty, parent_location: parent, sub_location: shelf,
    location: shelf ? `${parent} - ${shelf}` : parent, notes: '', photo: null,
    date_added: new Date().toISOString(), drink_from: null, drink_to: null, ...extra,
});

function sampleData() {
    return {
        locations: [
            loc('1001', 'Wine Fridge'), loc('1002', 'Top Shelf', '1001'), loc('1003', 'Middle Shelf', '1001'), loc('1004', 'Bottom Shelf', '1001'),
            loc('1005', 'Cellar Rack'), loc('1006', 'Pre-order'),
        ],
        wines: [
            wine('Château Margaux', 'Red', 2015, 'Margaux', 'France', 2, 'Wine Fridge', 'Top Shelf'),
            wine('Château Margaux', 'Red', 2016, 'Margaux', 'France', 1, 'Wine Fridge', 'Middle Shelf'),
            wine("Barbera d'Alba", 'Red', year - 4, 'Piedmont', 'Italy', 4, 'Wine Fridge', 'Bottom Shelf'),
            wine('Barolo Riserva', 'Red', 2019, 'Barolo', 'Italy', 3, 'Cellar Rack', ''),
            wine('Cloudy Bay Sauvignon Blanc', 'White', year - 1, 'Marlborough', 'New Zealand', 3, 'Wine Fridge', 'Top Shelf'),
            wine('Meursault', 'White', 2019, 'Meursault', 'France', 2, 'Wine Fridge', 'Middle Shelf'),
            wine('Riesling Spätlese', 'White', 2018, 'Mosel', 'Germany', 2, 'Wine Fridge', 'Middle Shelf'),
            wine('Whispering Angel', 'Rosé', year - 1, 'Provence', 'France', 4, 'Wine Fridge', 'Bottom Shelf'),
            wine('Dom Pérignon', 'Sparkling', 2013, 'Champagne', 'France', 1, 'Wine Fridge', 'Top Shelf'),
            wine('Veuve Clicquot Brut', 'Sparkling', '', 'Champagne', 'France', 2, 'Wine Fridge', 'Bottom Shelf'),
            wine('Opus One', 'Red', 2020, 'Napa Valley', 'USA', 2, 'Pre-order', '', { drink_from: 2028, drink_to: 2045 }),
            wine('Chianti Classico', 'Red', year - 5, 'Chianti Classico', 'Italy', 2, 'Cellar Rack', ''),
        ],
        consumed_wines: [
            { ...wine('Sassicaia', 'Red', 2016, 'Bolgheri', 'Italy', 1, 'Wine Fridge', 'Top Shelf'),
              consumed_date: new Date(Date.now() - 10 * 864e5).toISOString(), consumed_notes: 'Cherry, cedar, long finish.', consumed_quantity: 1 },
        ],
    };
}

// A tiny stand-in for the Supabase query builder, covering what the app uses.
function fakeDatabase(tables) {
    return function from(table) {
        const rows = () => (tables[table] ||= []);
        let action = 'select', payload = null, filters = [], order = null, limit = null;
        const q = {
            select() { return q; },
            insert(list) { action = 'insert'; payload = list; return q; },
            update(changes) { action = 'update'; payload = changes; return q; },
            delete() { action = 'delete'; return q; },
            eq(field, value) { filters.push(r => String(r[field]) === String(value)); return q; },
            or() { filters.push(() => false); return q; }, // friends: none in demo
            order(field, opts = {}) { order = { field, asc: opts.ascending !== false }; return q; },
            limit(n) { limit = n; return q; },
            then(resolve, reject) {
                const match = r => filters.every(f => f(r));
                let data = null;
                if (action === 'insert') rows().push(...payload.map(r => ({ ...r })));
                else if (action === 'update') rows().filter(match).forEach(r => Object.assign(r, payload));
                else if (action === 'delete') tables[table] = rows().filter(r => !match(r));
                else {
                    data = rows().filter(match).map(r => ({ ...r }));
                    if (order) data.sort((a, b) => String(a[order.field]).localeCompare(String(b[order.field])) * (order.asc ? 1 : -1));
                    if (limit) data = data.slice(0, limit);
                }
                return Promise.resolve({ data, error: null }).then(resolve, reject);
            },
        };
        return q;
    };
}

export function start() {
    supabase.from = fakeDatabase(sampleData());
    state.user = { id: USER_ID, email: 'demo@example.com' };

    document.getElementById('authModal').hidden = true;
    document.getElementById('mainApp').hidden = false;
    document.body.insertAdjacentHTML('afterbegin',
        '<div class="demo-banner">Demo mode · sample wines · nothing is saved</div>');
    emit('auth:signed-in', state.user);
}
