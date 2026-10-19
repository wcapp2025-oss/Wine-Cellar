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
            id: String(stamp + i), name, user_id: userId, is_parent: true,
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

// Records ONE bottle as drunk. If there are more bottles in that spot, the count goes
// down by one; the entry is only removed when the last bottle is gone.
// The history record is saved first, so a failure can't lose a bottle.
export async function markConsumed(id, notes) {
    const wine = state.wines.find(w => w.id === id);
    if (!wine) throw new Error('Wine not found');

    const consumed = {
        ...wine,
        id: Date.now().toString(), // new id, so the same entry can be drunk from more than once
        quantity: 1,
        consumed_date: new Date().toISOString(),
        consumed_notes: notes,
        consumed_quantity: 1,
    };
    check(await supabase.from('consumed_wines').insert([consumed]));
    state.consumedWines.push(consumed);

    if ((wine.quantity || 1) > 1) {
        const quantity = wine.quantity - 1;
        check(await supabase.from('wines').update({ quantity }).eq('id', id));
        wine.quantity = quantity;
    } else {
        check(await supabase.from('wines').delete().eq('id', id));
        state.wines = state.wines.filter(w => w.id !== id);
    }
    emit('data:changed');
}

// Moves `count` bottles of one entry to another fridge/area and shelf.
// Moving all of them just changes the entry's location. Moving some adds them to the
// destination (merging with the same wine already there) BEFORE reducing the original,
// so a failure halfway can never lose bottles.
export async function moveBottles(id, count, parentName, shelfName = '') {
    const wine = state.wines.find(w => w.id === id);
    if (!wine) throw new Error('Wine not found');
    count = Math.min(Math.max(1, count), wine.quantity || 1);

    const where = {
        parent_location: parentName,
        sub_location: shelfName,
        location: shelfName ? `${parentName} - ${shelfName}` : parentName,
    };
    const sameWine = w => w.id !== id && w.name === wine.name && w.vintage === wine.vintage
        && w.type === wine.type && w.region === wine.region
        && w.parent_location === parentName && (w.sub_location || '') === shelfName;
    const target = state.wines.find(sameWine);

    if (target) {
        const quantity = (target.quantity || 0) + count;
        check(await supabase.from('wines').update({ quantity }).eq('id', target.id));
        target.quantity = quantity;
    } else if (count === wine.quantity) {
        check(await supabase.from('wines').update(where).eq('id', id));
        Object.assign(wine, where);
        emit('data:changed');
        return;
    } else {
        const copy = { ...wine, ...where, id: Date.now().toString(), quantity: count, date_added: new Date().toISOString() };
        check(await supabase.from('wines').insert([copy]));
        state.wines.unshift(copy);
    }

    // Take the moved bottles out of the original spot
    if (count === wine.quantity) {
        check(await supabase.from('wines').delete().eq('id', id));
        state.wines = state.wines.filter(w => w.id !== id);
    } else {
        const quantity = wine.quantity - count;
        check(await supabase.from('wines').update({ quantity }).eq('id', id));
        wine.quantity = quantity;
    }
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
