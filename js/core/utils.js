import { REGION_SPELLINGS } from './wine-names.js';

// Always use this when putting user-entered text into HTML.
// It stops names like "Barbera d'Alba" from breaking the page and blocks injected code.
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function bottles(n) {
    return `${n} ${n === 1 ? 'bottle' : 'bottles'}`;
}

export function byId(id) {
    return document.getElementById(id);
}

// Builds <option> tags for a <select> or <datalist>.
export function optionsHtml(values, selected) {
    return values.map(v =>
        `<option value="${escapeHtml(v)}"${v === selected ? ' selected' : ''}>${escapeHtml(v)}</option>`
    ).join('');
}

export function uniqueSorted(values) {
    return [...new Set(values.filter(Boolean))].sort();
}

// Normalize text input to prevent duplicates (extra spaces, inconsistent capitals).
export function normalizeText(text) {
    if (!text) return '';

    const words = text.trim().replace(/\s+/g, ' ').split(' ');
    // French articles and prepositions that should stay lowercase
    const frenchLowercase = ['de', 'du', 'des', 'la', 'le', 'les', 'et'];

    return words.map((word, index) => {
        const lowerWord = word.toLowerCase();
        if (index > 0 && frenchLowercase.includes(lowerWord)) return lowerWord;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}

// Normalization plus correct spellings for common wine regions/countries.
export function normalizeWineText(text) {
    if (!text) return '';
    const normalized = normalizeText(text);
    return REGION_SPELLINGS[normalized] || normalized;
}
