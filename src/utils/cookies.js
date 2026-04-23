import fs from 'fs/promises';
import path from 'path';

const COOKIE_PATH = path.join(process.cwd(), 'cookies.json');

/**
 * Load cookies into a Puppeteer page.
 * @param {object} page Puppeteer Page object
 * @returns {Promise<boolean>} Whether loading succeeded (i.e., whether the file exists)
 */
export async function loadCookies(page) {
    try {
        const cookieData = await fs.readFile(COOKIE_PATH, 'utf-8');
        const cookies = JSON.parse(cookieData);
        if (cookies && cookies.length > 0) {
            await page.setCookie(...cookies);
            console.error('Cookies loaded successfully.');
            return true;
        }
        return false;
    } catch (error) {
        console.error('No existing cookies found or error loading:', error.message);
        return false;
    }
}

/**
 * Save page cookies to a local file.
 * @param {object} page Puppeteer Page object
 */
export async function saveCookies(page) {
    const cookies = await page.cookies();
    await fs.writeFile(COOKIE_PATH, JSON.stringify(cookies, null, 2));
    console.error('Cookies saved to:', COOKIE_PATH);
}

/**
 * Delete the local cookies file.
 */
export async function deleteCookies() {
    try {
        await fs.unlink(COOKIE_PATH);
        console.error('Cookies file deleted.');
        return true;
    } catch (error) {
        console.error('Error deleting cookies file:', error.message);
        return false;
    }
}
