# Influencer Data Scraper

Automated scraping of creator data from Instagram, TikTok, and YouTube.

## Quick Start

### Input
```json
{
  "platformLinks": ["https://www.instagram.com/shraddha.dsgn/"],
  "executive": "Joyce",
  "team": "Warriors",
  "category": "Tech",
  "internalComment": "Test run"
}
```

### Output
```json
{
  "Internal Comment": "Test run",
  "Date": "19-11-2025",
  "Executive": "Joyce",
  "Team": "Warriors",
  "Creator Name": "Shraddha DSGN",
  "Category": "Tech",
  "Platform": "Instagram",
  "Platform Link": "https://www.instagram.com/shraddha.dsgn/",
  "Followers": 250000,
  "Region": "",
  "Cost": "",
  "Avg Views": 120000,
  "ER": "4.8",
  "Client Comment": "",
  "TCE Comment": ""
}
```

## Deployment

### Via GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/influencer-scraper.git
git push -u origin main
```

Then connect to Apify via "From GitHub repository"

### Manual Upload
1. Go to Apify Console
2. Create new actor
3. Upload all files maintaining folder structure
4. Build

## Files

- `src/main.js` - Main scraping code
- `package.json` - Dependencies
- `Dockerfile` - Container setup
- `.actor/actor.json` - Actor config
- `.actor/input_schema.json` - Input form

## Platforms

- Instagram: `https://www.instagram.com/username/`
- TikTok: `https://www.tiktok.com/@username`
- YouTube: `https://www.youtube.com/@channel`

## Cost

- Free tier: $5/month (~200-300 profiles)
- Per profile: $0.01-0.03
- 50 profiles/week: ~$3-4/month
