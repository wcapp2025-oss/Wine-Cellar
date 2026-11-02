// Built-in wine knowledge: typical drinking windows and wine "styles" used for food pairing.
// These are general rules of thumb; a window you set yourself on a wine always wins.
//
// Each rule: words to look for (in region, sub-region, name or country), the wine type it
// applies to ('' = any), the window in years after the vintage [from, to], and a style.
// The FIRST matching rule wins, so specific rules go above general ones.
// To improve a guess, add or adjust a line here.

export const STYLES = {
    'bold-red': 'Bold red',
    'medium-red': 'Medium red',
    'light-red': 'Light red',
    'crisp-white': 'Crisp white',
    'rich-white': 'Rich white',
    'aromatic-white': 'Aromatic white',
    'sweet': 'Sweet wine',
    'sparkling': 'Sparkling',
    'rose': 'Rosé',
    'fortified': 'Fortified',
};

export const WINDOW_RULES = [
    // ---- Fortified & sweet ----
    { words: ['port', 'porto', 'douro vintage'], type: '', years: [15, 45], style: 'fortified' },
    { words: ['sherry', 'jerez', 'madeira'], type: '', years: [0, 10], style: 'fortified' },
    { words: ['sauternes', 'barsac', 'tokaji', 'trockenbeerenauslese', 'beerenauslese', 'icewine', 'eiswein'], type: '', years: [6, 40], style: 'sweet' },

    // ---- Sparkling ----
    { words: ['prosecco', 'asti', 'moscato'], type: '', years: [0, 2], style: 'sparkling' },
    { words: ['cava', 'cremant', 'crémant'], type: '', years: [0, 4], style: 'sparkling' },
    { words: ['champagne', 'franciacorta'], type: '', years: [6, 20], style: 'sparkling' },
    { words: [], type: 'Sparkling', years: [1, 8], style: 'sparkling' },

    // ---- Rosé ----
    { words: ['bandol'], type: 'Rosé', years: [0, 4], style: 'rose' },
    { words: [], type: 'Rosé', years: [0, 2], style: 'rose' },

    // ---- Red: Italy ----
    { words: ['barolo', 'barbaresco'], type: 'Red', years: [10, 30], style: 'bold-red' },
    { words: ['brunello'], type: 'Red', years: [10, 25], style: 'bold-red' },
    { words: ['amarone'], type: 'Red', years: [6, 20], style: 'bold-red' },
    { words: ['bolgheri', 'sassicaia', 'tignanello', 'ornellaia', 'super tuscan'], type: 'Red', years: [6, 20], style: 'bold-red' },
    { words: ['taurasi', 'aglianico'], type: 'Red', years: [6, 20], style: 'bold-red' },
    { words: ['vino nobile', 'chianti classico'], type: 'Red', years: [3, 12], style: 'medium-red' },
    { words: ['chianti', 'montepulciano', 'barbera', 'valpolicella', 'etna'], type: 'Red', years: [1, 6], style: 'medium-red' },
    { words: ['dolcetto', 'bardolino', 'lambrusco'], type: 'Red', years: [0, 3], style: 'light-red' },
    { words: ['primitivo'], type: 'Red', years: [1, 6], style: 'bold-red' },

    // ---- Red: France ----
    { words: ['pauillac', 'saint-julien', 'saint-estèphe', 'saint-estephe', 'margaux', 'pessac', 'graves', 'haut-médoc', 'haut-medoc'], type: 'Red', years: [8, 30], style: 'bold-red' },
    { words: ['pomerol', 'saint-émilion', 'saint-emilion'], type: 'Red', years: [7, 25], style: 'bold-red' },
    { words: ['médoc', 'medoc', 'bordeaux supérieur', 'bordeaux superieur', 'bordeaux'], type: 'Red', years: [3, 12], style: 'medium-red' },
    { words: ['hermitage', 'côte-rôtie', 'cote-rotie', 'cornas'], type: 'Red', years: [8, 25], style: 'bold-red' },
    { words: ['châteauneuf', 'chateauneuf', 'gigondas', 'vacqueyras', 'bandol'], type: 'Red', years: [5, 15], style: 'bold-red' },
    { words: ['crozes', 'saint-joseph'], type: 'Red', years: [2, 8], style: 'medium-red' },
    { words: ['côtes du rhône', 'cotes du rhone', 'languedoc', 'roussillon', 'minervois', 'corbières'], type: 'Red', years: [1, 5], style: 'medium-red' },
    { words: ['gevrey', 'vosne', 'chambolle', 'nuits', 'morey', 'clos de vougeot', 'côte de nuits', 'cote de nuits', 'corton'], type: 'Red', years: [6, 20], style: 'light-red' },
    { words: ['pommard', 'volnay', 'beaune', 'côte de beaune', 'cote de beaune', 'savigny'], type: 'Red', years: [4, 14], style: 'light-red' },
    { words: ['bourgogne', 'burgundy'], type: 'Red', years: [2, 8], style: 'light-red' },
    { words: ['morgon', 'moulin-à-vent', 'moulin-a-vent', 'fleurie'], type: 'Red', years: [1, 8], style: 'light-red' },
    { words: ['beaujolais'], type: 'Red', years: [0, 3], style: 'light-red' },
    { words: ['chinon', 'bourgueil', 'saumur'], type: 'Red', years: [2, 10], style: 'medium-red' },
    { words: ['cahors', 'madiran'], type: 'Red', years: [5, 15], style: 'bold-red' },

    // ---- Red: Spain & Portugal ----
    { words: ['gran reserva'], type: 'Red', years: [8, 25], style: 'medium-red' },
    { words: ['priorat', 'toro'], type: 'Red', years: [5, 18], style: 'bold-red' },
    { words: ['ribera del duero'], type: 'Red', years: [4, 15], style: 'bold-red' },
    { words: ['rioja'], type: 'Red', years: [3, 15], style: 'medium-red' },
    { words: ['douro'], type: 'Red', years: [3, 15], style: 'bold-red' },
    { words: ['bierzo', 'jumilla', 'montsant', 'navarra', 'la mancha', 'calatayud'], type: 'Red', years: [1, 6], style: 'medium-red' },

    // ---- Red: New World & grapes ----
    { words: ['napa', 'oakville', 'rutherford', 'stags leap', 'opus one'], type: 'Red', years: [5, 20], style: 'bold-red' },
    { words: ['cabernet'], type: 'Red', years: [4, 15], style: 'bold-red' },
    { words: ['barossa', 'mclaren', 'shiraz', 'syrah'], type: 'Red', years: [3, 12], style: 'bold-red' },
    { words: ['malbec', 'mendoza'], type: 'Red', years: [2, 8], style: 'bold-red' },
    { words: ['zinfandel'], type: 'Red', years: [1, 7], style: 'bold-red' },
    { words: ['merlot'], type: 'Red', years: [2, 10], style: 'medium-red' },
    { words: ['pinot noir', 'pinot', 'willamette', 'sonoma coast', 'central otago', 'marlborough'], type: 'Red', years: [2, 9], style: 'light-red' },
    { words: ['grenache', 'garnacha', 'tempranillo', 'sangiovese'], type: 'Red', years: [2, 8], style: 'medium-red' },
    { words: ['gamay'], type: 'Red', years: [0, 4], style: 'light-red' },
    { words: [], type: 'Red', years: [2, 8], style: 'medium-red' },

    // ---- White ----
    { words: ['montrachet', 'corton-charlemagne', 'meursault', 'puligny', 'chassagne'], type: 'White', years: [4, 15], style: 'rich-white' },
    { words: ['chablis grand cru', 'chablis premier cru', 'chablis 1er'], type: 'White', years: [4, 15], style: 'crisp-white' },
    { words: ['chablis'], type: 'White', years: [1, 7], style: 'crisp-white' },
    { words: ['pouilly-fuissé', 'pouilly-fuisse', 'mâcon', 'macon', 'bourgogne', 'burgundy'], type: 'White', years: [1, 6], style: 'rich-white' },
    { words: ['vouvray', 'savennières', 'savennieres', 'chenin'], type: 'White', years: [3, 20], style: 'aromatic-white' },
    { words: ['sancerre', 'pouilly-fumé', 'pouilly-fume', 'sauvignon', 'marlborough', 'entre-deux-mers'], type: 'White', years: [0, 3], style: 'crisp-white' },
    { words: ['pessac', 'graves'], type: 'White', years: [3, 15], style: 'rich-white' },
    { words: ['riesling', 'mosel', 'rheingau', 'nahe', 'pfalz', 'clare valley', 'eden valley'], type: 'White', years: [3, 20], style: 'aromatic-white' },
    { words: ['alsace', 'gewurztraminer', 'gewürztraminer', 'pinot gris', 'viognier', 'condrieu', 'torrontés', 'torrontes'], type: 'White', years: [1, 8], style: 'aromatic-white' },
    { words: ['grüner', 'gruner', 'albariño', 'albarino', 'rías baixas', 'rias baixas', 'vinho verde', 'muscadet', 'picpoul', 'assyrtiko', 'vermentino', 'pinot grigio', 'soave', 'gavi', 'verdicchio', 'rueda', 'verdejo'], type: 'White', years: [0, 3], style: 'crisp-white' },
    { words: ['hermitage', 'châteauneuf', 'chateauneuf'], type: 'White', years: [3, 15], style: 'rich-white' },
    { words: ['rioja'], type: 'White', years: [1, 10], style: 'rich-white' },
    { words: ['napa', 'sonoma', 'chardonnay', 'margaret river'], type: 'White', years: [1, 6], style: 'rich-white' },
    { words: [], type: 'White', years: [0, 4], style: 'crisp-white' },
];

