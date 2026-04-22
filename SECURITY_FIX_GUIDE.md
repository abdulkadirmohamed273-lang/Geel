# Security Fix Guide - Step by Step

## 🎯 Quick Summary

This guide will help you fix the security vulnerabilities in your clinic system. We'll do this in **3 phases**:

1. **Phase 1: Immediate Fixes** (30 minutes) - Critical security issues
2. **Phase 2: Better Security** (1-2 hours) - Improved protection
3. **Phase 3: Advanced Security** (Optional) - Long-term improvements

---

## ⚡ PHASE 1: Immediate Fixes (Do This First!)

### Step 1: Remove Service Role Key from Frontend

**CRITICAL:** The service role key should NEVER be in frontend code!

**File: `src/config/supabase.js`**

Remove these lines (lines 17-26):
```javascript
// DELETE THIS ENTIRE SECTION:
const supabaseServiceKey = '...';
export const supabaseAdmin = createClient(...);
```

**Why:** Service role key bypasses ALL security. If exposed, attacker has full control.

---

### Step 2: Move API Keys to Environment Variables

**Create `.env` file** in your project root:

```bash
# .env file (create this in project root)
REACT_APP_SUPABASE_URL=https://wbcnyzzvynqgoaexehor.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndiY255enp2eW5xZ29hZXhlaG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3MTExMjUsImV4cCI6MjA4MjI4NzEyNX0.Z9dGKDUHVXj2AzwN5veh3d7qMYsQnpi_S6v8cBdxp9U
```

**Create `.env.example` file** (for reference, without real keys):
```bash
# .env.example
REACT_APP_SUPABASE_URL=your_supabase_url_here
REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here
```

**Update `src/config/supabase.js`:**
```javascript
import { createClient } from '@supabase/supabase-js';

// Get from environment variables (required, no fallback)
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
    }
});

export default supabase;
```

**Add `.env` to `.gitignore`** (if not already there):
```
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
```

---

### Step 3: Restrict API Key in Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **API**
4. Under **API Settings**:
   - **Add domain restrictions** (your website domain)
   - **Set rate limits** (e.g., 100 requests/minute)
   - **Enable CORS** for your domain only

---

### Step 4: Rotate Your Service Role Key

**IMPORTANT:** Since the service role key was exposed, you MUST rotate it:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Find **Service Role Key** section
3. Click **Reset** or **Rotate**
4. Copy the new key
5. **Store it securely** (password manager, never in code)
6. Use it only for server-side operations (if needed)

---

## 🛡️ PHASE 2: Better Security (Improved Protection)

### Step 5: Create Better RLS Policies

Since you use custom authentication, we'll create policies that check for authenticated requests through a helper function.

**Create SQL file: `IMPROVED_RLS_POLICIES.sql`** (see separate file)

These policies will:
- Require authentication for most operations
- Allow public read for notices (if needed)
- Restrict sensitive operations to authenticated users

---

### Step 6: Add Request Validation

Create a helper to validate requests before database operations.

**File: `src/utils/authHelper.js`** (new file):
```javascript
// Helper to check if user is authenticated
export const isAuthenticated = () => {
  const userId = localStorage.getItem('beergeel_userId');
  const userRole = localStorage.getItem('beergeel_userRole');
  return !!(userId && userRole);
};

// Helper to get current user info
export const getCurrentUser = () => {
  const userId = localStorage.getItem('beergeel_userId');
  const userRole = localStorage.getItem('beergeel_userRole');
  const userType = localStorage.getItem('beergeel_userType');
  
  if (!userId || !userRole) return null;
  
  return {
    id: parseInt(userId),
    role: userRole,
    type: userType
  };
};

// Validate before database operations
export const requireAuth = () => {
  if (!isAuthenticated()) {
    throw new Error('Authentication required');
  }
};
```

**Update `src/utils/supabaseDB.js`** to use validation:
```javascript
import { requireAuth } from './authHelper';

class SupabaseDB {
    async getAll(table) {
        requireAuth(); // Add this check
        // ... rest of code
    }
    
    async add(table, data) {
        requireAuth(); // Add this check
        // ... rest of code
    }
    
    // Add to other methods too
}
```

**Note:** This is frontend validation, so it can still be bypassed. But it adds a layer of protection and makes attacks harder.

---

## 🚀 PHASE 3: Advanced Security (Optional, Long-term)

### Step 7: Implement Supabase Edge Functions (Recommended)

Create server-side API endpoints using Supabase Edge Functions:

1. **Create Edge Function** for sensitive operations
2. **Validate requests** server-side
3. **Use service role key** only in Edge Functions (server-side)

This requires more setup but provides real security.

---

### Step 8: Migrate to Supabase Auth (Best Long-term Solution)

1. Use Supabase Auth instead of custom authentication
2. Create proper RLS policies using `auth.uid()`
3. Implement role-based access control

This is the most secure option but requires significant refactoring.

---

## ✅ Verification Checklist

After completing Phase 1, verify:

- [ ] Service role key removed from frontend
- [ ] API keys moved to `.env` file
- [ ] `.env` added to `.gitignore`
- [ ] `.env.example` created (without real keys)
- [ ] Supabase config updated to use environment variables
- [ ] API key restricted in Supabase Dashboard
- [ ] Service role key rotated (if it was exposed)
- [ ] App still works after changes

---

## 🔧 Troubleshooting

### "Missing Supabase environment variables" error
- Check `.env` file exists in project root
- Verify variable names start with `REACT_APP_`
- Restart development server after creating `.env`

### App doesn't work after changes
- Check browser console for errors
- Verify `.env` file has correct values
- Make sure you restarted the dev server

### Still seeing API keys in browser
- This is normal - environment variables are still visible in browser
- But they're not in your source code anymore
- Use API restrictions in Supabase Dashboard for real protection

---

## 📝 Next Steps

1. **Complete Phase 1** (most important)
2. **Test your application** thoroughly
3. **Deploy with environment variables** set in your hosting platform
4. **Consider Phase 2** for better protection
5. **Plan Phase 3** for long-term security

---

## 🆘 Need Help?

If you encounter issues:
1. Check browser console for errors
2. Verify `.env` file format
3. Ensure environment variables are set in deployment platform
4. Review Supabase Dashboard API settings
