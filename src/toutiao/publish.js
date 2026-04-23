import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { loadCookies } from '../utils/cookies.js';
import { checkLoginStatusOnPage } from './status.js';

// Page selector configuration
const TOUTIAO_CONFIG = {
    homeUrl: 'https://www.toutiao.com/',
    selectors: {
        // Home page "publish" flow
        publisherIcon: '.header-right .publisher-icon',     // Home page publish button
        publishMenuItem: '.publish-list [role="menuitem"]',         // Publish menu item (usually index 0 is "article")

        // Elements inside the publish page
        uploadTrigger: '.byte-spin-content .article-cover-add',      // Cover image click area
        secondUploadBtn: '.btn-upload-scand .upload-handler',      // Upload button inside the modal
        titleInput: '.editor-title textarea',                      // Title input
        contentEditor: '.syl-editor-wrap .ProseMirror',            // Content editor
        publishBtn: '.publish-btn-last',                           // Final publish button
        uploadConfirm: '[data-e2e="imageUploadConfirm-btn"]'       // Confirm button in the secondary modal
    }
};


/**
 * Publish-article tool implementation.
 */
export async function publishArticle(title, content, imagePath) {
    const { homeUrl, selectors } = TOUTIAO_CONFIG;

    // Validate path
    try {
        await fs.access(imagePath);
    } catch (error) {
        return {
            status: 'error',
            message: `图片路径不存在: ${imagePath}`
        };
    }

    // Validate title length
    if (title.length < 2 || title.length > 30) {
        return {
            status: 'error',
            message: `标题字数限制在 2-30 个字之间，当前字数: ${title.length}`
        };
    }

    const browser = await puppeteer.launch({
        headless: false, // For easier debugging
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--start-maximized',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null,
    });

    const initialPage = await browser.newPage();

    // Inject a script to hide the webdriver flag.
    await initialPage.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    // Set a User-Agent to mimic a real browser.
    await initialPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // Use evaluate to get the current screen resolution.
    const screenResolution = await initialPage.evaluate(() => {
        return {
            width: window.screen.availWidth,
            height: window.screen.availHeight,
            deviceScaleFactor: window.devicePixelRatio
        };
    });

    // Force the viewport size.
    await initialPage.setViewport(screenResolution);

    try {
        // 1. Initialize and load cookies.
        await loadCookies(initialPage);

        // 2. Check login status.
        console.error('Checking login status...');
        const loginStatus = await checkLoginStatusOnPage(initialPage);
        if (!loginStatus.isLoggedIn) {
            await browser.close();
            return {
                status: 'error',
                message: '未发现登录信息或登录已失效，请先进行登录。'
            };
        }

        // 3. Home page: click publish and choose a mode.
        // checkLoginStatusOnPage already navigated us to the home page, no need to navigate again.

        console.error('Clicking publisher icon (with hover/move)...');
        await initialPage.waitForSelector(selectors.publisherIcon, { visible: true, timeout: 10000 });

        // Mimic more realistic user behavior: move -> hover -> click.
        const rect = await initialPage.evaluate((sel) => {
            const el = document.querySelector(sel);
            const { x, y, width, height } = el.getBoundingClientRect();
            return { x, y, width, height };
        }, selectors.publisherIcon);

        await initialPage.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await new Promise(r => setTimeout(r, 1000)); // Hover for a shorter moment
        await initialPage.click(selectors.publisherIcon);


        // Capture the newly opened window.
        const newTargetPromise = browser.waitForTarget(target => target.opener() === initialPage.target());


        const newTarget = await newTargetPromise;
        const page = await newTarget.page();
        if (!page) {
            throw new Error('未能获得新窗口的页面实例');
        }

        // await page.bringToFront();
        // await page.setViewport(screenResolution);
        // console.error('Switched to new publish window.');

        // // // Apply WebDriver masking for the new page
        // // await page.evaluateOnNewDocument(() => {
        // //     Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // // });

        console.error('Waiting for navigation...');

        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 3000 }).catch(() => { });
        console.error('Navigation completed.');

        // 4. Upload image.
        console.error('Uploading image...');
        // Ensure the button exists and is visible.
        await page.waitForSelector(selectors.uploadTrigger, { visible: true, timeout: 5000 });
        console.error('Upload button found and visible.');

        // Scroll into the center of the viewport.
        await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.scrollIntoView({ behavior: 'auto', block: 'center' });
        }, selectors.uploadTrigger);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // Click the upload trigger to open the second-stage upload UI.
        try {
            await page.click(selectors.uploadTrigger);
        } catch (err) {
            console.error('Standard click failed, using evaluate click:', err.message);
            await page.evaluate(sel => document.querySelector(sel)?.click(), selectors.uploadTrigger);
        }

        // Wait for the modal to load.
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Wait for the second-stage upload button to appear.
        await page.waitForSelector(selectors.secondUploadBtn, { visible: true, timeout: 10000 });
        console.error('Second-stage upload button ready.');

        // Trigger file upload.
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click(selectors.secondUploadBtn)
        ]);
        await fileChooser.accept([imagePath]);
        console.error('Image uploaded successfully.');

        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for image processing
        await page.click(selectors.uploadConfirm);

        // 5. Title input.
        console.error('Inputting title...');
        await page.waitForSelector(selectors.titleInput, { timeout: 10000 });
        await page.click(selectors.titleInput, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type(selectors.titleInput, title);

        // 6. Content input.
        console.error('Inputting content...');
        await page.waitForSelector(selectors.contentEditor, { timeout: 10000 });
        await page.click(selectors.contentEditor);
        await page.evaluate((sel) => {
            const editor = document.querySelector(sel);
            if (editor) editor.focus();
        }, selectors.contentEditor);
        await page.keyboard.type(content);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 7. Final submit.
        console.error('Clicking publish button...');
        await page.waitForSelector(selectors.publishBtn, { timeout: 10000 });
        await page.click(selectors.publishBtn);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.click(selectors.publishBtn);
        await browser.close();

        // Return success info.
        return {
            status: 'success',
            message: '文章内容已在新窗口中填充并触发发布，请确认。',
            detail: {
                title,
                imagePath
            }
        };

    } catch (error) {
        console.error('Publish error:', error);
        return {
            status: 'error',
            message: `发布失败: ${error.message}`
        };
    }
}

