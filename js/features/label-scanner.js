// Camera / photo upload on the Add tab, and AI label reading.
// Puts the photo in state.formPhoto and fills in the form fields it can read.

import { state } from '../core/state.js';
import { byId } from '../core/utils.js';
import { AI_PROXY_URL } from '../config.js';

let cameraStream = null;

function setStatus(text, kind) {
    const colors = {
        busy: ['#dbeafe', '#1e40af'],
        ok: ['#d1fae5', '#065f46'],
        error: ['#fee2e2', '#991b1b'],
    }[kind];
    const status = byId('analysisStatus');
    status.style.display = 'block';
    status.textContent = text;
    [status.style.background, status.style.color] = colors;
}

async function analyzeLabel(imageData) {
    setStatus('🤖 Analyzing wine label with AI...', 'busy');
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

        setStatus('✓ Label analyzed successfully! Form fields filled automatically.', 'ok');
    } catch (error) {
        console.error('AI analysis error:', error);
        setStatus('⚠️ AI analysis failed. Please fill in details manually. Error: ' + error.message, 'error');
    }
}

function handlePhoto(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        state.formPhoto = e.target.result;
        byId('photoPreview').src = state.formPhoto;
        byId('photoPreview').style.display = 'block';
        await analyzeLabel(state.formPhoto);
    };
    reader.readAsDataURL(file);
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    byId('cameraModal').classList.remove('active');
}

export function init() {
    byId('openCameraBtn').addEventListener('click', async () => {
        try {
            cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            byId('cameraVideo').srcObject = cameraStream;
            byId('cameraModal').classList.add('active');
        } catch (error) {
            alert('Unable to access camera. Please use file upload instead.');
        }
    });

    byId('closeCameraBtn').addEventListener('click', stopCamera);

    byId('captureBtn').addEventListener('click', () => {
        const video = byId('cameraVideo');
        const canvas = byId('cameraCanvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            handlePhoto(new File([blob], 'wine-label.jpg', { type: 'image/jpeg' }));
            stopCamera();
        }, 'image/jpeg', 0.95);
    });

    byId('photoUpload').addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) handlePhoto(file);
    });
}
