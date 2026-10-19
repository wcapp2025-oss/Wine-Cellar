// More › Locations: add/delete fridges/areas and their shelves. Also the data cleanup tool.

import { state } from '../core/state.js';
import { registerActions, toast } from '../core/ui.js';
import { byId, escapeHtml, normalizeText, normalizeWineText } from '../core/utils.js';
import { addLocation, deleteLocation, updateWine, parentLocations, childLocations } from '../core/data.js';

const byCreation = (a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true });

// Wines are stored with the location *names*, so match on those.
function winesStoredAt(location) {
    if (location.is_parent) return state.wines.filter(w => w.parent_location === location.name);
    const parent = state.locations.find(l => l.id === location.parent_id);
    return state.wines.filter(w => w.sub_location === location.name && (!parent || w.parent_location === parent.name));
}

const countAt = loc => winesStoredAt(loc).reduce((sum, w) => sum + (w.quantity || 0), 0);

function render() {
    const container = byId('locationsList');
    const parents = parentLocations().sort(byCreation);

    container.innerHTML = parents.length === 0
        ? '<div class="empty-state">No locations yet. Add a fridge or area above.</div>'
        : parents.map(parent => `
            <div class="location-group">
                <div class="location-row">
                    <span>🗄️ ${escapeHtml(parent.name)} <span class="muted">· ${countAt(parent)}</span></span>
                    <button class="btn btn-small btn-danger" data-action="delete-location" data-id="${escapeHtml(parent.id)}">Delete</button>
                </div>
                ${childLocations(parent.id).sort(byCreation).map(child => `
                    <div class="location-row child">
                        <span>${escapeHtml(child.name)} <span class="muted">· ${countAt(child)}</span></span>
                        <button class="btn btn-small btn-danger" data-action="delete-location" data-id="${escapeHtml(child.id)}">Delete</button>
                    </div>`).join('')}
            </div>`).join('');

    byId('parentLocationDropdown').innerHTML = '<option value="">Choose…</option>' +
        parents.map(loc => `<option value="${escapeHtml(loc.id)}">${escapeHtml(loc.name)}</option>`).join('');
}

async function handleDelete({ id }) {
    const location = state.locations.find(l => l.id === id);
    if (!location) return;

    const stored = winesStoredAt(location);
    if (stored.length > 0) {
        return toast(`Can't delete "${location.name}": ${stored.length} wine(s) are stored there.`, 'error');
    }
    if (location.is_parent && childLocations(id).length > 0) {
        return toast(`Delete the shelves in "${location.name}" first.`, 'error');
    }
    if (!confirm(`Delete "${location.name}"?`)) return;

    try {
        await deleteLocation(id);
        toast('Deleted');
    } catch (error) {
        console.error('Error:', error);
        toast('Could not delete: ' + error.message, 'error');
    }
}

async function handleAdd(e) {
    e.preventDefault();
    const name = byId('locationName').value.trim();
    const isParent = byId('parentLocationRadio').checked;
    const parentId = isParent ? null : byId('parentLocationDropdown').value;

    if (!name) return toast('Please enter a name', 'error');
    if (!isParent && !parentId) return toast('Choose which fridge / area the shelf is in', 'error');

    const submitBtn = byId('locationSubmitBtn');
    submitBtn.disabled = true;
    try {
        await addLocation({ name, is_parent: isParent, parent_id: parentId });
        byId('locationName').value = '';
        toast(`✓ ${name} added`);
    } catch (error) {
        console.error('Error:', error);
        toast('Could not add: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

async function cleanupAllData() {
    if (!confirm('Standardize capital letters, remove extra spaces and fix region spellings in all your wines?')) return;

    const result = byId('cleanupResult');
    result.innerHTML = '<div class="notice notice-info">Cleaning up…</div>';

    let updated = 0;
    let failed = 0;
    for (const wine of [...state.wines]) {
        const cleaned = {
            name: normalizeText(wine.name),
            country: normalizeWineText(wine.country || ''),
            region: normalizeWineText(wine.region || ''),
            sub_region: normalizeWineText(wine.sub_region || ''),
        };
        if (!Object.keys(cleaned).some(k => cleaned[k] !== (wine[k] || ''))) continue;
        try {
            await updateWine(wine.id, cleaned);
            updated++;
        } catch (error) {
            console.error('Cleanup failed for', wine.id, error);
            failed++;
        }
    }

    result.innerHTML = failed > 0
        ? `<div class="notice notice-error">Cleaned ${updated}, but ${failed} failed. Please try again.</div>`
        : updated > 0
            ? `<div class="notice notice-success">✓ Cleaned up ${updated} wine${updated > 1 ? 's' : ''}.</div>`
            : '<div class="notice notice-success">✓ Everything is already tidy.</div>';
}

export function init({ on }) {
    const toggleParentSelect = () => { byId('parentLocationSelect').hidden = byId('parentLocationRadio').checked; };
    byId('parentLocationRadio').addEventListener('change', toggleParentSelect);
    byId('subLocationRadio').addEventListener('change', toggleParentSelect);
    byId('locationForm').addEventListener('submit', handleAdd);

    registerActions({
        'delete-location': handleDelete,
        'cleanup-data': cleanupAllData,
    });

    on('data:changed', render);
}
