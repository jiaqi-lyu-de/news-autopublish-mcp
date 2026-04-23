import puppeteer from 'puppeteer';
import { loadCookies, saveCookies } from '../utils/cookies.js';

/**
 * Background login watcher.
 */

async function handleBackgroundLogin(browser, page, loginBtnSelector) {
    try {
        console.error('Starting background login listener...');

        // 1. First, ensure we are in the "logged out" state (login button exists).
        let initialChecked = false;
        const timeout = 5 * 60 * 1000; // 5-minute timeout
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                // Check whether the page has been closed.
                if (page.isClosed()) break;

                const buttonExists = await page.evaluate((sel) => {
                    const btn = document.querySelector(sel);
                    return !!btn;
                }, loginBtnSelector);

                if (!initialChecked) {
                    if (buttonExists) {
                        initialChecked = true;
                        console.error('Confirmed not logged in state. Waiting for user to scan...');
                    }
                } else {
                    // 2. Check whether the button disappeared (indicates login success).
                    if (!buttonExists) {
                        console.error('Login successful detected in background.');
                        await saveCookies(page);
                        break;
                    }
                }
            } catch (err) {
                // Ignore "Execution context was destroyed" because it commonly happens during navigation.
                if (err.message.includes('Execution context was destroyed')) {
                    console.error('Page navigating, retrying check...');
                } else {
                    throw err;
                }
            }

            // Wait 500ms and check again.
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } catch (error) {
        console.error("Background login listener error:", error);
    } finally {
        console.error("Closing browser from background task.");
        await browser.close();
    }
}

/**
 * Login flow: immediately extract and return the QR code, then start a background watcher.
 */
export async function login() {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--window-size=1200,800'
        ],
        defaultViewport: null
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    try {
        await loadCookies(page);
        await page.goto('https://www.toutiao.com/', { waitUntil: 'networkidle2' });
        console.error('Page loaded');

        // Click the login button to open the QR code.
        const loginBtnSelector = '.fix-header .login-button';
        await page.waitForSelector(loginBtnSelector, { timeout: 5000 });

        await page.evaluate((sel) => {
            const btn = document.querySelector(sel);
            if (btn) btn.click();
        }, loginBtnSelector);
        // Get the QR code.
        const qrContentSelector = '.web-login-scan-code img';
        await page.waitForSelector(qrContentSelector, { visible: true, timeout: 5000 });
        const qrSrc = await page.evaluate((sel) => {
            const img = document.querySelector(sel);
            return img ? img.src : null;
        }, qrContentSelector);

        if (!qrSrc) {
            throw new Error('Failed to get QR code source');
        }

        // --- Core logic: start background watcher without awaiting it ---
        handleBackgroundLogin(browser, page, loginBtnSelector).catch(err => console.error("Background error:", err));

        // Return immediately to MCP so the frontend can display the QR code.
        return {
            status: 'waiting_for_scan',
            qrCode: qrSrc,
            message: '二维码已获取，请通过手机扫码。登录成功后系统会自动保存 Cookie。'
        };

    } catch (error) {
        console.error('Login prompt error:', error);
        await browser.close();
        return {
            status: 'error',
            message: error.message
        };
    }
}
