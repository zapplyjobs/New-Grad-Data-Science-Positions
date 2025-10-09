#!/usr/bin/env node

const fs    = require('fs');
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const TOKEN      = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;

const client = new Client({
  intents: [ GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages ]
});

function buildJobEmbed(job) {
  const tags = [];
  if (job.job_remote)               tags.push('#Remote');
  if (job.experience === 'Senior')  tags.push('#Senior');
  if (job.experience === 'Entry-Level') tags.push('#EntryLevel');
  if (job.category)                 tags.push(`#${job.category.replace(/\s+/g, '')}`);

  return new EmbedBuilder()
    .setTitle(job.job_title)
    .setURL(job.job_apply_link)
    .setColor(0x00A8E8)
    .addFields(
      { name: '🏢 Company', value: job.employer_name, inline: true },
      { name: '📍 Location', value: `${job.job_city}, ${job.job_state}`, inline: true },
      { name: '🗓 Posted',   value: new Date(job.job_posted_at_datetime_utc).toLocaleString(), inline: true },
      { name: '🔖 Tags',     value: tags.join(' ') || '—' }
    )
    .setTimestamp();
}

function buildApplyButton(job) {
  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setLabel('💼 Apply Now')
        .setStyle(ButtonStyle.Link)
        .setURL(job.job_apply_link)
    );
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  const channel = client.channels.cache.get(CHANNEL_ID);
  if (!channel) return console.error('❌ Channel not found:', CHANNEL_ID);

  let jobs = [];
  try {
    jobs = JSON.parse(fs.readFileSync('.github/data/new_jobs.json', 'utf8'));
  } catch {
    return console.log('ℹ️ No new jobs to post');
  }
  if (!jobs.length) return console.log('ℹ️ No new jobs to post');

  (async () => {
    for (const job of jobs) {
      const msg = await channel.send({
        embeds: [ buildJobEmbed(job) ],
        components: [ buildApplyButton(job) ]
      });
      await msg.startThread({
        name: `Discuss: ${job.job_title}`,
        autoArchiveDuration: 60
      });
      console.log(`✅ Posted: ${job.job_title}`);
    }
    process.exit(0);
  })();
});

client.login(TOKEN);