const plain = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function matchRule(wine) {
    const haystack = plain([wine.region, wine.sub_region, wine.name, wine.country].join(' | '));
    return WINDOW_RULES.find(rule =>
        (!rule.type || rule.type === wine.type) &&
        (rule.words.length === 0 || rule.words.some(w => haystack.includes(plain(w))))
    ) || null;
}

export function wineStyle(wine) {
    return matchRule(wine)?.style || null;
}

// Returns { from, to, source } in years, or null when there's no vintage (NV) and no rule.
// source: 'yours' (set on the wine) or 'estimate'.
export function drinkingWindow(wine) {
    if (wine.drink_from || wine.drink_to) {
        return { from: Number(wine.drink_from) || null, to: Number(wine.drink_to) || null, source: 'yours' };
    }
    const vintage = parseInt(wine.vintage);
    const rule = matchRule(wine);
    if (!vintage || !rule) return null;
    return { from: vintage + rule.years[0], to: vintage + rule.years[1], source: 'estimate' };
}

// Where a wine is in its window right now.
//   key: 'young' | 'ready' | 'soon' | 'past' | 'any'
export function windowStatus(wine, year = new Date().getFullYear()) {
    const win = drinkingWindow(wine);
    if (!win) return { key: 'any', label: 'Drink any time', short: 'Any time', window: null };
    const { from, to } = win;
    const range = from && to ? `${from}–${to}` : from ? `from ${from}` : `until ${to}`;
    if (from && year < from) return { key: 'young', label: `Too young · best from ${from}`, short: `From ${from}`, window: win, range };
    if (to && year > to) return { key: 'past', label: `Past its best (${range})`, short: 'Past best', window: win, range };
    if (to && year >= to - 1) return { key: 'soon', label: `Drink soon · until ${to}`, short: `Drink by ${to}`, window: win, range };
    return { key: 'ready', label: `Ready · ${range}`, short: 'Ready', window: win, range };
}

