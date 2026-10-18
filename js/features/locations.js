// Locations tab: add/delete storage locations, and the data cleanup tool.

import { state } from '../core/state.js';
import { registerActions } from '../core/ui.js';
import { byId, escapeHtml, normalizeText, normalizeWineText } from '../core/utils.js';
import { addLocation, deleteLocation, updateWine, parentLocations, childLocations } from '../core/data.js';

function render() {
    const container = byId('locationsList');
    if (state.locations.length === 0) {
        container.innerHTML = '<div class="empty-state">No locations yet.</div>';
        return;
    }

    container.innerHTML = parentLocations().map(parent => {
        const children = childLocations(parent.id);
        return `
            <div style="margin-bottom: 20px; border: 2px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div class="location-item" style="background: #f3f4f6; font-weight: 600;">
                    <div>📍 ${escapeHtml(parent.name)}</div>
                    <button class="delete-btn" data-action="delete-location" data-id="${escapeHtml(parent.id)}">Delete</button>
                </div>
                ${children.length > 0 ? children.map(child => `
                    <div class="location-item" style="padding-left: 40px; border-top: 1px solid #e5e7eb;">
                        <div>↳ ${escapeHtml(child.name)}</div>
                        <button class="delete-btn" data-action="delete-location" data-id="${escapeHtml(child.id)}">Delete</button>
                    </div>`).join('')
                : '<div style="padding: 15px 15px 15px 40px; color: #9ca3af; font-style: italic;">No sub-locations</div>'}
            </div>`;
    }).join('');

    byId('parentLocationDropdown').innerHTML = '<option value="">Select parent...</option>' +
        parentLocations().map(loc => `<option value="${escapeHtml(loc.id)}">${escapeHtml(loc.name)}</option>`).join('');
}

// Wines are stored with the location *names*, so match on those.
function winesStoredAt(location) {
    if (location.is_parent) return state.wines.filter(w => w.parent_location === location.name);
    const parent = state.locations.find(l => l.id === location.parent_id);
    return state.wines.filter(w => w.sub_location === location.name && (!parent || w.parent_location === parent.name));
}

async function handleDelete({ id }) {
    const location = state.locations.find(l => l.id === id);
    if (!location) return;

    const stored = winesStoredAt(location);
    if (stored.length > 0) {
        alert(`Cannot delete "${location.name}" - ${stored.length} wine(s) stored there.`);
        return;
    }
    if (location.is_parent && childLocations(id).length > 0) {
        alert(`Cannot delete "${location.name}" - delete its sub-locations first.`);
        return;
    }
    if (!confirm(`Delete "${location.name}"?`)) return;

    try {
        await deleteLocation(id);
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to delete: ' + error.message);
    }
}

async function handleAdd(e) {
    e.preventDefault();
    const submitBtn = byId('locationSubmitBtn');
    const isParent = byId('parentLocationRadio').checked;
    const parentId = isParent ? null : byId('parentLocationDropdown').value;

    if (!isParent && !parentId) {
        alert('Please select a parent location');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    try {
        await addLocation({ name: byId('locationName').value, is_parent: isParent, parent_id: parentId });
        byId('locationForm').reset();
        byId('parentLocationRadio').checked = true;
        byId('parentLocationSelect').style.display = 'none';
        alert('✓ Location added!');
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to add location: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Location';
    }
}

async function cleanupAllData() {
    if (!confirm('This will standardize capitalization and remove extra spaces from all your wine data. Continue?')) return;

    const result = byId('cleanupResult');
    result.innerHTML = '<p style="color: #3b82f6;">Cleaning up data...</p>';

    let updated = 0;
    let failed = 0;
    for (const wine of [...state.wines]) {
        const cleaned = {
            name: normalizeText(wine.name),
            country: normalizeWineText(wine.country || ''),
            region: normalizeWineText(wine.region || ''),
            sub_region: normalizeWineText(wine.sub_region || ''),
        };
        const changed = Object.keys(cleaned).some(k => cleaned[k] !== (wine[k] || ''));
        if (!changed) continue;
        try {
            await updateWine(wine.id, cleaned);
            updated++;
        } catch (error) {
            console.error('Cleanup failed for', wine.id, error);
            failed++;
        }
    }

    if (failed > 0) {
        result.innerHTML = `<p style="color: #dc2626;">Cleaned ${updated}, but ${failed} failed. Please try again.</p>`;
    } else if (updated > 0) {
        result.innerHTML = `<p style="color: #10b981; font-weight: 600;">✓ Cleaned up ${updated} wine${updated > 1 ? 's' : ''}!</p>`;
    } else {
        result.innerHTML = '<p style="color: #6b7280;">✓ No duplicates found - your data is already clean!</p>';
    }
}

export function init({ on }) {
    byId('parentLocationRadio').addEventListener('change', () => {
        byId('parentLocationSelect').style.display = 'none';
    });
    byId('subLocationRadio').addEventListener('change', () => {
        byId('parentLocationSelect').style.display = 'block';
    });
    byId('locationForm').addEventListener('submit', handleAdd);

    registerActions({
        'delete-location': handleDelete,
        'cleanup-data': cleanupAllData,
    });

    on('data:changed', render);
}
