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
    throw new Error('No platform links provided.');
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
                'Creator Name': creatorData.creatorName || 'Unknown',
                'Category': category || '',
                'Platform': creatorData.platform || '',
                'Platform Link': url,
                'Followers': creatorData.followers || 0,
                'Region': creatorData.region || '',
                'Cost': '',
                'Avg Views': creatorData.avgViews || 0,
                'ER': creatorData.engagementRate || '0.00',
                'Client Comment': '',
                'TCE Comment': ''
            };

            results.push(result);
            log.info(`Scraped: ${creatorData.creatorName} | Followers: ${creatorData.followers} | Views: ${creatorData.avgViews} | ER: ${creatorData.engagementRate}%`);

        } catch (error) {
            log.error(`Failed: ${url} - ${error.message}`);
            
            results.push({
                'Internal Comment': internalComment || '',
                'Date': new Date().toLocaleDateString('en-GB'),
                'Executive': executive || '',
                'Team': team || '',
                'Creator Name': 'ERROR',
                'Category': category || '',
                'Platform': url.includes('instagram') ? 'Instagram' : url.includes('tiktok') ? 'TikTok' : 'YouTube',
                'Platform Link': url,
                'Followers': 0,
                'Region': '',
                'Cost': '',
                'Avg Views': 0,
                'ER': '0.00',
                'Client Comment': '',
                'TCE Comment': error.message
            });
        }
    },
    maxRequestsPerCrawl: platformLinks.length,
    navigationTimeoutSecs: 90,
    launchContext: {
        launchOptions: {
            headless: true,
        },
    },
});

async function scrapeInstagram(page, url, log) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForTimeout(7000);

    const data = await page.evaluate(() => {
        const extractNumber = (text) => {
            if (!text) return 0;
            text = text.toString().toLowerCase().replace(/,/g, '').replace(/\s/g, '');
            
            if (text.includes('k')) return Math.round(parseFloat(text.replace('k', '')) * 1000);
            if (text.includes('m')) return Math.round(parseFloat(text.replace('m', '')) * 1000000);
            if (text.includes('b')) return Math.round(parseFloat(text.replace('b', '')) * 1000000000);
            
            const num = parseInt(text.replace(/[^0-9]/g, ''));
            return isNaN(num) ? 0 : num;
        };

        let creatorName = '';
        const nameSelectors = ['header h2', 'header h1', 'header span', '[class*="username"]', 'h1', 'h2'];
        for (const selector of nameSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                creatorName = element.textContent.trim();
                break;
            }
        }

        let followers = 0;
        const followerSelectors = [
            'a[href*="followers"] span',
            'button span',
            'header section ul li button span',
            'header section ul li a span'
        ];
        for (const selector of followerSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const text = el.textContent.trim();
                if (text.includes('follower') || /^\d+[KkMmBb]?$/.test(text)) {
                    const match = text.match(/[\d,.]+[KkMmBb]?/);
                    if (match) {
                        followers = extractNumber(match[0]);
                        if (followers > 0) break;
                    }
                }
            }
            if (followers > 0) break;
        }

        let totalViews = 0;
        let postCount = 0;
        const viewSelectors = ['span[class*="views"]', 'span[class*="plays"]', 'div[class*="views"]'];
        for (const selector of viewSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const el of elements) {
                const text = el.textContent.trim();
                const match = text.match(/[\d,.]+[KkMmBb]?/);
                if (match && postCount < 12) {
                    totalViews += extractNumber(match[0]);
                    postCount++;
                }
            }
            if (postCount >= 12) break;
        }

        if (postCount === 0) {
            const likeElements = document.querySelectorAll('button span, section span');
            let likeCount = 0;
            for (const el of likeElements) {
                const text = el.textContent.trim();
                const match = text.match(/^[\d,.]+[KkMmBb]?\s*(likes?|views?)?$/i);
                if (match && likeCount < 12) {
                    const num = extractNumber(text);
                    if (num > 0) {
                        totalViews += num;
                        likeCount++;
                    }
                }
            }
            postCount = likeCount;
        }

        const avgViews = postCount > 0 ? Math.round(totalViews / postCount) : 0;
        const engagementRate = followers > 0 && avgViews > 0 ? ((avgViews / followers) * 100).toFixed(2) : '0.00';

        return {
            creatorName: creatorName || 'Unknown',
            followers,
            avgViews,
            engagementRate,
            platform: 'Instagram',
            region: ''
        };
    });

    log.info(`Instagram: ${JSON.stringify(data)}`);
    return data;
}

