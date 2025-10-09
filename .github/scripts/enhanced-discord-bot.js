#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  SlashCommandBuilder,
  Collection,
  REST,
  Routes
} = require('discord.js');

// Environment variables
const TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

// Data paths
const dataDir = path.join(process.cwd(), '.github', 'data');
const subscriptionsPath = path.join(dataDir, 'subscriptions.json');
const postedJobsPath = path.join(dataDir, 'posted_jobs.json');

// Load company data for tier detection
const companies = JSON.parse(fs.readFileSync('./.github/scripts/job-fetcher/companies.json', 'utf8'));

// Import job ID generation for consistency
const { generateJobId } = require('./job-fetcher/utils');

// Initialize client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
});

// Subscription management
class SubscriptionManager {
  constructor() {
    this.subscriptions = this.loadSubscriptions();
  }

  loadSubscriptions() {
    try {
      if (fs.existsSync(subscriptionsPath)) {
        return JSON.parse(fs.readFileSync(subscriptionsPath, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    }
    return {};
  }

  saveSubscriptions() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(subscriptionsPath, JSON.stringify(this.subscriptions, null, 2));
    } catch (error) {
      console.error('Error saving subscriptions:', error);
    }
  }

  subscribe(userId, tag) {
    if (!this.subscriptions[userId]) {
      this.subscriptions[userId] = [];
    }
    if (!this.subscriptions[userId].includes(tag)) {
      this.subscriptions[userId].push(tag);
      this.saveSubscriptions();
      return true;
    }
    return false;
  }

  unsubscribe(userId, tag) {
    if (this.subscriptions[userId]) {
      const index = this.subscriptions[userId].indexOf(tag);
      if (index > -1) {
        this.subscriptions[userId].splice(index, 1);
        if (this.subscriptions[userId].length === 0) {
          delete this.subscriptions[userId];
        }
        this.saveSubscriptions();
        return true;
      }
    }
    return false;
  }

  getUsersForTags(tags) {
    const users = new Set();
    for (const [userId, userTags] of Object.entries(this.subscriptions)) {
      if (userTags.some(tag => tags.includes(tag))) {
        users.add(userId);
      }
    }
    return Array.from(users);
  }

  getUserSubscriptions(userId) {
    return this.subscriptions[userId] || [];
  }
}

const subscriptionManager = new SubscriptionManager();

// Posted jobs tracking
class PostedJobsManager {
  constructor() {
    this.postedJobs = this.loadPostedJobs();
  }

