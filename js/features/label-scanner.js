// "Scan label" and "Photo" buttons on the Add tab, plus AI label reading.
// Uses the iPhone's own camera app (via the file input), then fills in what the AI can read.
// Puts the photo in state.formPhoto for add-wine.js to save.

import { state } from '../core/state.js';
import { byId } from '../core/utils.js';
import { AI_PROXY_URL } from '../config.js';

const MAX_SIDE = 1600; // shrink big phone photos before upload/saving

function setStatus(text, kind) {
    const status = byId('analysisStatus');
    status.hidden = false;
    status.textContent = text;
    status.className = `notice notice-${kind}`;
}

// Phone photos can be 5+ MB; resize to keep saving and AI calls fast.
function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that photo')); };
        img.src = url;
    });
}

async function analyzeLabel(imageData) {
    setStatus('🤖 Reading the label…', 'info');
    try {
        const response = await fetch(AI_PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData }),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const info = await response.json();
        if (info.name) byId('wineName').value = info.name;
        if (info.vintage) byId('vintage').value = info.vintage;
        if (info.type) byId('wineType').value = info.type;
        if (info.country) byId('country').value = info.country;
        if (info.region) byId('region').value = info.region;

        setStatus('✓ Label read. Check the details below.', 'success');
    } catch (error) {
        console.error('AI analysis error:', error);
        setStatus('Couldn’t read the label. Please fill in the details yourself. (' + error.message + ')', 'error');
    }
}

async function handlePhoto(e) {
    const file = e.target.files[0];
    e.target.value = ''; // allow picking the same photo again
    if (!file) return;
    try {
        state.formPhoto = await resizeImage(file);
    } catch (error) {
        return setStatus(error.message, 'error');
    }
    byId('photoPreview').src = state.formPhoto;
    byId('photoPreview').hidden = false;
    await analyzeLabel(state.formPhoto);
}

export function init() {
    byId('cameraInput').addEventListener('change', handlePhoto);
    byId('photoUpload').addEventListener('change', handlePhoto);
}
