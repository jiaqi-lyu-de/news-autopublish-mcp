import puppeteer from 'puppeteer';
import { loadCookies, saveCookies } from '../utils/cookies.js';

/**
 * 在给定页面上检查登录状态
 * 如果元素 .fix-header .login-button 不存在，则认为已登录
 * 如果已登录，会尝试更新并保存 Cookie
 * @param {object} page Puppeteer Page object
 */
export async function checkLoginStatusOnPage(page) {
    const loginButtonSelector = '.fix-header .login-button';

    // 确保页面加载完成
    // 如果已经在头条页面了，可以直接检查
    const currentUrl = page.url();
    if (!currentUrl.includes('toutiao.com')) {
        await page.goto('https://www.toutiao.com/', { waitUntil: 'networkidle2' });
    }

    const buttonExists = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        return !!el;
    }, loginButtonSelector);

    const isLoggedIn = !buttonExists;

    if (isLoggedIn) {
        // 如果已登录，保存最新的 Cookie
        await saveCookies(page);
    }

    return {
        isLoggedIn: isLoggedIn,
        status: isLoggedIn ? 'Logged in' : 'Not logged in'
    };
}

/**
 * 公共接口：检查登录状态
 */
export async function checkLoginStatus() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
        await loadCookies(page);
        return await checkLoginStatusOnPage(page);
    } catch (error) {
        console.error('Check status error:', error);
        return {
            isLoggedIn: false,
            status: 'Error checking status',
            error: error.message
        };
    } finally {
        await browser.close();
    }
}

