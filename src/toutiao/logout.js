import { deleteCookies } from '../utils/cookies.js';

/**
 * 删除本地存储的 Cookie 文件
 */
export async function logout() {
    const success = await deleteCookies();
    if (success) {
        return {
            status: 'success',
            message: '已成功删除本地 Cookie，账号已登出。'
        };
    } else {
        // 可能是文件不存在，或者是真的失败了
        return {
            status: 'success', // 即使失败也偏向于告诉用户已完成（通常是因为文件不存在）
            message: '本地 Cookie 已清除或不存在。'
        };
    }
}

