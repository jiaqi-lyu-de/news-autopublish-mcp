import fetch from 'node-fetch';
import { getStories } from './hackernews.js';

/**
 * Breaking news fetching logic.
 */
export async function getBreakingNews(options = {}) {
    const source = String(options.source ?? process.env.NEWS_SOURCE ?? 'eventregistry').toLowerCase();

    if (source === 'hackernews') {
        try {
            const data = await getStories({
                kind: options.kind ?? 'top',
                limit: options.limit ?? 10,
                withDetails: options.withDetails ?? true,
            });
            return {
                status: 'success',
                source: 'hackernews',
                data,
            };
        } catch (error) {
            console.error('Error fetching Hacker News stories:', error);
            return {
                status: 'error',
                source: 'hackernews',
                message: `Failed to fetch Hacker News stories: ${error.message}`,
            };
        }
    }

    const apiKey = process.env.NEWS_API_KEY || '';

    if (!apiKey) {
        return {
            status: 'error',
            message: '缺少 NEWS_API_KEY，请先在 .env 中配置 Event Registry API Key。'
        };
    }

    const url = `https://eventregistry.org/api/v1/event/getBreakingEvents?breakingEventsMinBreakingScore=0.2&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);

        if (response.status !== 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return {
            status: 'success',
            data,
        };
    } catch (error) {
        console.error('Error fetching breaking news:', error);
        return {
            status: 'error',
            message: `获取突发新闻失败: ${error.message}`
        };
    }
}
