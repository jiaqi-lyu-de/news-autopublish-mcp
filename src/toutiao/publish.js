import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import { loadCookies } from '../utils/cookies.js';
import { checkLoginStatusOnPage } from './status.js';

// 页面选择器配置
const TOUTIAO_CONFIG = {
    homeUrl: 'https://www.toutiao.com/',
    selectors: {
        // 首页发布按钮流程
        publisherIcon: '.header-right .publisher-icon',     // 首页发布按钮
        publishMenuItem: '.publish-list [role="menuitem"]',         // 发布菜单项 (通常第0个是图文)

        // 发布页内部元素
        uploadTrigger: '.byte-spin-content .article-cover-add',      // 封面图点击区域
        secondUploadBtn: '.btn-upload-scand .upload-handler',      // 弹窗内的上传按钮
        titleInput: '.editor-title textarea',                      // 标题输入框
        contentEditor: '.syl-editor-wrap .ProseMirror',            // 正文编辑器
        publishBtn: '.publish-btn-last',                           // 最终发布按钮
        uploadConfirm: '[data-e2e="imageUploadConfirm-btn"]'       // 二级弹窗确认按钮
    }
};


/**
 * 发布文章工具实现
 */
export async function publishArticle(title, content, imagePath) {
    const { homeUrl, selectors } = TOUTIAO_CONFIG;

    // 校验路径
    try {
        await fs.access(imagePath);
    } catch (error) {
        return {
            status: 'error',
            message: `图片路径不存在: ${imagePath}`
        };
    }

    // 校验标题字数
    if (title.length < 2 || title.length > 30) {
        return {
            status: 'error',
            message: `标题字数限制在 2-30 个字之间，当前字数: ${title.length}`
        };
    }

    const browser = await puppeteer.launch({
        headless: false, // 方便调试
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--start-maximized',
        ],
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null,
    });

    const initialPage = await browser.newPage();

    // 注入脚本隐藏 webdriver 标志
    await initialPage.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined,
        });
    });

    // 设置 User-Agent 模拟真实浏览器
    await initialPage.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // 通过 evaluate 获取当前显示器的屏幕宽高
    const screenResolution = await initialPage.evaluate(() => {
        return {
            width: window.screen.availWidth,
            height: window.screen.availHeight,
            deviceScaleFactor: window.devicePixelRatio
        };
    });

    // 强制设置视口
    await initialPage.setViewport(screenResolution);

    try {
        // 1. 初始化并加载 Cookie
        await loadCookies(initialPage);

        // 2. 检查登录状态
        console.error('Checking login status...');
        const loginStatus = await checkLoginStatusOnPage(initialPage);
        if (!loginStatus.isLoggedIn) {
            await browser.close();
            return {
                status: 'error',
                message: '未发现登录信息或登录已失效，请先进行登录。'
            };
        }

        // 3. 首页操作：点击发布，选择模式
        // checkLoginStatusOnPage 已经带我们落到了首页，不需要再次跳转

        console.error('Clicking publisher icon (with hover/move)...');
        await initialPage.waitForSelector(selectors.publisherIcon, { visible: true, timeout: 10000 });

        // 模拟更真实的用户行为：移动 -> 悬停 -> 点击
        const rect = await initialPage.evaluate((sel) => {
            const el = document.querySelector(sel);
            const { x, y, width, height } = el.getBoundingClientRect();
            return { x, y, width, height };
        }, selectors.publisherIcon);

        await initialPage.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await new Promise(r => setTimeout(r, 2000)); // 悬停一会
        await initialPage.click(selectors.publisherIcon);


        // 捕获新打开的窗口
        const newTargetPromise = browser.waitForTarget(target => target.opener() === initialPage.target());


        const newTarget = await newTargetPromise;
        const page = await newTarget.page();
        if (!page) {
            throw new Error('未能获得新窗口的页面实例');
        }

        // await page.bringToFront();
        // await page.setViewport(screenResolution);
        // console.error('Switched to new publish window.');

        // // // 给新页面设置 WebDriver 屏蔽
        // // await page.evaluateOnNewDocument(() => {
        // //     Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        // // });

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => { });

        // 4. 图片上传
        console.error('Uploading image...');
        // 确保按钮存在且可见
        await page.waitForSelector(selectors.uploadTrigger, { visible: true, timeout: 5000 });
        console.error('Upload button found and visible.');

        // 滚动到视野中心
        await page.evaluate((sel) => {
            const el = document.querySelector(sel);
            if (el) el.scrollIntoView({ behavior: 'auto', block: 'center' });
        }, selectors.uploadTrigger);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 点击上传按钮以打开二级上传界面
        try {
            await page.click(selectors.uploadTrigger);
        } catch (err) {
            console.error('Standard click failed, using evaluate click:', err.message);
            await page.evaluate(sel => document.querySelector(sel)?.click(), selectors.uploadTrigger);
        }

        // 等待二级弹窗加载
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 等待二级上传按钮出现
        await page.waitForSelector(selectors.secondUploadBtn, { visible: true, timeout: 10000 });
        console.error('Second-stage upload button ready.');

        // 触发上传
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            page.click(selectors.secondUploadBtn)
        ]);
        await fileChooser.accept([imagePath]);
        console.error('Image uploaded successfully.');

        await new Promise(resolve => setTimeout(resolve, 5000)); // 等待图片处理
        await page.click(selectors.uploadConfirm);

        // 5. 标题输入
        console.error('Inputting title...');
        await page.waitForSelector(selectors.titleInput, { timeout: 10000 });
        await page.click(selectors.titleInput, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type(selectors.titleInput, title);

        // 6. 正文输入
        console.error('Inputting content...');
        await page.waitForSelector(selectors.contentEditor, { timeout: 10000 });
        await page.click(selectors.contentEditor);
        await page.evaluate((sel) => {
            const editor = document.querySelector(sel);
            if (editor) editor.focus();
        }, selectors.contentEditor);
        await page.keyboard.type(content);

        await new Promise(resolve => setTimeout(resolve, 1000));

        // 7. 最终提交
        console.error('Clicking publish button...');
        await page.waitForSelector(selectors.publishBtn, { timeout: 10000 });
        await page.click(selectors.publishBtn);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.click(selectors.publishBtn);
        await browser.close();

        // 返回成功信息
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


