# Enhanced Discord Bot Features

## Overview

The enhanced Discord bot now includes auto-generated tags, subscription alerts, and slash commands for job filtering.

## New Features

### 1. Auto-Generated Tags

Each job post now includes automatically generated tags based on:

- **Experience Level**: Senior, MidLevel, EntryLevel
- **Location**: Remote, SF, NYC, Seattle, Austin, etc.
- **Company Tier**: FAANG, Unicorn, Fintech, Gaming
- **Technologies**: React, Python, AWS, ML, AI, etc.
- **Role Type**: Frontend, Backend, FullStack, DevOps, etc.

### 2. Subscription System

Users can subscribe to job alerts for specific tags:

#### Slash Commands:
- `/subscribe tags:Senior,Remote,React` - Subscribe to multiple tags
- `/unsubscribe tags:Remote` - Unsubscribe from specific tags  
- `/unsubscribe tags:all` - Unsubscribe from all alerts
- `/subscriptions` - View current subscriptions

#### Button Interactions:
- Click "🔔 Get Similar Jobs" on any job post to subscribe to that job's primary tag

### 3. Job Search & Filtering

Advanced job search with filtering capabilities:

#### Slash Command:
- `/jobs tags:Senior,Remote` - Filter by tags
- `/jobs company:Google` - Filter by company
- `/jobs location:SF` - Filter by location
- `/jobs tags:React company:Stripe` - Combine multiple filters

## Required Environment Variables

Add these to your GitHub secrets:

```
DISCORD_TOKEN        # Bot token from Discord Developer Portal
DISCORD_CHANNEL_ID   # Channel where jobs are posted
DISCORD_CLIENT_ID    # Application ID from Discord Developer Portal  
DISCORD_GUILD_ID     # Server ID where bot operates
```

## Bot Permissions Required

The bot needs these Discord permissions:
- Send Messages
- Use Slash Commands
- Create Public Threads
- Mention Everyone (for subscription alerts)
- Embed Links

## File Structure

```
.github/
├── scripts/
│   ├── enhanced-discord-bot.js     # Main bot with all features
│   ├── advanced-job-fetcher.js     # Job fetching (updated)
│   └── test-bot-features.js        # Testing script
└── data/
    ├── new_jobs.json              # Fresh jobs for Discord posting
    ├── seen_jobs.json             # Deduplication store
    └── subscriptions.json         # User subscription data
```

## How It Works

1. **Job Fetching**: `advanced-job-fetcher.js` fetches jobs and writes `new_jobs.json`
2. **Bot Processing**: `enhanced-discord-bot.js` reads new jobs, generates tags, posts with alerts
3. **User Interaction**: Users can subscribe, search, and filter jobs via slash commands
4. **Notifications**: Subscribed users get mentioned when matching jobs are posted

## Example Job Post

```
🔔 @user1 @user2 - New job matching your subscriptions!

🍎 Senior Software Engineer - iOS

🏢 Company: Apple
📍 Location: Cupertino, CA  
⏰ Posted: 1/15/2024

🏷️ Tags: #Senior #iOS #Mobile #FAANG #Swift

📋 Description: Join Apple's iOS team to build the next generation of mobile experiences...

[💼 Apply Now] [🔔 Get Similar Jobs]

💬 Senior Software Engineer - iOS at Apple (Thread)
```

## Testing

Run the test script to validate functionality:

```bash
node .github/scripts/test-bot-features.js
```

## Troubleshooting

1. **Bot not posting**: Check DISCORD_TOKEN and CHANNEL_ID
2. **Slash commands not working**: Verify CLIENT_ID and GUILD_ID  
3. **No subscriptions**: Ensure bot has permission to mention users
4. **Tags not generating**: Check companies.json is accessible

## Future Enhancements

- Add more granular filtering options
- Implement salary range filtering  
- Add company-specific subscription channels
- Create job application tracking
- Add analytics dashboard