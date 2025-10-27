# Waitlist & Contact Form Setup Guide

## 🎯 What We Built:

1. **Launch Banner** - Sticky top banner with email capture
2. **Waitlist System** - First 20 get Pro FREE for 1 year
3. **Contact Form** - Forwards to admin@4sighteducation.com
4. **Email Automation** - Welcome emails via SendGrid

---

## ⚙️ SETUP REQUIRED (30 Minutes Total)

### STEP 1: Create Supabase Waitlist Table (5 min)

**1. Go to Supabase Dashboard:**
https://supabase.com/dashboard/project/qkapwhyxcpgzahuemucg

**2. Click "SQL Editor" (left menu)**

**3. Paste this SQL:**

```sql
-- Copy from: supabase/migrations/20251026_create_waitlist_table.sql
-- Or run the migration file directly
```

**4. Click "Run"**

**5. Verify:**
- Click "Table Editor"
- You should see "waitlist" table
- Columns: id, email, position, is_top_twenty, source, notified

---

### STEP 2: Configure SendGrid Email (10 min)

**You already have SENDGRID_API_KEY in Vercel!** ✅

But you need to verify sender email:

**1. Go to SendGrid Dashboard:**
https://app.sendgrid.com

**2. Settings → Sender Authentication**

**3. Verify Single Sender:**
- Click "Verify a Single Sender"
- Enter: `hello@fl4shcards.com`
- Fill in your details
- SendGrid sends verification email
- Click link to verify

**4. Alternative (Use Existing Email):**
- Use: `admin@4sighteducation.com` (if already verified)
- Update API functions to use this as "from" email

---

### STEP 3: Test Everything (5 min)

**1. Test Waitlist Signup:**
```
1. Go to: https://fl4shcards.com
2. See banner at top
3. Enter your email
4. Click "Get Early Access"
5. Should see success message
6. Check Supabase table - entry should appear
7. Check admin@4sighteducation.com - should get notification
```

**2. Test Contact Form:**
```
1. Go to: https://fl4shcards.com/contact
2. Fill in form
3. Click "Send Message"
4. Check admin@4sighteducation.com - should get email
```

---

## 📧 EMAIL SETUP OPTIONS

### Option A: Use admin@4sighteducation.com (Easiest)

**Update both API files:**

In `api/waitlist.js` and `api/contact.js`, change:
```javascript
from: 'hello@fl4shcards.com'
```
To:
```javascript
from: 'admin@4sighteducation.com'
```

**Pros:** No new email setup needed  
**Cons:** Less professional (not branded)

### Option B: Set up hello@fl4shcards.com (Better)

**In GoDaddy:**
1. Go to Email & Office Dashboard
2. Set up email forwarding
3. Forward: `hello@fl4shcards.com` → `admin@4sighteducation.com`
4. Verify in SendGrid
5. Professional sender address!

**Pros:** Branded, professional  
**Cons:** 10 minutes extra setup

---

## 🎁 HOW THE "FIRST 20" SYSTEM WORKS

### When Someone Signs Up:

**1. API Checks Count:**
- Queries Supabase waitlist table
- Gets current count
- Calculates position

**2. If Position ≤ 20:**
- `is_top_twenty` = true
- Email: "You're in! Pro FREE for 1 year!"
- Badge in Supabase for tracking

**3. If Position > 20:**
- `is_top_twenty` = false
- Email: "You're on the list! 1 month Pro trial"
- Still early access, just not full year

**4. Admin Gets Notified:**
- Email to admin@4sighteducation.com
- Subject: "New Waitlist Signup #X"
- Shows if they're top 20

---

## 📊 MANAGING THE WAITLIST

### View All Signups:

**In Supabase:**
```sql
-- See all waitlist signups
SELECT email, position, is_top_twenty, created_at 
FROM waitlist 
ORDER BY position ASC;

-- See just the top 20
SELECT * FROM waitlist 
WHERE is_top_twenty = true 
ORDER BY position ASC;

-- Count total signups
SELECT COUNT(*) FROM waitlist;
```

### Export for Launch Day:

```sql
-- Export all emails
SELECT email FROM waitlist ORDER BY position ASC;

-- Export top 20 with details
SELECT email, position, created_at 
FROM waitlist 
WHERE is_top_twenty = true 
ORDER BY position ASC;
```

---

## 🚀 LAUNCH DAY WORKFLOW

### When You Actually Launch (Nov 3rd):

**For Top 20:**
1. Query Supabase for `is_top_twenty = true`
2. Generate Pro promo codes (1 year free)
3. Send email with:
   - App Store / Google Play links
   - Their unique Pro code
   - Instructions to redeem

**For Everyone Else:**
1. Query all waitlist emails
2. Send launch email with:
   - App Store / Google Play links
   - 1-month Pro trial code
   - Welcome to FL4SH!

---

## 🎨 BANNER BEHAVIOR

### What Users See:

**Before Signup:**
```
🚀 LAUNCHING SOON
Get Pro FREE for 1 YEAR - First 20 early access users only!
[Email Input] [Get Early Access →]
```

**After Signup:**
```
🎉 You're on the list! Check your email for early access details.
First 20 get Pro FREE for 1 year!
```

**Banner is sticky** - stays at top even when scrolling

---

## ⚡ QUICK SETUP CHECKLIST

- [ ] Run SQL migration in Supabase (create waitlist table)
- [ ] Verify sender email in SendGrid (hello@fl4shcards.com OR use admin@4sighteducation.com)
- [ ] Test waitlist signup
- [ ] Test contact form
- [ ] Check admin email receives notifications
- [ ] Verify Supabase table populates

---

## 🆘 TROUBLESHOOTING

**"Failed to save email":**
- Check Supabase table exists
- Check SUPABASE_SERVICE_ROLE_KEY in Vercel
- Check RLS policies allow insert

**"Email not sending":**
- Check SENDGRID_API_KEY in Vercel
- Check sender email verified in SendGrid
- Check SendGrid dashboard for errors

**"Admin not receiving notifications":**
- Check admin@4sighteducation.com exists
- Check spam folder
- Check SendGrid activity log

---

**Ready to set this up? I'll help you run the SQL migration!** 🚀