// Small colored label, e.g. "Ready" / "Drink by 2027". A ★ means it's a window you set.
export function windowBadgeHtml(wine, long = false) {
    const s = windowStatus(wine);
    const yours = s.window?.source === 'yours' ? ' badge-yours' : '';
    return `<span class="badge badge-${s.key}${yours}">${long ? s.label : s.short}</span>`;
}

// ---------------- Food pairing ----------------
// Each food group: words to spot in what you type, and how well each style suits it (1–3).

export const FOOD_RULES = [
    { name: 'red meat', words: ['steak', 'beef', 'ribeye', 'sirloin', 'brisket', 'burger', 'venison', 'game', 'short rib', 'prime rib', 'filet', 'roast beef', 'oxtail', 'cottage pie', 'beef stew', 'meatball'], styles: { 'bold-red': 3, 'medium-red': 2 } },
    { name: 'lamb', words: ['lamb', 'mutton', "shepherd's pie", 'shepherds pie', 'moussaka'], styles: { 'bold-red': 3, 'medium-red': 3, 'light-red': 1 } },
    { name: 'barbecue', words: ['bbq', 'barbecue', 'grill', 'grilled', 'ribs', 'smoked', 'sausage'], styles: { 'bold-red': 3, 'medium-red': 2, 'rose': 1 } },
    { name: 'pork', words: ['pork', 'ham', 'bacon', 'pork chop', 'tenderloin', 'prosciutto', 'charcuterie'], styles: { 'medium-red': 2, 'light-red': 3, 'rich-white': 2, 'aromatic-white': 2, 'rose': 2 } },
    { name: 'duck', words: ['duck', 'goose', 'quail', 'pigeon'], styles: { 'light-red': 3, 'medium-red': 2 } },
    { name: 'poultry', words: ['chicken', 'turkey', 'poultry', 'roast chicken'], styles: { 'rich-white': 3, 'light-red': 3, 'medium-red': 1, 'rose': 2, 'crisp-white': 1 } },
    { name: 'shellfish', words: ['oyster', 'shrimp', 'prawn', 'lobster', 'crab', 'scallop', 'mussel', 'clam', 'sushi', 'sashimi', 'ceviche', 'shellfish', 'seafood', 'calamari'], styles: { 'crisp-white': 3, 'sparkling': 3, 'rich-white': 2, 'rose': 1 } },
    { name: 'oily fish', words: ['salmon', 'tuna', 'trout', 'mackerel', 'swordfish'], styles: { 'rich-white': 3, 'light-red': 2, 'rose': 2, 'crisp-white': 1 } },
    { name: 'fish', words: ['fish', 'cod', 'halibut', 'sole', 'sea bass', 'bass', 'snapper', 'tilapia', 'branzino', 'fish and chips'], styles: { 'crisp-white': 3, 'rich-white': 2, 'sparkling': 2 } },
    { name: 'tomato pasta & pizza', words: ['pizza', 'tomato', 'marinara', 'bolognese', 'lasagna', 'lasagne', 'spaghetti', 'ragu', 'ragù', 'parmigiana'], styles: { 'medium-red': 3, 'light-red': 2, 'rose': 1 }, italian: true },
    { name: 'creamy & mushroom', words: ['cream', 'creamy', 'alfredo', 'carbonara', 'mushroom', 'truffle', 'risotto', 'butter', 'gratin'], styles: { 'rich-white': 3, 'light-red': 2, 'sparkling': 1 }, italian: true },
    { name: 'pasta', words: ['pasta', 'pesto', 'gnocchi', 'ravioli'], styles: { 'crisp-white': 2, 'medium-red': 2, 'light-red': 2 }, italian: true },
    { name: 'spicy', words: ['spicy', 'curry', 'thai', 'indian', 'szechuan', 'sichuan', 'chili', 'chilli', 'jalapeño', 'jalapeno', 'mexican', 'taco', 'korean', 'vindaloo', 'tikka'], styles: { 'aromatic-white': 3, 'rose': 2, 'sparkling': 2, 'light-red': 1 } },
    { name: 'asian', words: ['chinese', 'stir fry', 'stir-fry', 'teriyaki', 'dumpling', 'ramen', 'pho', 'japanese', 'vietnamese'], styles: { 'aromatic-white': 3, 'light-red': 2, 'sparkling': 2, 'rose': 2 } },
    { name: 'blue cheese', words: ['blue cheese', 'stilton', 'roquefort', 'gorgonzola'], styles: { 'sweet': 3, 'fortified': 3 } },
    { name: 'soft cheese', words: ['brie', 'camembert', 'goat cheese', 'chèvre', 'chevre', 'burrata', 'mozzarella'], styles: { 'sparkling': 3, 'crisp-white': 3, 'rich-white': 2, 'light-red': 1 } },
    { name: 'cheese', words: ['cheese', 'cheddar', 'parmesan', 'comté', 'comte', 'gruyère', 'gruyere', 'manchego', 'pecorino'], styles: { 'bold-red': 2, 'medium-red': 2, 'rich-white': 2, 'fortified': 2 } },
    { name: 'dessert', words: ['dessert', 'chocolate', 'cake', 'fruit tart', 'apple pie', 'pecan pie', 'cheesecake', 'crème brûlée', 'creme brulee', 'tiramisu', 'ice cream', 'fruit', 'pastry'], styles: { 'sweet': 3, 'fortified': 3, 'sparkling': 1 } },
    { name: 'salad & veg', words: ['salad', 'vegetable', 'vegetables', 'veggie', 'vegan', 'vegetarian', 'asparagus', 'greens'], styles: { 'crisp-white': 3, 'rose': 2, 'aromatic-white': 2, 'light-red': 1 } },
    { name: 'celebration', words: ['celebration', 'celebrate', 'party', 'aperitif', 'apéritif', 'birthday', 'anniversary', 'brunch', 'canapé', 'canape'], styles: { 'sparkling': 3, 'rose': 2, 'crisp-white': 1 } },
];

