# FL4SH Domain Setup Guide
**Domains:** fl4shcards.com + fl4sh.cards  
**Vercel Project:** flash-gules (existing)

---

## 🎯 Overview

We'll connect BOTH domains to your existing Vercel project:
- **fl4shcards.com** → Primary marketing site
- **fl4sh.cards** → Redirect to fl4shcards.com (short URL)

---

## Step 1: Commit & Deploy Marketing Site

First, let's get the marketing site live on Vercel:

```bash
# From FLASH root directory
cd "C:\Users\tonyd\OneDrive - 4Sight Education Ltd\Apps\FLASH"

# Commit all changes
git add .
git commit -m "feat: Add Next.js marketing site with neon theme"
git push origin main
```

Vercel will auto-deploy! Check: https://flash-gules.vercel.app

---

## Step 2: Get DNS Records from Domain Registrar

### Where Did You Buy Your Domains?
- GoDaddy?
- Namecheap?
- Google Domains?
- Cloudflare?

**Let me know and I'll give you exact instructions!**

Generally, you need to:
1. Log into your domain registrar
2. Find "DNS Settings" or "Manage DNS"
3. We'll add records there

---

## Step 3: Add Domains in Vercel

### In Vercel Dashboard:

1. Go to: https://vercel.com/dashboard
2. Find project: **flash-gules**
3. Click on it
4. Go to **Settings** → **Domains**

### Add Primary Domain (fl4shcards.com):

1. Click **"Add"**
2. Enter: `fl4shcards.com`
3. Click **"Add"**

Vercel will show you DNS records needed:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Add Redirect Domain (fl4sh.cards):

1. Click **"Add"** again
2. Enter: `fl4sh.cards`
3. Click **"Add"**

Vercel will show same DNS records for this domain too.

### Add Subdomain (for web app later):

1. Click **"Add"** again
2. Enter: `app.fl4shcards.com`
3. Click **"Add"**

```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

---

## Step 4: Configure DNS at Your Domain Registrar

### For fl4shcards.com:

**Add These Records:**

| Type  | Name/Host | Value/Points To        | TTL  |
|-------|-----------|------------------------|------|
| A     | @         | 76.76.21.21           | 3600 |
| CNAME | www       | cname.vercel-dns.com  | 3600 |
| CNAME | app       | cname.vercel-dns.com  | 3600 |

### For fl4sh.cards:

**Add These Records:**

| Type  | Name/Host | Value/Points To        | TTL  |
|-------|-----------|------------------------|------|
| A     | @         | 76.76.21.21           | 3600 |
| CNAME | www       | cname.vercel-dns.com  | 3600 |

---

## Step 5: Set fl4sh.cards to Redirect

**In Vercel Dashboard:**

1. Go to **Settings** → **Domains**
2. Find `fl4sh.cards` in the list
3. Click the **three dots** (•••) next to it
4. Click **"Redirect to Domain"**
5. Enter: `fl4shcards.com`
6. Choose: **Permanent (308)**
7. Click **"Redirect"**

Now `fl4sh.cards` → automatically redirects to `fl4shcards.com`!

---

## Step 6: Wait for DNS Propagation

**Timeline:** 5 minutes to 48 hours (usually 1-2 hours)

**Check Status:**
1. In Vercel dashboard, domains will show:
   - 🟡 Pending (yellow) - DNS not propagated yet
   - 🟢 Valid (green) - Working! ✅

**Test Propagation:**
- Use: https://dnschecker.org
- Enter your domain
- Check if DNS has spread globally

---

## Step 7: Verify SSL Certificates

**Vercel automatically provisions SSL certificates!**

Once DNS is valid, Vercel will:
1. Auto-generate SSL certificate
2. Enable HTTPS
3. Force HTTPS redirect

Your site will be at:
- ✅ https://fl4shcards.com (secure!)
- ✅ https://fl4sh.cards → redirects to fl4shcards.com
- ✅ https://app.fl4shcards.com (for later)

---

## 🔧 COMMON DNS CONFIGURATIONS

### GoDaddy:
1. Log in to GoDaddy
2. My Products → Domains
3. Click domain → Manage DNS
4. Add records from table above

### Namecheap:
1. Log in to Namecheap
2. Domain List → Manage
3. Advanced DNS tab
4. Add records from table above

### Google Domains:
1. Log in to domains.google.com
2. Click domain → DNS
3. Custom records
4. Add records from table above

### Cloudflare:
1. Log in to Cloudflare
2. Select domain
3. DNS tab
4. Add records (set proxy to DNS only)

---

## ✅ VERIFICATION CHECKLIST

After DNS propagates, verify:

- [ ] https://fl4shcards.com loads marketing site
- [ ] https://www.fl4shcards.com works
- [ ] https://fl4sh.cards redirects to fl4shcards.com
- [ ] https://www.fl4sh.cards redirects
- [ ] SSL certificate shows (padlock icon)
- [ ] Navigation works
- [ ] All images load
- [ ] CTAs link to app.fl4shcards.com

---

## 🚨 TROUBLESHOOTING

**"Domain not verified":**
- Wait longer (DNS can take 24-48 hours)
- Double-check DNS records match exactly
- Try "Refresh" button in Vercel

**"SSL certificate error":**
- Wait for Vercel to provision (can take 1 hour)
- Clear browser cache
- Try incognito mode

**"Site not loading":**
- Check Vercel deployment status
- Check build logs
- Verify DNS with dnschecker.org

---

## 📞 NEED HELP?

**Tell me:**
1. Where you bought the domains (GoDaddy, Namecheap, etc.)
2. Send screenshot of your current DNS settings
3. Any error messages you see

I'll walk you through it step-by-step! 🚀

---

*Created: October 25, 2025*  
*Next: Domain setup, then production launch!*