async function scrapeTikTok(page, url, log) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForTimeout(7000);

    const data = await page.evaluate(() => {
        const extractNumber = (text) => {
            if (!text) return 0;
            text = text.toString().toLowerCase().replace(/,/g, '').replace(/\s/g, '');
            
            if (text.includes('k')) return Math.round(parseFloat(text.replace('k', '')) * 1000);
            if (text.includes('m')) return Math.round(parseFloat(text.replace('m', '')) * 1000000);
            if (text.includes('b')) return Math.round(parseFloat(text.replace('b', '')) * 1000000000);
            
            const num = parseInt(text.replace(/[^0-9]/g, ''));
            return isNaN(num) ? 0 : num;
        };

        let creatorName = '';
        const nameSelectors = ['[data-e2e="user-title"]', 'h1', 'h2', 'h3'];
        for (const selector of nameSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim()) {
                creatorName = el.textContent.trim();
                break;
            }
        }

        let followers = 0;
        const followerSelectors = ['[data-e2e="followers-count"]', '[title*="Followers"]', 'strong'];
        for (const selector of followerSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                followers = extractNumber(el.textContent);
                if (followers > 0) break;
            }
        }

        const videoElements = document.querySelectorAll('[data-e2e="video-views"], strong, span');
        let totalViews = 0;
        let videoCount = 0;
        for (const el of videoElements) {
            if (videoCount >= 12) break;
            const text = el.textContent.trim();
            if (text.match(/\d+[KMB]?/)) {
                const views = extractNumber(text);
                if (views > 0) {
                    totalViews += views;
                    videoCount++;
                }
            }
        }
        
        const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
        const engagementRate = followers > 0 && avgViews > 0 ? ((avgViews / followers) * 100).toFixed(2) : '0.00';

        return {
            creatorName: creatorName || 'Unknown',
            followers,
            avgViews,
            engagementRate,
            platform: 'TikTok',
            region: ''
        };
    });

    log.info(`TikTok: ${JSON.stringify(data)}`);
    return data;
}

async function scrapeYouTube(page, url, log) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.waitForTimeout(7000);

    const data = await page.evaluate(() => {
        const extractNumber = (text) => {
            if (!text) return 0;
            text = text.toString().toLowerCase().replace(/,/g, '').replace(/\s/g, '');
            
            if (text.includes('k')) return Math.round(parseFloat(text.replace('k', '')) * 1000);
            if (text.includes('m')) return Math.round(parseFloat(text.replace('m', '')) * 1000000);
            if (text.includes('b')) return Math.round(parseFloat(text.replace('b', '')) * 1000000000);
            
            const num = parseInt(text.replace(/[^0-9]/g, ''));
            return isNaN(num) ? 0 : num;
        };

        let creatorName = '';
        const nameSelectors = [
            'yt-formatted-string.ytd-channel-name',
            '#channel-name #text',
            'ytd-channel-name yt-formatted-string',
            '#text'
        ];
        for (const selector of nameSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent.trim()) {
                creatorName = el.textContent.trim();
                break;
            }
        }

        let followers = 0;
        const subSelectors = ['#subscriber-count', 'yt-formatted-string#subscriber-count', '#subscribers'];
        for (const selector of subSelectors) {
            const el = document.querySelector(selector);
            if (el) {
                followers = extractNumber(el.textContent);
                if (followers > 0) break;
            }
        }

        const viewElements = document.querySelectorAll('span.inline-metadata-item, #metadata-line span, ytd-video-meta-block span');
        let totalViews = 0;
        let videoCount = 0;
        for (const el of viewElements) {
            if (videoCount >= 12) break;
            const text = el.textContent.trim();
            if (text.includes('views') || text.includes('view')) {
                const views = extractNumber(text);
                if (views > 0) {
                    totalViews += views;
                    videoCount++;
                }
            }
        }
        
        const avgViews = videoCount > 0 ? Math.round(totalViews / videoCount) : 0;
        const engagementRate = followers > 0 && avgViews > 0 ? ((avgViews / followers) * 100).toFixed(2) : '0.00';

        return {
            creatorName: creatorName || 'Unknown',
            followers,
            avgViews,
            engagementRate,
            platform: 'YouTube',
            region: ''
        };
    });

    log.info(`YouTube: ${JSON.stringify(data)}`);
    return data;
}

await crawler.run(platformLinks.map(url => ({ url })));
await Actor.pushData(results);

console.log(`Scraped ${results.length} creators`);
await Actor.exit();
