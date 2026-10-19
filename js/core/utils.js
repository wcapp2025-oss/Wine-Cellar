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

// CSS color class for a wine type: dot-red, dot-white, dot-rose, dot-sparkling, dot-unknown
export function typeKey(type) {
    return { Red: 'red', White: 'white', 'Rosé': 'rose', Sparkling: 'sparkling' }[type] || 'unknown';
}

// A small bottle drawing, colored by wine type.
export function bottleSvg(type) {
    return `<svg viewBox="0 0 16 46" aria-hidden="true"><path fill="var(--wine-${typeKey(type)})" stroke="rgba(0,0,0,.25)" stroke-width=".8"
        d="M6 1h4v11c0 3 5 5 5 10v21a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V22c0-5 5-7 5-10z"/>
        <rect x="5.6" y="1" width="4.8" height="4" rx="1" fill="rgba(0,0,0,.35)"/></svg>`;
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
