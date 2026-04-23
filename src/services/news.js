import fetch from 'node-fetch';

/**
 * Breaking news fetching logic.
 */
export async function getBreakingNews() {
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
