import puppeteer from 'puppeteer';
import { loadCookies, saveCookies } from '../utils/cookies.js';

/**
 * 后台监听登录任务
 */

async function handleBackgroundLogin(browser, page, loginBtnSelector) {
    try {
        console.error('Starting background login listener...');

        // 1. 首先确保当前是“未登录”状态（登录按钮存在）
        let initialChecked = false;
        const timeout = 5 * 60 * 1000; // 5分钟超时
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            try {
                // 检查页面是否已关闭
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
                    // 2. 检查按钮是否消失（代表登录成功）
                    if (!buttonExists) {
                        console.error('Login successful detected in background.');
                        await saveCookies(page);
                        break;
                    }
                }
            } catch (err) {
                // 忽略 "Execution context was destroyed" 错误，因为这通常发生在页面跳转时
                if (err.message.includes('Execution context was destroyed')) {
                    console.error('Page navigating, retrying check...');
                } else {
                    throw err;
                }
            }

            // 等待 500ms 后再次检查
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
 * 实现登录逻辑：立即提取并返回二维码，后台开启监听
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

        // 点击登录按钮打开二维码
        const loginBtnSelector = '.fix-header .login-button';
        await page.waitForSelector(loginBtnSelector, { timeout: 5000 });

        await page.evaluate((sel) => {
            const btn = document.querySelector(sel);
            if (btn) btn.click();
        }, loginBtnSelector);

        // 获取二维码
        const qrContentSelector = '.web-login-scan-code img';
        await page.waitForSelector(qrContentSelector, { visible: true, timeout: 5000 });
        const qrSrc = await page.evaluate((sel) => {
            const img = document.querySelector(sel);
            return img ? img.src : null;
        }, qrContentSelector);

        if (!qrSrc) {
            throw new Error('Failed to get QR code source');
        }

        // --- 核心逻辑：不使用 await，启动后台监听任务 ---
        handleBackgroundLogin(browser, page, loginBtnSelector).catch(err => console.error("Background error:", err));

        // 立即返回结果给 MCP，前端就能显示二维码了
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
