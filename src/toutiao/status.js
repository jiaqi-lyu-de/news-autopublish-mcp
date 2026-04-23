import puppeteer from 'puppeteer';
import { loadCookies, saveCookies } from '../utils/cookies.js';

/**
 * Check login status on a given page.
 * If the element `.fix-header .login-button` does not exist, we treat it as logged in.
 * If logged in, we try to update and save cookies.
 * @param {object} page Puppeteer Page object
 */
export async function checkLoginStatusOnPage(page) {
    const loginButtonSelector = '.fix-header .login-button';

    // Ensure the page is loaded.
    // If we're already on Toutiao, we can check directly.
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
        // If logged in, save the latest cookies.
        await saveCookies(page);
    }

    return {
        isLoggedIn: isLoggedIn,
        status: isLoggedIn ? 'Logged in' : 'Not logged in'
    };
}

/**
 * Public API: check login status.
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
