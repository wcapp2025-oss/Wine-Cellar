// Starts the app. Each feature in js/features/ is loaded separately:
// if one has a bug, it shows an error in its own area and everything else keeps working.

import { FEATURES } from './config.js';
import { on, setErrorHandler } from './core/state.js';
import { hideTab, showFeatureError } from './core/ui.js';
import { loadAll, clearAll } from './core/data.js';
import { startAuth } from './core/auth.js';

// Which tab each feature lives in. Features in the same tab share it;
// a tab disappears only when all its features are switched off.
const FEATURE_TABS = {
    inventory: 'wines',
    cellar: 'cellar',
    'add-wine': 'addWine',
    'label-scanner': 'addWine',
    consumed: 'consumed',
    dashboard: 'more',
    locations: 'more',
    friends: 'more',
};

// Where to show a feature's error: its own section if it has one, else its tab.
function featureContainer(name) {
    return document.querySelector(`[data-subpage="${name}"]`)
        || document.querySelector(`[data-section="${name}"]`)?.closest('.tab-content, .subpage, .card')
        || document.getElementById(`${FEATURE_TABS[name]}Tab`);
}

setErrorHandler((owner, err) => {
    console.error(`[${owner}]`, err);
    showFeatureError(owner, err, featureContainer(owner));
});

async function loadFeature(name) {
    try {
        const feature = await import(`./features/${name}.js`);
        // ctx.on tags the feature's listeners so their errors are reported in the right place.
        await feature.init({ on: (event, fn) => on(event, fn, name) });
    } catch (err) {
        console.error(`Feature "${name}" failed to load:`, err);
        showFeatureError(name, err, featureContainer(name));
    }
}

async function start() {
    const enabled = Object.keys(FEATURES).filter(name => FEATURES[name]);

    // Hide the parts of the page that belong to switched-off features.
    Object.keys(FEATURES).filter(name => !FEATURES[name]).forEach(name => {
        document.querySelectorAll(`[data-section="${name}"]`).forEach(el => { el.hidden = true; });
    });
    const usedTabs = new Set(enabled.map(name => FEATURE_TABS[name]));
    new Set(Object.values(FEATURE_TABS)).forEach(tab => {
        if (!usedTabs.has(tab) && tab !== 'more') hideTab(tab);
    });

    await Promise.all(enabled.map(loadFeature));

    on('auth:signed-in', async () => {
        try {
            await loadAll();
        } catch (err) {
            console.error('Error loading data:', err);
            showFeatureError('loading data', err, document.getElementById('winesTab'));
        }
    });
    on('auth:signed-out', clearAll);

    await startAuth();
}

start();
