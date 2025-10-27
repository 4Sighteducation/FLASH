# Google Search Console Setup - FL4SH

## Step-by-Step Instructions

### 1. Go to Google Search Console
https://search.google.com/search-console

### 2. Add Property
- Click "Add Property"
- Select "Domain" (not URL prefix)
- Enter: `fl4shcards.com`

### 3. Verify Ownership (DNS Method)

Google will give you a TXT record like:
```
google-site-verification=abc123def456...
```

### 4. Add to GoDaddy:

1. Log into GoDaddy
2. Find fl4shcards.com → Manage DNS
3. Add new record:
   - **Type:** TXT
   - **Name:** @
   - **Value:** [paste the google-site-verification code]
   - **TTL:** 1 Hour
4. Save

### 5. Back in Google Search Console:
- Click "Verify"
- Should see "Ownership verified" ✅

### 6. Submit Sitemap:
- In Search Console, go to "Sitemaps" (left menu)
- Enter: `sitemap.xml`
- Click "Submit"

### 7. Repeat for fl4sh.cards:
- Add as separate property
- Same verification process
- This helps track both domains

---

## What You'll See:

After 24-48 hours:
- **Performance:** Search queries, clicks, impressions
- **Coverage:** Which pages are indexed
- **Enhancements:** Mobile usability, Core Web Vitals
- **Links:** Who's linking to you

---

## Next Steps:

Once verified:
1. Check "Coverage" - should show 3 pages (home, privacy, terms)
2. Check "Performance" - will be empty at first
3. After 1 week: See first search impressions
4. After 1 month: See rankings improving

---

*This is your #1 SEO tool - check it weekly!*

