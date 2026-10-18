// Shared app data plus a tiny event system.
// Features never call each other directly. They read `state` and listen for events,
// so a crash in one listener can't stop the others.

export const state = {
    user: null,
    wines: [],
    consumedWines: [],
    locations: [],
};

const listeners = {};
let reportError = (owner, err) => console.error(`[${owner}]`, err);

// app.js sets this so errors show up inside the feature's own tab.
export function setErrorHandler(fn) {
    reportError = fn;
}

// owner = the feature name, used when reporting errors.
export function on(event, fn, owner = 'app') {
    (listeners[event] ||= []).push({ fn, owner });
}

export function emit(event, payload) {
    for (const { fn, owner } of listeners[event] || []) {
        try {
            const result = fn(payload);
            if (result && typeof result.catch === 'function') {
                result.catch(err => reportError(owner, err));
            }
        } catch (err) {
            reportError(owner, err);
        }
    }
}

// Events used in the app:
//   'data:changed'   wines, consumed wines or locations changed. Re-render.
//   'tab:shown'      payload = tab name ('dashboard', 'inventory', ...)
//   'wine:edit'      payload = wine id. The add-wine form loads it.
//   'auth:signed-in' / 'auth:signed-out'