  loadPostedJobs() {
    try {
      if (fs.existsSync(postedJobsPath)) {
        const data = JSON.parse(fs.readFileSync(postedJobsPath, 'utf8'));
        return new Set(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading posted jobs:', error);
    }
    return new Set();
  }

  savePostedJobs() {
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      // Convert Set to sorted array and limit size to prevent infinite growth
      let postedJobsArray = [...this.postedJobs].sort();
      const maxEntries = 5000; // Keep last 5000 posted jobs
      
      if (postedJobsArray.length > maxEntries) {
        postedJobsArray = postedJobsArray.slice(-maxEntries);
        this.postedJobs = new Set(postedJobsArray);
      }
      
      // Atomic write
      const tempPath = postedJobsPath + '.tmp';
      fs.writeFileSync(tempPath, JSON.stringify(postedJobsArray, null, 2));
      fs.renameSync(tempPath, postedJobsPath);
      
    } catch (error) {
      console.error('Error saving posted jobs:', error);
    }
  }

  hasBeenPosted(jobId) {
    return this.postedJobs.has(jobId);
  }

  markAsPosted(jobId) {
    this.postedJobs.add(jobId);
    this.savePostedJobs();
  }
}

const postedJobsManager = new PostedJobsManager();

// Enhanced tag generation
function generateTags(job) {
  const tags = [];
  const title = job.job_title.toLowerCase();
  const description = (job.job_description || '').toLowerCase();
  const company = job.employer_name;

  // Experience level tags
  if (title.includes('senior') || title.includes('sr.') || title.includes('staff') || title.includes('principal')) {
    tags.push('Senior');
  } else if (title.includes('junior') || title.includes('jr.') || title.includes('entry') || 
             title.includes('new grad') || title.includes('graduate')) {
    tags.push('EntryLevel');
  } else {
    tags.push('MidLevel');
  }

  // Location tags
  if (description.includes('remote') || title.includes('remote') || 
      (job.job_city && job.job_city.toLowerCase().includes('remote'))) {
    tags.push('Remote');
  }
  
  // Add major city tags
  const majorCities = {
    'san francisco': 'SF', 'sf': 'SF', 'bay area': 'SF',
    'new york': 'NYC', 'nyc': 'NYC', 'manhattan': 'NYC',
    'seattle': 'Seattle', 'bellevue': 'Seattle', 'redmond': 'Seattle',
    'austin': 'Austin', 'los angeles': 'LA', 'la': 'LA',
    'boston': 'Boston', 'chicago': 'Chicago', 'denver': 'Denver'
  };
  
  const cityKey = (job.job_city || '').toLowerCase();
  if (majorCities[cityKey]) {
    tags.push(majorCities[cityKey]);
  }

  // Company tier tags
  if (companies.faang_plus.some(c => c.name === company)) {
    tags.push('FAANG');
  } else if (companies.unicorn_startups.some(c => c.name === company)) {
    tags.push('Unicorn');
  } else if (companies.fintech.some(c => c.name === company)) {
    tags.push('Fintech');
  } else if (companies.gaming.some(c => c.name === company)) {
    tags.push('Gaming');
  }

  // Technology/skill tags
  const techStack = {
    'react': 'React', 'vue': 'Vue', 'angular': 'Angular',
    'node': 'NodeJS', 'python': 'Python', 'java': 'Java',
    'javascript': 'JavaScript', 'typescript': 'TypeScript',
    'aws': 'AWS', 'azure': 'Azure', 'gcp': 'GCP', 'cloud': 'Cloud',
    'kubernetes': 'K8s', 'docker': 'Docker', 'terraform': 'Terraform',
    'machine learning': 'ML', 'ai': 'AI', 'data science': 'DataScience',
    'ios': 'iOS', 'android': 'Android', 'mobile': 'Mobile',
    'frontend': 'Frontend', 'backend': 'Backend', 'fullstack': 'FullStack',
    'devops': 'DevOps', 'security': 'Security', 'blockchain': 'Blockchain'
  };

  const searchText = `${title} ${description}`;
  for (const [keyword, tag] of Object.entries(techStack)) {
    if (searchText.includes(keyword)) {
      tags.push(tag);
    }
  }

  // Role category tags (only if not already added via tech stack)
  if (!tags.includes('DataScience') && (title.includes('data scientist') || title.includes('analyst'))) {
    tags.push('DataScience');
  }
  if (!tags.includes('ML') && (title.includes('machine learning') || title.includes('ml engineer'))) {
    tags.push('ML');
  }
  if (title.includes('product manager') || title.includes('pm ')) {
    tags.push('ProductManager');
  }
  if (title.includes('designer') || title.includes('ux') || title.includes('ui')) {
    tags.push('Design');
  }

  return [...new Set(tags)]; // Remove duplicates
}

// Enhanced embed builder with auto-generated tags
function buildJobEmbed(job) {
  const tags = generateTags(job);
  const company = companies.faang_plus.find(c => c.name === job.employer_name) ||
                  companies.unicorn_startups.find(c => c.name === job.employer_name) ||
                  companies.fintech.find(c => c.name === job.employer_name) ||
                  companies.gaming.find(c => c.name === job.employer_name) ||
                  companies.top_tech.find(c => c.name === job.employer_name) ||
                  companies.enterprise_saas.find(c => c.name === job.employer_name) ||
                  { emoji: '🏢' };

  const embed = new EmbedBuilder()
    .setTitle(`${company.emoji} ${job.job_title}`)
    .setURL(job.job_apply_link)
    .setColor(0x00A8E8)
    .addFields(
      { name: '🏢 Company', value: job.employer_name, inline: true },
      { name: '📍 Location', value: `${job.job_city || 'Not specified'}, ${job.job_state || 'Remote'}`, inline: true },
      { name: '⏰ Posted', value: new Date(job.job_posted_at_datetime_utc).toLocaleDateString(), inline: true }
    );

  // Add tags field with hashtag formatting
  if (tags.length > 0) {
    embed.addFields({
      name: '🏷️ Tags',
      value: tags.map(tag => `#${tag}`).join(' '),
      inline: false
    });
  }

  // Add description preview if available
  if (job.job_description && job.job_description.length > 100) {
    const preview = job.job_description.substring(0, 200) + '...';
    embed.addFields({
      name: '📋 Description',
      value: preview,
      inline: false
    });
  }


  return embed;
}

// Build action row with apply button and subscription toggle
function buildActionRow(job) {
  const tags = generateTags(job);
  
  const row = new ActionRowBuilder();

  // Only add subscription button if not in GitHub Actions
  if (!process.env.GITHUB_ACTIONS) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`subscribe_${tags[0] || 'general'}`)
        .setLabel('🔔 Get Similar Jobs')
        .setStyle(ButtonStyle.Secondary)
    );
  }
  
  return row;
}

