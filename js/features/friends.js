// Friends tab: friend requests, friends list, and viewing a friend's collection.
// Friends' data is always escaped before display, since it's typed by someone else.

import { supabase } from '../core/supabase.js';
import { state } from '../core/state.js';
import { registerActions } from '../core/ui.js';
import { byId, escapeHtml, bottles } from '../core/utils.js';

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

function renderRequests() {
    const container = byId('friendRequestsList');
    if (friendRequests.length === 0) {
        container.innerHTML = '<div style="color: #9ca3af; padding: 20px; text-align: center;">No pending requests</div>';
        return;
    }
    container.innerHTML = friendRequests.map(req => `
        <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div><strong>${escapeHtml(otherPerson(req).email)}</strong> wants to connect</div>
            <div style="display: flex; gap: 8px;">
                <button data-action="accept-friend" data-id="${escapeHtml(req.id)}" style="width: auto; padding: 8px 16px; background: #10b981; font-size: 14px;">Accept</button>
                <button data-action="reject-friend" data-id="${escapeHtml(req.id)}" style="width: auto; padding: 8px 16px; background: #ef4444; font-size: 14px;">Reject</button>
            </div>
        </div>`).join('');
}

function renderFriends() {
    const container = byId('friendsList');
    if (friends.length === 0) {
        container.innerHTML = '<div style="color: #9ca3af; padding: 20px; text-align: center;">No friends yet. Add friends to share your collection!</div>';
        return;
    }
    container.innerHTML = friends.map(friendship => {
        const friend = otherPerson(friendship);
        return `
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;"><strong>${escapeHtml(friend.email)}</strong></div>
                <div style="display: flex; gap: 8px;">
                    <button data-action="view-friend" data-id="${escapeHtml(friend.id)}" data-email="${escapeHtml(friend.email)}" style="width: auto; padding: 8px 16px; background: #667eea; font-size: 14px;">View Collection</button>
                    <button data-action="remove-friend" data-id="${escapeHtml(friendship.id)}" style="width: auto; padding: 8px 16px; background: #ef4444; font-size: 14px;">Remove</button>
                </div>
            </div>`;
    }).join('');
}

function renderFriendWines(wines) {
    const container = byId('friendWinesList');
    if (wines.length === 0) {
        container.innerHTML = '<div style="color: #9ca3af; padding: 20px; text-align: center;">No wines in collection</div>';
        return;
    }
    container.innerHTML = wines.map(wine => `
        <div class="wine-item">
            ${wine.photo ? `<img src="${escapeHtml(wine.photo)}" style="width: 100%; max-height: 150px; object-fit: cover; border-radius: 6px; margin-bottom: 10px;">` : ''}
            <div class="wine-name">${escapeHtml(wine.name)}</div>
            <div class="wine-details">
                ${wine.vintage ? `${escapeHtml(wine.vintage)} • ` : ''}
                ${wine.type ? `${escapeHtml(wine.type)} • ` : ''}
                ${wine.country ? `${escapeHtml(wine.country)} • ` : ''}
                ${bottles(wine.quantity)}
            </div>
            <span class="location-badge">${escapeHtml(wine.location)}</span>
            ${wine.notes ? `<div style="margin-top: 10px; font-size: 0.9em; color: #6b7280;">${escapeHtml(wine.notes)}</div>` : ''}
        </div>`).join('');
}

async function viewCollection({ id, email }) {
    byId('friendCollectionTitle').textContent = `${email}'s Collection`;
    document.querySelector('#friendsTab > .card').style.display = 'none';
    byId('friendCollectionView').style.display = 'block';

    const { data: wines, error } = await supabase.from('wines').select('*')
        .eq('user_id', id).order('date_added', { ascending: false });
    if (error) throw error;
    const { data: consumed } = await supabase.from('consumed_wines').select('*').eq('user_id', id);

    const list = wines || [];
    byId('friendTotalCount').textContent = list.reduce((sum, w) => sum + w.quantity, 0);
    byId('friendConsumedCount').textContent = (consumed || []).length;
    byId('friendUniqueWines').textContent = new Set(list.map(w => (w.name || '').toLowerCase())).size;
    renderFriendWines(list);
}

function closeCollection() {
    document.querySelector('#friendsTab > .card').style.display = 'block';
    byId('friendCollectionView').style.display = 'none';
}

async function sendRequest() {
    const email = byId('friendEmail').value.trim();
    const result = byId('friendSearchResult');
    const say = (color, text) => { result.innerHTML = `<div style="color: ${color};">${escapeHtml(text)}</div>`; };
    if (!email) return;

    try {
        const { data: profiles } = await supabase.from('user_profiles').select('*').eq('email', email).limit(1);
        if (!profiles || profiles.length === 0) return say('#991b1b', 'User not found');

        const friendProfile = profiles[0];
        if (friendProfile.id === state.user.id) return say('#991b1b', 'You cannot add yourself');

        const { error } = await supabase.from('friendships').insert([{
            user_id: state.user.id, friend_id: friendProfile.id, status: 'pending',
        }]);
        if (error?.code === '23505') return say('#78350f', 'Friend request already sent');
        if (error) throw error;

        say('#065f46', '✓ Friend request sent!');
        byId('friendEmail').value = '';
    } catch (error) {
        console.error('Error sending friend request:', error);
        say('#991b1b', 'Failed to send request');
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

    on('tab:shown', tab => { if (tab === 'friends') return loadFriends(); });
    on('auth:signed-out', () => { friends = []; friendRequests = []; closeCollection(); });
}
