# Vercel Deployment Guide for FLASH App

## Overview
This guide will help you deploy your FLASH app backend to Vercel, which will handle the OpenAI API calls server-side, keeping your API key secure.

## Prerequisites
- A Vercel account (free at vercel.com)
- Your OpenAI API key
- Git repository for your project

## Step 1: Prepare Your Project

### 1.1 Update the API URL in your app
In `src/services/aiService.ts`, update the production URL:
```typescript
this.apiUrl = isDev
  ? 'http://localhost:3000/api/generate-cards'  // For local testing
  : 'https://YOUR-APP-NAME.vercel.app/api/generate-cards';  // Replace with your Vercel URL
```

**Note for local testing**: When testing on a physical device, replace `localhost` with your computer's IP address (e.g., `http://192.168.1.100:3000/api/generate-cards`).

## Step 2: Deploy to Vercel

### 2.1 Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (from your project root)
vercel
```

### 2.2 Using GitHub Integration
1. Push your code to GitHub
2. Go to vercel.com and click "New Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration

## Step 3: Set Environment Variables

### 3.1 In Vercel Dashboard
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - Key: `OPENAI_API_KEY`
   - Value: Your OpenAI API key
   - Environment: Production, Preview, Development

### 3.2 For Local Development
Create a `.env.local` file in your project root:
```
OPENAI_API_KEY=your_openai_api_key_here
```

## Step 4: Test Your Deployment

### 4.1 Test the API Endpoint
Once deployed, test your API:
```bash
curl -X POST https://YOUR-APP-NAME.vercel.app/api/generate-cards \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Biology",
    "topic": "Photosynthesis",
    "examType": "GCSE",
    "examBoard": "AQA",
    "questionType": "multiple_choice",
    "numCards": 1
  }'
```

### 4.2 Update Your App
Don't forget to update the production URL in `src/services/aiService.ts` with your actual Vercel URL!

## Step 5: Local Development Setup

### 5.1 Running the API locally
```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Run the development server
vercel dev
```

This will start a local server at `http://localhost:3000` that mimics Vercel's environment.

### 5.2 Testing with Expo
1. Make sure your API is running locally (`vercel dev`)
2. Update the development URL in `aiService.ts` to use your computer's IP
3. Run your Expo app: `npm start`

## Troubleshooting

### CORS Issues
The API already includes CORS headers, but if you have issues:
- Make sure the API URL in your app matches exactly
- Check that you're using POST method
- Verify the Content-Type header is set to 'application/json'

### API Key Not Working
- Verify the key is set in Vercel's environment variables
- Check that the key has sufficient credits/quota
- Test the key directly with OpenAI's API

### Timeout Errors
The function is configured with a 30-second timeout. If you get timeouts:
- Consider reducing the number of cards generated per request
- Use GPT-3.5-turbo instead of GPT-4 for faster responses

## Security Notes

1. **Never commit your API key** - Always use environment variables
2. **API Key is server-only** - It's never exposed to the client app
3. **Consider rate limiting** - Add rate limiting in production to prevent abuse

## Next Steps

After deployment:
1. Remove the API Settings screen from your app (no longer needed)
2. Consider adding caching to reduce API calls
3. Add error retry logic for better reliability
4. Monitor usage in your OpenAI dashboard

## Useful Commands

```bash
# View logs
vercel logs

# List deployments
vercel ls

# Set environment variables via CLI
vercel env add OPENAI_API_KEY

# Promote to production
vercel --prod
```

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Functions: https://vercel.com/docs/functions
- OpenAI API Docs: https://platform.openai.com/docs 