// Slash command definitions
const commands = [
  new SlashCommandBuilder()
    .setName('jobs')
    .setDescription('Search and filter job opportunities')
    .addStringOption(option =>
      option.setName('tags')
        .setDescription('Filter by tags (e.g., Senior,Remote,React)')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('company')
        .setDescription('Filter by company name')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('location')
        .setDescription('Filter by location')
        .setRequired(false)),
  
  new SlashCommandBuilder()
    .setName('subscribe')
    .setDescription('Subscribe to job alerts for specific tags')
    .addStringOption(option =>
      option.setName('tags')
        .setDescription('Tags to subscribe to (e.g., Senior,Remote,React)')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('unsubscribe')
    .setDescription('Unsubscribe from job alerts')
    .addStringOption(option =>
      option.setName('tags')
        .setDescription('Tags to unsubscribe from (or "all" for everything)')
        .setRequired(true)),
  
  new SlashCommandBuilder()
    .setName('subscriptions')
    .setDescription('View your current job alert subscriptions')
];

// Register slash commands
async function registerCommands() {
  if (!CLIENT_ID || !GUILD_ID) {
    console.log('⚠️ CLIENT_ID or GUILD_ID not set - skipping command registration');
    return;
  }
  
  try {
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    
    console.log('🔄 Registering slash commands...');
    
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    
    console.log('✅ Slash commands registered successfully');
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}

// Load and filter jobs based on criteria
function loadAndFilterJobs(filters = {}) {
  try {
    const newJobsPath = path.join(dataDir, 'new_jobs.json');
    if (!fs.existsSync(newJobsPath)) {
      return [];
    }
    
    let jobs = JSON.parse(fs.readFileSync(newJobsPath, 'utf8'));
    
    // Apply filters
    if (filters.tags) {
      const filterTags = filters.tags.split(',').map(t => t.trim().toLowerCase());
      jobs = jobs.filter(job => {
        const jobTags = generateTags(job).map(t => t.toLowerCase());
        return filterTags.some(tag => jobTags.includes(tag));
      });
    }
    
    if (filters.company) {
      jobs = jobs.filter(job => 
        job.employer_name.toLowerCase().includes(filters.company.toLowerCase())
      );
    }
    
    if (filters.location) {
      jobs = jobs.filter(job => 
        (job.job_city && job.job_city.toLowerCase().includes(filters.location.toLowerCase())) ||
        (job.job_state && job.job_state.toLowerCase().includes(filters.location.toLowerCase()))
      );
    }
    
    return jobs.slice(0, 10); // Limit to 10 results
  } catch (error) {
    console.error('Error loading jobs:', error);
    return [];
  }
}

// Event handlers
client.once('ready', async () => {
  console.log(`✅ Enhanced Discord bot logged in as ${client.user.tag}`);
  
  // Only register commands if running interactively (not in GitHub Actions)
  if (!process.env.GITHUB_ACTIONS) {
    await registerCommands();
  }
  
  // Post new jobs if any exist
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) {
    console.error('❌ Channel not found:', CHANNEL_ID);
    client.destroy();
    process.exit(1);
    return;
  }

  let jobs = [];
  try {
    const newJobsPath = path.join(dataDir, 'new_jobs.json');
    if (fs.existsSync(newJobsPath)) {
      jobs = JSON.parse(fs.readFileSync(newJobsPath, 'utf8'));
    }
  } catch (error) {
    console.log('ℹ️ No new jobs file found or error reading it');
    client.destroy();
    process.exit(0);
    return;
  }

  if (!jobs.length) {
    console.log('ℹ️ No new jobs to post');
    client.destroy();
    process.exit(0);
    return;
  }

  // Filter out jobs that have already been posted to Discord
  const unpostedJobs = jobs.filter(job => {
    const jobId = generateJobId(job);
    const hasBeenPosted = postedJobsManager.hasBeenPosted(jobId);
    
    if (hasBeenPosted) {
      console.log(`⏭️ Skipping already posted: ${job.job_title} at ${job.employer_name}`);
      return false;
    }
    return true;
  });

  if (!unpostedJobs.length) {
    console.log('ℹ️ No new jobs to post - all jobs have been posted already');
    client.destroy();
    process.exit(0);
    return;
  }

  console.log(`📬 Posting ${unpostedJobs.length} new jobs (${jobs.length - unpostedJobs.length} already posted)...`);

  for (const job of unpostedJobs) {
    try {
      const jobId = generateJobId(job);
      const tags = generateTags(job);
      const embed = buildJobEmbed(job);
      const actionRow = buildActionRow(job);

      // Get users subscribed to these tags (only if not in GitHub Actions)
      let content = '';
      
      if (!process.env.GITHUB_ACTIONS) {
        const subscribedUsers = subscriptionManager.getUsersForTags(tags);
        if (subscribedUsers.length > 0) {
          content = `🔔 ${subscribedUsers.map(id => `<@${id}>`).join(' ')} - New job matching your subscriptions!`;
        }
      }

      const messageData = {
        content,
        embeds: [embed]
      };
      
      // Only add components if actionRow has buttons
      if (actionRow.components.length > 0) {
        messageData.components = [actionRow];
      }
      
      const message = await channel.send(messageData);

      // Thread creation disabled - bot lacks thread permissions
      // await message.startThread({
      //   name: `💬 ${job.job_title} at ${job.employer_name}`,
      //   autoArchiveDuration: 1440 // 24 hours
      // });

      // Mark this job as posted AFTER successful posting
      postedJobsManager.markAsPosted(jobId);

      console.log(`✅ Posted: ${job.job_title} at ${job.employer_name}`);
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error posting job ${job.job_title}:`, error);
    }
  }

  console.log('🎉 All jobs posted successfully!');
  process.exit(0);
});

// Handle slash commands (only if not running in GitHub Actions)
client.on('interactionCreate', async interaction => {
  if (process.env.GITHUB_ACTIONS) return; // Skip interactions in CI
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options, user } = interaction;

  try {
    switch (commandName) {
      case 'jobs':
        const filters = {
          tags: options.getString('tags'),
          company: options.getString('company'),
          location: options.getString('location')
        };
        
        const filteredJobs = loadAndFilterJobs(filters);
        
        if (filteredJobs.length === 0) {
          await interaction.reply({
            content: '❌ No jobs found matching your criteria. Try different filters!',
            ephemeral: true
          });
          return;
        }

        const jobsEmbed = new EmbedBuilder()
          .setTitle('🔍 Job Search Results')
          .setColor(0x00A8E8)
          .setDescription(`Found ${filteredJobs.length} jobs matching your criteria`)
          .setTimestamp();

        filteredJobs.forEach((job, index) => {
          const tags = generateTags(job);
          jobsEmbed.addFields({
            name: `${index + 1}. ${job.job_title} at ${job.employer_name}`,
            value: `📍 ${job.job_city}, ${job.job_state}\n🏷️ ${tags.map(t => `#${t}`).join(' ')}\n[Apply Here](${job.job_apply_link})`,
            inline: false
          });
        });

        await interaction.reply({ embeds: [jobsEmbed], ephemeral: true });
        break;

      case 'subscribe':
        const subscribeTags = options.getString('tags').split(',').map(t => t.trim());
        const subscribed = [];
        
        for (const tag of subscribeTags) {
          if (subscriptionManager.subscribe(user.id, tag)) {
            subscribed.push(tag);
          }
        }

        if (subscribed.length > 0) {
          await interaction.reply({
            content: `✅ Successfully subscribed to: ${subscribed.map(t => `#${t}`).join(', ')}\n🔔 You'll be notified when new jobs with these tags are posted!`,
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: '❌ You are already subscribed to all specified tags.',
            ephemeral: true
          });
        }
        break;

      case 'unsubscribe':
        const unsubscribeInput = options.getString('tags');
        
        if (unsubscribeInput.toLowerCase() === 'all') {
          delete subscriptionManager.subscriptions[user.id];
          subscriptionManager.saveSubscriptions();
          await interaction.reply({
            content: '✅ Unsubscribed from all job alerts.',
            ephemeral: true
          });
        } else {
          const unsubscribeTags = unsubscribeInput.split(',').map(t => t.trim());
          const unsubscribed = [];
          
          for (const tag of unsubscribeTags) {
            if (subscriptionManager.unsubscribe(user.id, tag)) {
              unsubscribed.push(tag);
            }
          }

          if (unsubscribed.length > 0) {
            await interaction.reply({
              content: `✅ Unsubscribed from: ${unsubscribed.map(t => `#${t}`).join(', ')}`,
              ephemeral: true
            });
          } else {
            await interaction.reply({
              content: '❌ You were not subscribed to any of the specified tags.',
              ephemeral: true
            });
          }
        }
        break;

      case 'subscriptions':
        const userSubs = subscriptionManager.getUserSubscriptions(user.id);
        
        if (userSubs.length === 0) {
          await interaction.reply({
            content: '📭 You have no active job alert subscriptions.\nUse `/subscribe tags:Remote,Senior` to get started!',
            ephemeral: true
          });
        } else {
          await interaction.reply({
            content: `🔔 Your active job alert subscriptions:\n${userSubs.map(t => `#${t}`).join(', ')}\n\nUse \`/unsubscribe\` to modify your subscriptions.`,
            ephemeral: true
          });
        }
        break;
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    await interaction.reply({
      content: '❌ An error occurred while processing your request.',
      ephemeral: true
    });
  }
});

// Handle button interactions (only if not running in GitHub Actions)
client.on('interactionCreate', async interaction => {
  if (process.env.GITHUB_ACTIONS) return; // Skip interactions in CI
  if (!interaction.isButton()) return;

  const { customId, user } = interaction;

  if (customId.startsWith('subscribe_')) {
    const tag = customId.replace('subscribe_', '');
    
    if (subscriptionManager.subscribe(user.id, tag)) {
      await interaction.reply({
        content: `✅ Subscribed to #${tag} job alerts! You'll be notified when similar jobs are posted.`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `ℹ️ You're already subscribed to #${tag} alerts.`,
        ephemeral: true
      });
    }
  }
});

// Error handling
client.on('error', error => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord
client.login(TOKEN);