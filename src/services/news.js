import fetch from 'node-fetch';

/**
 * 获取突发新闻逻辑
 */
export async function getBreakingNews() {
    const apiKey = process.env.NEWS_API_KEY || '';
    const url = `https://eventregistry.org/api/v1/event/getBreakingEvents?breakingEventsMinBreakingScore=2&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);

        if (response.status != 200) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        return {
            status: 'success',
            data: data,
        };
    } catch (error) {
        console.error('Error fetching breaking news:', error);
        return {
            status: 'error',
            message: `获取突发新闻失败: ${error.message}`
        };
    }
}
