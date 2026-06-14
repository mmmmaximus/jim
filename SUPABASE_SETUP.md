# Jim Supabase Setup Guide

This guide will walk you through connecting Jim to Supabase with Google OAuth login.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click **New Project**
3. Enter a project name (e.g., "Jim-app")
4. Create a secure password
5. Select your region
6. Click **Create new project** and wait for it to initialize

## Step 2: Get Your Credentials

Once your project is ready:

1. Go to **Settings → API**
2. Copy your **Project URL** (looks like `https://your-project.supabase.co`)
3. Copy your **Anon Key** (under "Anon" section)
4. Update `.env.local` in your project root with:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 3: Run Database Migration

1. In Supabase, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open [supabase/migrations/001_init_schema.sql](supabase/migrations/001_init_schema.sql) from this project
4. Copy the entire contents and paste into the Supabase SQL editor
5. Click **Run**
6. You should see "Success" message

## Step 4: Set Up Google OAuth (Optional but Recommended)

### Get Google Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Go to **APIs & Services → OAuth 2.0 Consent Screen**
4. Select "External" and click **Create**
5. Fill in app name and user support email
6. Go to **APIs & Services → Credentials**
7. Click **Create Credentials → OAuth Client ID**
8. Choose "Android" and "iOS" and "Web" as application types
9. Create the credentials (you'll get IDs for each)
10. Note your **Web Client ID** (format: `xxx.apps.googleusercontent.com`)

### Add to Supabase

1. In Supabase, go to **Authentication → Providers**
2. Find **Google** and click it
3. Turn ON the provider
4. Paste your Google Client ID and Client Secret
5. Click **Save**

### Update .env.local

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Step 5: Install Dependencies

```bash
cd /Users/maxwoon/Documents/GitHub/jim
npm install
```

This will add:
- `expo-secure-store` - for secure token storage
- `@react-native-google-signin/google-signin` - for Google login

## Step 6: Run the App

```bash
npm start
```

Then choose your platform:
- **iOS Simulator**: Press `i`
- **Android Emulator**: Press `a`
- **Web**: Press `w`

## Step 7: Test the Flow

1. App will show login screen
2. Create account with email/password OR sign in with Google
3. On first login with Supabase, your default exercises and mesocycle will sync
4. Log a workout and bodyweight - data will save to Supabase
5. Log out and log back in on another device - your data persists!

## Troubleshooting

**"Supabase not configured" message?**
- Check `.env.local` exists with correct URL and Anon Key
- Restart the app after updating env variables

**Google login not working?**
- Ensure Google provider is enabled in Supabase Authentication
- Check your Google Client ID is correct in `.env.local`
- On web, you may need to add localhost redirect URIs in Google Cloud Console

**RLS (Row Level Security) errors?**
- The SQL migration should have set up all RLS policies
- If you see permission errors, re-run the migration or check Supabase logs

**Data not syncing?**
- Check network connection
- Look at Supabase logs (SQL Editor → Logs)
- Verify RLS policies are enabled

## Data Sync Behavior

- **First login**: App syncs all your exercises, mesocycles, and sessions from Supabase
- **Offline mode**: If no `.env.local` is configured, app uses local-only storage
- **Real-time updates**: Changes sync to Supabase when online
- **Cross-device**: Log in on another device to see your data

## Next Steps

- Customize your first mesocycle in the app
- Start logging workouts
- View analytics dashboard
- Share your progress!

Questions? Check [Supabase Docs](https://supabase.com/docs) or contact support.
