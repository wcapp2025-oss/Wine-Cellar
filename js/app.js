// Starts the app. Each feature in js/features/ is loaded separately:
// if one has a bug, it shows an error in its own tab and everything else keeps working.

import { FEATURES } from './config.js';
import { on, setErrorHandler } from './core/state.js';
import { hideTab, showFeatureError } from './core/ui.js';
import { loadAll, clearAll } from './core/data.js';
import { startAuth } from './core/auth.js';

// Which tab each feature lives in (used to show its errors in the right place).
const FEATURE_TABS = {
    dashboard: 'dashboard',
    'add-wine': 'addWine',
    'label-scanner': 'addWine',
    inventory: 'inventory',
    consumed: 'consumed',
    locations: 'locations',
    friends: 'friends',
};

function featureContainer(name) {
    return document.querySelector(`#${FEATURE_TABS[name]}Tab .card`);
}

setErrorHandler((owner, err) => {
    console.error(`[${owner}]`, err);
    showFeatureError(owner, err, featureContainer(owner));
});

async function loadFeature(name) {
    try {
        const feature = await import(`./features/${name}.js`);
        // ctx.on tags the feature's listeners so their errors are reported in the right tab.
        await feature.init({ on: (event, fn) => on(event, fn, name) });
    } catch (err) {
        console.error(`Feature "${name}" failed to load:`, err);
        showFeatureError(name, err, featureContainer(name));
    }
}

async function start() {
    const enabled = Object.keys(FEATURES).filter(name => FEATURES[name]);

    // Hide any tab that has no switched-on feature in it.
    const usedTabs = new Set(enabled.map(name => FEATURE_TABS[name]));
    new Set(Object.values(FEATURE_TABS)).forEach(tab => { if (!usedTabs.has(tab)) hideTab(tab); });

    await Promise.all(enabled.map(loadFeature));

    on('auth:signed-in', async () => {
        try {
            await loadAll();
        } catch (err) {
            console.error('Error loading data:', err);
            alert('Failed to load data: ' + (err.message || 'Unknown error'));
        }
    });
    on('auth:signed-out', clearAll);

    await startAuth();
}

start();
