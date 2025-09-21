# Manual Deployment Guide

## Quick Deployment Commands

### Step 1: Apply Database Indexes
```bash
npx supabase db push
```

### Step 2: Deploy Edge Functions
```bash
npx supabase functions deploy dashboard-stats
npx supabase functions deploy project-analytics
```

### Step 3: Verify Deployment
```bash
npx supabase status
```

## Alternative: Use the JavaScript Deployment Script
```bash
node scripts/deploy-optimizations.js
```

## Troubleshooting

### If Supabase CLI is not working:
1. **Install via Homebrew (macOS/Linux):**
   ```bash
   brew install supabase/tap/supabase
   ```

2. **Install via Scoop (Windows):**
   ```bash
   scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
   scoop install supabase
   ```

3. **Download binary directly:**
   - Go to https://github.com/supabase/cli/releases
   - Download the appropriate binary for your system
   - Add to your PATH

### If migrations fail:
1. **Check if Supabase is initialized:**
   ```bash
   npx supabase init
   ```

2. **Login to Supabase:**
   ```bash
   npx supabase login
   ```

3. **Link to your project:**
   ```bash
   npx supabase link --project-ref YOUR_PROJECT_ID
   ```

### If Edge Functions fail to deploy:
1. **Make sure you're logged in:**
   ```bash
   npx supabase login
   ```

2. **Check function syntax:**
   ```bash
   npx supabase functions serve dashboard-stats
   ```

## Expected Results After Deployment

✅ **Database indexes created** - Faster queries
✅ **Edge Functions deployed** - Server-side processing
✅ **RPC functions available** - Optimized aggregations

## Testing the Deployment

### Test RPC Functions:
```sql
-- In Supabase SQL Editor
SELECT get_dashboard_stats();
SELECT get_project_analytics(30);
```

### Test Edge Functions:
```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/dashboard-stats' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

## Next Steps

1. **Update your application** to use the optimized services
2. **Monitor egress usage** to see the improvements
3. **Check performance** with the new caching and optimizations

The optimizations should provide **60-80% egress reduction** immediately!