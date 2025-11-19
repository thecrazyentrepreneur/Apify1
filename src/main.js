import { Actor } from 'apify';
import { PuppeteerCrawler } from 'crawlee';

await Actor.init();

const input = await Actor.getInput();
const {
    platformLinks = [],
    executive = '',
    team = '',
    category = '',
    internalComment = '',
} = input;

if (!platformLinks || platformLinks.length === 0) {
    throw new Error('No platform links provided. Please provide at least one creator profile URL.');
}

const results = [];

const crawler = new PuppeteerCrawler({
    async requestHandler({ request, page, log }) {
        const url = request.url;
        log.info(`Processing: ${url}`);

        try {
            let creatorData = {};

            if (url.includes('instagram.com')) {
                creatorData = await scrapeInstagram(page, url, log);
            } else if (url.includes('tiktok.com')) {
                creatorData = await scrapeTikTok(page, url, log);
            } else if (url.includes('youtube.com')) {
                creatorData = await scrapeYouTube(page, url, log);
            } else {
                log.warning(`Unsupported platform: ${url}`);
                return;
            }

            const currentDate = new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const result = {
                'Internal Comment': internalComment || '',
                'Date': currentDate,
                'Executive': executive || '',
                'Team': team || '',
                'Creator Name': creatorData.creatorName || '',
                'Category': category || '',
                'Platform': creatorData.platform || '',
                'Platform Link': url,
                'Followers': creatorData.followers || 0,
                'Region': creatorData.region || '',
                'Cost': '',
                'Avg Views': creatorData.avgViews || 0,
                'ER': creatorData.engagementRate || '',
                'Client Comment': '',
                'TCE Comment': ''
            };

            results.push(result);
            log.info(`Successfully scraped: ${creatorData.creatorName}`);

        } catch (error) {
            log.error(`Failed to scrape ${url}: ${error.message}`);
        }
    },
    maxRequestsPerCrawl: platformLinks.length,
    navigationTimeoutSecs: 60,
    launchContext: {
        launchOptions: {
            headless: true,
        },
    },
});

async function scrapeInstagram(page, url, log) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
        const extractNumber = (text) => {
            if (!text) return 0;
            text = text.toLowerCase().replace(/,/g, '');
            if (text.includes('k')) return parseFloat(text) * 1000;
            if (text.includes('m')) return parseFloat(text) * 1000000;
            return parseInt(text) || 0;
        };

        const nameElement = document.querySelector('header h2, header span') || 
                          document.querySelector('[class*="username"]');
        const creatorName = nameElement?.textContent?.trim() || '';

        const followersElement = Array.from(document.querySelectorAll('a, span')).find(
            el => el.textContent.includes('followers')
        );
        const followersText = followersElement?.textContent?.match(/[\d,.]+[kKmM]?/)?.[0] || '0';
        const followers = extractNumber(followersText);

        const viewElements = Array.from(document.querySelectorAll('[class*="views"], span')).filter(
            el => el.textContent.match(/[\d,.]+[kKmM]?\s*(views|plays)/i)
        );
        
        let totalViews = 0;
        let postCount = 0;
        viewElements.slice(0, 12).forEach(el => {
            const viewText = el.textContent.match(/[\d,.]+[kKmM]?/)?.[0];
            if (viewText) {
                totalViews += extractNumber(viewText);
                postCount++;
            }
        });
        const avgViews = postCount > 0 ? Math.round(totalViews / postCount) : 0;

        const engagementRate = followers > 0 ? ((avgViews / followers) * 100).toFixed(2) : '0';

        return {
            creatorName,
            followers,
            avgViews,
            engagementRate,
            platform: 'Instagram',
            region: ''
        };
    });

    return data;
}

async function scrapeTikTok(page, url, log) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
        const extractNumber = (text) => {
            if (!text) return 0;
            text = text.toLowerCase().replace(/,/g, '');
            if (text.includes('k')) return parseFloat(text) * 1000;
            if (text.includes('m')) return parseFloat(text) * 1000000;
            if (text.includes('b')) return parseFloat(text) * 1000000000;
            return parseInt(text) || 0;
        };

        const nameElement = document.querySelector('[data-e2e="user-title"], h1, h2');
        const creatorName = nameElement?.textContent?.trim() || '';

        const followersElement = document.querySelector('[data-e2e="followers-count"], [title*="Followers"]');
        const followersText = followersElement?.textContent?.trim() || '0';
        const followers = extractNumber(followersText);

        const videoElements = document.querySelectorAll('[data-e2e="video-views"]');
        let totalViews = 0;
        let videoCount = 0;
        
        videoElements.forEach((el, index) => {
            if (index < 12) {
                const viewText = el.textContent.trim();
                totalViews += extractNumber(viewText);
                videoCount++;
            }
        });
        
        const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

        const engagementRate = followers > 0 ? ((avgViews / followers) * 100).toFixed(2) : '0';

        return {
            creatorName,
            followers,
            avgViews,
            engagementRate,
            platform: 'TikTok',
            region: ''
        };
    });

    return data;
}

async function scrapeYouTube(page, url, log) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
        const extractNumber = (text) => {
            if (!text) return 0;
            text = text.toLowerCase().replace(/,/g, '');
            if (text.includes('k')) return parseFloat(text) * 1000;
            if (text.includes('m')) return parseFloat(text) * 1000000;
            if (text.includes('b')) return parseFloat(text) * 1000000000;
            return parseInt(text) || 0;
        };

        const nameElement = document.querySelector('yt-formatted-string.ytd-channel-name, #channel-name #text');
        const creatorName = nameElement?.textContent?.trim() || '';

        const subsElement = document.querySelector('#subscriber-count, yt-formatted-string[id="subscriber-count"]');
        const subsText = subsElement?.textContent?.trim() || '0';
        const followers = extractNumber(subsText);

        const viewElements = document.querySelectorAll('span.inline-metadata-item:first-child, #metadata-line span:first-child');
        let totalViews = 0;
        let videoCount = 0;
        
        viewElements.forEach((el, index) => {
            if (index < 12) {
                const viewText = el.textContent.trim();
                if (viewText.includes('views')) {
                    totalViews += extractNumber(viewText);
                    videoCount++;
                }
            }
        });
        
        const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;

        const engagementRate = followers > 0 ? ((avgViews / followers) * 100).toFixed(2) : '0';

        return {
            creatorName,
            followers,
            avgViews,
            engagementRate,
            platform: 'YouTube',
            region: ''
        };
    });

    return data;
}

await crawler.run(platformLinks.map(url => ({ url })));

await Actor.pushData(results);

console.log(`Successfully scraped ${results.length} creators`);
console.log('Results:', JSON.stringify(results, null, 2));

await Actor.exit();
