// Add tab: the add/edit wine form, location dropdowns and autocomplete.
// The label photo comes from label-scanner.js through state.formPhoto.

import { state } from '../core/state.js';
import { showTab } from '../core/ui.js';
import { byId, escapeHtml, normalizeText, normalizeWineText, uniqueSorted, optionsHtml } from '../core/utils.js';
import { addWine, updateWine, parentLocations, childLocations } from '../core/data.js';

let editingWineId = null;

function fillSubLocations(parentId, selectedId = '') {
    const sub = byId('subLocation');
    if (!parentId) {
        sub.innerHTML = '<option value="">Select main location first...</option>';
        return;
    }
    const children = childLocations(parentId);
    sub.innerHTML = children.length === 0
        ? '<option value="">No sub-locations. Add some in Manage Locations.</option>'
        : '<option value="">Select sub-location...</option>' + children.map(loc =>
            `<option value="${escapeHtml(loc.id)}"${loc.id === selectedId ? ' selected' : ''}>${escapeHtml(loc.name)}</option>`).join('');
}

function renderDropdowns() {
    const parent = byId('parentLocation');
    const current = parent.value;
    parent.innerHTML = '<option value="">Select main location...</option>' + parentLocations().map(loc =>
        `<option value="${escapeHtml(loc.id)}"${loc.id === current ? ' selected' : ''}>${escapeHtml(loc.name)}</option>`).join('');

    const { wines } = state;
    byId('wineNameList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.name)));
    byId('countryList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.country)));
    byId('regionList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.region)));
    byId('subRegionList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.sub_region)));
}

function resetForm() {
    byId('wineForm').reset();
    byId('quantity').value = '1';
    byId('photoPreview').style.display = 'none';
    byId('analysisStatus').style.display = 'none';
    fillSubLocations('');
    state.formPhoto = null;
    editingWineId = null;
    byId('submitBtn').textContent = 'Add to Inventory';
}

function startEditing(id) {
    const wine = state.wines.find(w => w.id === id);
    if (!wine) return;
    editingWineId = id;

    byId('wineName').value = wine.name || '';
    byId('vintage').value = wine.vintage || '';
    byId('wineType').value = wine.type || '';
    byId('country').value = wine.country || '';
    byId('region').value = wine.region || '';
    byId('subRegion').value = wine.sub_region || '';
    byId('quantity').value = wine.quantity || 1;
    byId('notes').value = wine.notes || '';

    const parentLoc = parentLocations().find(l => l.name === wine.parent_location);
    byId('parentLocation').value = parentLoc?.id || '';
    const subLoc = parentLoc && childLocations(parentLoc.id).find(l => l.name === wine.sub_location);
    fillSubLocations(parentLoc?.id, subLoc?.id);

    if (wine.photo) {
        byId('photoPreview').src = wine.photo;
        byId('photoPreview').style.display = 'block';
    }
    state.formPhoto = wine.photo || null;

    byId('submitBtn').textContent = 'Update Wine';
    showTab('addWine');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleSubmit(e) {
    e.preventDefault();
    const submitBtn = byId('submitBtn');
    const isEditing = editingWineId !== null;
    submitBtn.disabled = true;
    submitBtn.textContent = isEditing ? 'Updating...' : 'Adding...';

    try {
        const parentLoc = state.locations.find(l => l.id === byId('parentLocation').value);
        const subLoc = state.locations.find(l => l.id === byId('subLocation').value);

        const wineData = {
            name: normalizeText(byId('wineName').value),
            vintage: byId('vintage').value,
            type: byId('wineType').value,
            country: normalizeWineText(byId('country').value),
            region: normalizeWineText(byId('region').value),
            sub_region: normalizeWineText(byId('subRegion').value),
            parent_location: parentLoc?.name || '',
            sub_location: subLoc?.name || '',
            location: `${parentLoc?.name} - ${subLoc?.name}`,
            quantity: parseInt(byId('quantity').value) || 1,
            notes: byId('notes').value,
            photo: state.formPhoto,
            user_id: state.user.id,
        };

        if (isEditing) {
            await updateWine(editingWineId, wineData);
            alert('✓ Wine updated!');
        } else {
            await addWine(wineData);
            alert('✓ Wine added!');
        }
        resetForm();
    } catch (error) {
        console.error('Error:', error);
        alert(`Failed to ${isEditing ? 'update' : 'add'} wine: ` + error.message);
        submitBtn.textContent = isEditing ? 'Update Wine' : 'Add to Inventory';
    } finally {
        submitBtn.disabled = false;
    }
}

export function init({ on }) {
    byId('wineForm').addEventListener('submit', handleSubmit);
    byId('parentLocation').addEventListener('change', e => fillSubLocations(e.target.value));
    on('data:changed', renderDropdowns);
    on('wine:edit', startEditing);
    on('auth:signed-out', resetForm);
}
