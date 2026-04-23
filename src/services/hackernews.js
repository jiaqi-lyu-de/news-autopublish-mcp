import fetch from 'node-fetch';

const HN_BASE_URL = 'https://hacker-news.firebaseio.com/v0';

const STORY_KIND_TO_ENDPOINT = {
    top: 'topstories',
    best: 'beststories',
    new: 'newstories',
    ask: 'askstories',
    show: 'showstories',
    job: 'jobstories',
};

function normalizeKind(kind) {
    const normalized = String(kind ?? 'top').toLowerCase().trim();
    return STORY_KIND_TO_ENDPOINT[normalized] ? normalized : 'top';
}

function normalizeLimit(limit, defaultLimit = 10, maxLimit = 50) {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed)) return defaultLimit;
    return Math.max(1, Math.min(maxLimit, Math.floor(parsed)));
}

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
}

export async function getStoryIds(kind = 'top') {
    const normalizedKind = normalizeKind(kind);
    const endpoint = STORY_KIND_TO_ENDPOINT[normalizedKind];
    const url = `${HN_BASE_URL}/${endpoint}.json`;
    const ids = await fetchJson(url);
    return Array.isArray(ids) ? ids : [];
}

export async function getItem(id) {
    if (id === undefined || id === null) {
        throw new Error('Missing Hacker News item id');
    }
    const url = `${HN_BASE_URL}/item/${id}.json`;
    return await fetchJson(url);
}

export async function getStories(options = {}) {
    const kind = normalizeKind(options.kind);
    const limit = normalizeLimit(options.limit);
    const withDetails = options.withDetails !== false;

    const ids = await getStoryIds(kind);
    const selectedIds = ids.slice(0, limit);

    if (!withDetails) {
        return {
            kind,
            ids: selectedIds,
        };
    }

    const items = await Promise.all(selectedIds.map((storyId) => getItem(storyId)));
    const stories = items
        .filter(Boolean)
        .map((item) => ({
            id: item.id,
            type: item.type,
            by: item.by,
            time: item.time,
            title: item.title,
            url: item.url ?? null,
            text: item.text ?? null,
            score: item.score ?? null,
            descendants: item.descendants ?? null,
            kids: Array.isArray(item.kids) ? item.kids : [],
        }));

    return {
        kind,
        stories,
    };
}

