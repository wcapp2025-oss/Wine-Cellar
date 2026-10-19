// Friends tab: friend requests, friends list, and viewing a friend's collection.
// Friends' data is always escaped before display, since it's typed by someone else.

import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { registerActions } from '../core/ui.js';
import { byId, escapeHtml, bottleSvg } from '../core/utils.js';

let friends = [];
let friendRequests = [];

// Each friendship row has two people. Load both emails and pick the one that isn't you.
const BOTH_PROFILES = '*, requester:user_profiles!friendships_user_id_fkey(email), recipient:user_profiles!friendships_friend_id_fkey(email)';

function otherPerson(friendship) {
    const iSentIt = friendship.user_id === state.user.id;
    return {
        id: iSentIt ? friendship.friend_id : friendship.user_id,
        email: (iSentIt ? friendship.recipient?.email : friendship.requester?.email) || 'Unknown',
    };
}

async function loadFriends() {
    const me = state.user.id;
    const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select(BOTH_PROFILES)
        .or(`user_id.eq.${me},friend_id.eq.${me}`)
        .eq('status', 'accepted');
    if (friendsError) throw friendsError;
    friends = friendsData || [];

    // Pending requests where I'm the recipient
    const { data: requestsData, error: requestsError } = await supabase
        .from('friendships')
        .select(BOTH_PROFILES)
        .eq('friend_id', me)
        .eq('status', 'pending');
    if (requestsError) throw requestsError;
    friendRequests = requestsData || [];

    renderFriends();
    renderRequests();
}

const emptyRow = text => `<div class="empty-state" style="padding:20px">${text}</div>`;

function renderRequests() {
    const container = byId('friendRequestsList');
    if (friendRequests.length === 0) {
        container.innerHTML = emptyRow('No pending requests');
        return;
    }
    container.innerHTML = `<div class="list-group">${friendRequests.map(req => `
        <div class="location-row" style="border-top:none">
            <span><b>${escapeHtml(otherPerson(req).email)}</b> wants to connect</span>
            <span style="display:flex;gap:6px">
                <button class="btn btn-small btn-primary" data-action="accept-friend" data-id="${escapeHtml(req.id)}">Accept</button>
                <button class="btn btn-small btn-secondary" data-action="reject-friend" data-id="${escapeHtml(req.id)}">Decline</button>
            </span>
        </div>`).join('')}</div>`;
}

function renderFriends() {
    const container = byId('friendsList');
    if (friends.length === 0) {
        container.innerHTML = emptyRow('No friends yet. Add one above to see each other’s collections.');
        return;
    }
    container.innerHTML = `<div class="list-group">${friends.map(friendship => {
        const friend = otherPerson(friendship);
        return `
            <div class="wine-row">
                <div class="wine-main"><div class="wine-title">${escapeHtml(friend.email)}</div></div>
                <button class="btn btn-small btn-secondary" data-action="view-friend" data-id="${escapeHtml(friend.id)}" data-email="${escapeHtml(friend.email)}">View</button>
                <button class="btn btn-small btn-danger" data-action="remove-friend" data-id="${escapeHtml(friendship.id)}" aria-label="Remove friend">✕</button>
            </div>`;
    }).join('')}</div>`;
}

function renderFriendWines(wines) {
    const container = byId('friendWinesList');
    if (wines.length === 0) {
        container.innerHTML = emptyRow('No wines in this collection');
        return;
    }
    container.innerHTML = `<div class="list-group">${wines.map(wine => `
        <div class="wine-row">
            ${wine.photo ? `<img class="wine-thumb" src="${escapeHtml(wine.photo)}" alt="">` : `<div class="wine-thumb">${bottleSvg(wine.type)}</div>`}
            <div class="wine-main">
                <div class="wine-title">${escapeHtml(wine.name)}</div>
                <div class="wine-sub">${escapeHtml([wine.vintage || 'NV', wine.region, wine.country].filter(Boolean).join(' · '))}</div>
                ${wine.notes ? `<div class="wine-sub">${escapeHtml(wine.notes)}</div>` : ''}
            </div>
            <span class="count-pill">${wine.quantity}</span>
        </div>`).join('')}</div>`;
}

async function viewCollection({ id, email }) {
    byId('friendCollectionTitle').textContent = email;
    byId('friendsMain').hidden = true;
    byId('friendCollectionView').hidden = false;
    byId('friendWinesList').innerHTML = emptyRow('Loading…');
    window.scrollTo(0, 0);

    const { data: wines, error } = await supabase.from('wines').select('*')
        .eq('user_id', id).order('date_added', { ascending: false });
    if (error) throw error;
    const { data: consumed } = await supabase.from('consumed_wines').select('*').eq('user_id', id);

    const list = wines || [];
    byId('friendTotalCount').textContent = list.reduce((sum, w) => sum + (w.quantity || 0), 0);
    byId('friendConsumedCount').textContent = (consumed || []).length;
    byId('friendUniqueWines').textContent = new Set(list.map(w => (w.name || '').toLowerCase())).size;
    renderFriendWines(list);
}

function closeCollection() {
    byId('friendsMain').hidden = false;
    byId('friendCollectionView').hidden = true;
}

async function sendRequest() {
    const email = byId('friendEmail').value.trim();
    const result = byId('friendSearchResult');
    const say = (kind, text) => { result.innerHTML = `<div class="notice notice-${kind}">${escapeHtml(text)}</div>`; };
    if (!email) return;

    try {
        const { data: profiles } = await supabase.from('user_profiles').select('*').eq('email', email).limit(1);
        if (!profiles || profiles.length === 0) return say('error', 'No account with that email');

        const friendProfile = profiles[0];
        if (friendProfile.id === state.user.id) return say('error', 'You can’t add yourself');

        const { error } = await supabase.from('friendships').insert([{
            user_id: state.user.id, friend_id: friendProfile.id, status: 'pending',
        }]);
        if (error?.code === '23505') return say('info', 'Request already sent');
        if (error) throw error;

        say('success', '✓ Request sent');
        byId('friendEmail').value = '';
    } catch (error) {
        console.error('Error sending friend request:', error);
        say('error', 'Could not send the request');
    }
}

async function updateFriendship(id, change) {
    const query = change === 'delete'
        ? supabase.from('friendships').delete().eq('id', id)
        : supabase.from('friendships').update(change).eq('id', id);
    const { error } = await query;
    if (error) throw error;
    await loadFriends();
}

export function init({ on }) {
    byId('sendFriendRequestBtn').addEventListener('click', sendRequest);

    registerActions({
        'accept-friend': ({ id }) => updateFriendship(id, { status: 'accepted', responded_at: new Date().toISOString() }),
        'reject-friend': ({ id }) => updateFriendship(id, 'delete'),
        'remove-friend': ({ id }) => confirm('Remove this friend?') && updateFriendship(id, 'delete'),
        'view-friend': viewCollection,
        'close-friend-collection': closeCollection,
    });

    on('subpage:shown', page => { if (page === 'friends') { closeCollection(); return loadFriends(); } });
    on('auth:signed-out', () => { friends = []; friendRequests = []; closeCollection(); });
}
