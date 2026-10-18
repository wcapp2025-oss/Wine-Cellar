// Every database read/write for your own collection lives here.
// Each function updates `state` and announces 'data:changed', so the screens re-render themselves.

import { supabase } from './supabase.js';
import { state, emit } from './state.js';

function check({ data, error }) {
    if (error) throw error;
    return data;
}

const DEFAULT_LOCATIONS = ['Fridge - Top Shelf', 'Fridge - Middle Shelf', 'Fridge - Bottom Shelf', 'Wine Cellar', 'Pre-order'];

export async function loadAll() {
    const userId = state.user.id;

    state.wines = check(await supabase.from('wines').select('*')
        .eq('user_id', userId).order('date_added', { ascending: false })) || [];
    state.consumedWines = check(await supabase.from('consumed_wines').select('*')
        .eq('user_id', userId)) || [];
    state.locations = check(await supabase.from('locations').select('*')
        .eq('user_id', userId).order('name')) || [];

    if (state.locations.length === 0) {
        const stamp = Date.now();
        const defaults = DEFAULT_LOCATIONS.map((name, i) => ({
            id: `${stamp}-${i}`, name, user_id: userId, is_parent: true,
        }));
        const { error } = await supabase.from('locations').insert(defaults);
        if (error) console.error('Could not create default locations:', error);
        else state.locations = defaults;
    }

    emit('data:changed');
}

export function clearAll() {
    state.wines = [];
    state.consumedWines = [];
    state.locations = [];
}

// ---------- Wines ----------

export async function addWine(wineData) {
    const wine = { id: Date.now().toString(), ...wineData, date_added: new Date().toISOString() };
    check(await supabase.from('wines').insert([wine]));
    state.wines.unshift(wine);
    emit('data:changed');
    return wine;
}

export async function updateWine(id, changes) {
    check(await supabase.from('wines').update(changes).eq('id', id));
    const wine = state.wines.find(w => w.id === id);
    if (wine) Object.assign(wine, changes);
    emit('data:changed');
}

export async function deleteWine(id) {
    check(await supabase.from('wines').delete().eq('id', id));
    state.wines = state.wines.filter(w => w.id !== id);
    emit('data:changed');
}

// Moves a wine to the consumed list. It's only removed from inventory
// AFTER the consumed record is safely saved, so a failure can't lose the bottle.
export async function markConsumed(id, notes) {
    const wine = state.wines.find(w => w.id === id);
    if (!wine) throw new Error('Wine not found');

    const consumed = {
        ...wine,
        consumed_date: new Date().toISOString(),
        consumed_notes: notes,
        consumed_quantity: 1,
    };
    check(await supabase.from('consumed_wines').insert([consumed]));
    state.consumedWines.push(consumed);

    check(await supabase.from('wines').delete().eq('id', id));
    state.wines = state.wines.filter(w => w.id !== id);
    emit('data:changed');
}

export async function deleteConsumed(id) {
    check(await supabase.from('consumed_wines').delete().eq('id', id));
    state.consumedWines = state.consumedWines.filter(w => w.id !== id);
    emit('data:changed');
}

// ---------- Locations ----------

export async function addLocation(location) {
    const loc = { id: Date.now().toString(), user_id: state.user.id, ...location };
    check(await supabase.from('locations').insert([loc]));
    state.locations.push(loc);
    emit('data:changed');
    return loc;
}

export async function deleteLocation(id) {
    check(await supabase.from('locations').delete().eq('id', id));
    state.locations = state.locations.filter(l => l.id !== id);
    emit('data:changed');
}

export const parentLocations = () => state.locations.filter(l => l.is_parent);
export const childLocations = parentId => state.locations.filter(l => l.parent_id === parentId);
