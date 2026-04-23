import { deleteCookies } from '../utils/cookies.js';

/**
 * Delete the locally stored cookies file.
 */
export async function logout() {
    const success = await deleteCookies();
    if (success) {
        return {
            status: 'success',
            message: '已成功删除本地 Cookie，账号已登出。'
        };
    } else {
        // The file may not exist, or this may be a real failure.
        return {
            status: 'success', // Even on failure, prefer reporting completion (usually means the file didn't exist)
            message: '本地 Cookie 已清除或不存在。'
        };
    }
}
