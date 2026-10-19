// Add tab: the add/edit wine form, location + shelf dropdowns, and autocomplete.
// The label photo comes from label-scanner.js through state.formPhoto.

import { state, emit } from '../core/state.js';
import { showTab, registerActions, toast } from '../core/ui.js';
import { byId, escapeHtml, normalizeText, normalizeWineText, uniqueSorted, optionsHtml } from '../core/utils.js';
import { addWine, updateWine, parentLocations, childLocations } from '../core/data.js';

let editingWineId = null;

const locationOptions = (list, selectedId) => list.map(loc =>
    `<option value="${escapeHtml(loc.id)}"${loc.id === selectedId ? ' selected' : ''}>${escapeHtml(loc.name)}</option>`).join('');

function fillShelves(parentId, selectedId = '') {
    const shelf = byId('subLocation');
    const children = parentId ? childLocations(parentId) : [];
    shelf.disabled = children.length === 0;
    shelf.innerHTML = children.length === 0
        ? '<option value="">—</option>'
        : '<option value="">Choose shelf…</option>' + locationOptions(children, selectedId);
}

function renderDropdowns() {
    const parent = byId('parentLocation');
    const current = parent.value;
    parent.innerHTML = '<option value="">Choose…</option>' + locationOptions(parentLocations(), current);
    fillShelves(parent.value, byId('subLocation').value);

    const { wines } = state;
    byId('wineNameList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.name)));
    byId('countryList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.country)));
    byId('regionList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.region)));
    byId('subRegionList').innerHTML = optionsHtml(uniqueSorted(wines.map(w => w.sub_region)));
}

function setEditing(id) {
    editingWineId = id;
    byId('addWineTitle').textContent = id ? 'Edit Wine' : 'Add Wine';
    byId('submitBtn').textContent = id ? 'Save Changes' : 'Add to Cellar';
    byId('cancelEditBtn').hidden = !id;
}

function resetForm() {
    byId('wineForm').reset();
    byId('quantity').value = '1';
    byId('photoPreview').hidden = true;
    byId('analysisStatus').hidden = true;
    fillShelves('');
    state.formPhoto = null;
    setEditing(null);
}

function startEditing(id) {
    const wine = state.wines.find(w => w.id === id);
    if (!wine) return;

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
    const shelf = parentLoc && childLocations(parentLoc.id).find(l => l.name === wine.sub_location);
    fillShelves(parentLoc?.id, shelf?.id);

    byId('photoPreview').hidden = !wine.photo;
    if (wine.photo) byId('photoPreview').src = wine.photo;
    byId('analysisStatus').hidden = true;
    state.formPhoto = wine.photo || null;

    setEditing(id);
    showTab('addWine');
}

async function handleSubmit(e) {
    e.preventDefault();
    const name = byId('wineName').value.trim();
    const parentLoc = state.locations.find(l => l.id === byId('parentLocation').value);
    if (!name) return toast('Please enter the wine name', 'error');
    if (!parentLoc) return toast('Please choose where it is stored', 'error');

    const shelf = state.locations.find(l => l.id === byId('subLocation').value);
    const submitBtn = byId('submitBtn');
    const isEditing = editingWineId !== null;
    submitBtn.disabled = true;

    try {
        const wineData = {
            name: normalizeText(name),
            vintage: byId('vintage').value,
            type: byId('wineType').value,
            country: normalizeWineText(byId('country').value),
            region: normalizeWineText(byId('region').value),
            sub_region: normalizeWineText(byId('subRegion').value),
            parent_location: parentLoc.name,
            sub_location: shelf?.name || '',
            location: shelf ? `${parentLoc.name} - ${shelf.name}` : parentLoc.name,
            quantity: Math.max(1, parseInt(byId('quantity').value) || 1),
            notes: byId('notes').value,
            photo: state.formPhoto,
            user_id: state.user.id,
        };

        let saved;
        if (isEditing) {
            await updateWine(editingWineId, wineData);
            saved = editingWineId;
            toast('✓ Changes saved');
        } else {
            saved = (await addWine(wineData)).id;
            toast(`✓ ${wineData.name} added`);
        }
        resetForm();
        showTab('wines');
        emit('wine:show', saved);
    } catch (error) {
        console.error('Error:', error);
        toast(`Could not ${isEditing ? 'save' : 'add'} wine: ${error.message}`, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

export function init({ on }) {
    byId('wineForm').addEventListener('submit', handleSubmit);
    byId('parentLocation').addEventListener('change', e => fillShelves(e.target.value));
    fillShelves('');

    registerActions({
        'qty-step': ({ step }) => {
            const input = byId('quantity');
            input.value = Math.max(1, (parseInt(input.value) || 1) + Number(step));
        },
        'cancel-edit': () => {
            resetForm();
            showTab('wines');
        },
    });

    on('data:changed', renderDropdowns);
    on('wine:edit', startEditing);
    on('auth:signed-out', resetForm);
}