// Whole words only (plurals allowed), so "tart" doesn't match "steak tartare".
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const wordRe = w => new RegExp(`(^|[^a-z])${escapeRe(plain(w))}(s|es)?($|[^a-z])`);

export function foodMatches(text) {
    const q = plain(text);
    return FOOD_RULES.filter(f => f.words.some(w => wordRe(w).test(q)));
}

const WINDOW_BONUS = { soon: 1.5, ready: 1, any: 0.5, young: -2, past: -1 };

// Scores every wine for the food. Returns the best picks with a reason, best first.
export function pairWines(foodText, wines, limit = 6) {
    const foods = foodMatches(foodText);
    if (foods.length === 0) return { foods, picks: [] };

    const picks = wines.map(wine => {
        const style = wineStyle(wine);
        let best = 0, bestFood = null;
        for (const f of foods) {
            let s = f.styles[style] || 0;
            if (s && f.italian && /ital/i.test(wine.country || '')) s += 0.5;
            if (s > best) { best = s; bestFood = f; }
        }
        if (!best) return null;
        const status = windowStatus(wine);
        return {
            wine, status, style,
            score: best + (WINDOW_BONUS[status.key] ?? 0),
            reason: `${STYLES[style]} for ${bestFood.name}`,
        };
    }).filter(Boolean).sort((a, b) => b.score - a.score);

    return { foods, picks: picks.slice(0, limit) };
}
