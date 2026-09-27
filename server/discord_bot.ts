import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db, Application, License, HWIDReset, Blacklist } from './firebase_admin';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN) {
  console.log('----------------------------------------------------');
  console.log('[Discord Bot] DISCORD_BOT_TOKEN not found in .env.');
  console.log('[Discord Bot] Bot initialization skipped.');
  console.log('[Discord Bot] Add token to .env to enable Discord commands.');
  console.log('----------------------------------------------------');
} else {
  startDiscordBot();
}

function startDiscordBot() {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  // Define Slash Commands
  const commands = [
    // 1. Create Key command
    new SlashCommandBuilder()
      .setName('createkey')
      .setDescription('Generate new license keys for an application')
      .addStringOption(option => 
        option.setName('appid')
          .setDescription('The Application ID (e.g. APP_DEMO or app_seed)')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option.setName('expiry')
          .setDescription('Number of days before the key expires (use 36500 for lifetime)')
          .setRequired(true)
      )
      .addIntegerOption(option =>
        option.setName('quantity')
          .setDescription('Number of keys to generate (default 1, max 20)')
          .setRequired(false)
      )
      .addStringOption(option =>
        option.setName('prefix')
          .setDescription('Custom prefix for the keys (default INV)')
          .setRequired(false)
      ),

    // 2. List Apps command
    new SlashCommandBuilder()
      .setName('listapps')
      .setDescription('List all registered applications and their IDs'),

    // 3. Stats command
    new SlashCommandBuilder()
      .setName('appstats')
      .setDescription('Show key statistics for an application')
      .addStringOption(option =>
        option.setName('appid')
          .setDescription('The Application ID')
          .setRequired(true)
      ),

    // 4. [NEW] Reset HWID command
    new SlashCommandBuilder()
      .setName('resethwid')
      .setDescription('Reset the hardware ID (HWID) lock for a license key')
      .addStringOption(option =>
        option.setName('key')
          .setDescription('The License Key (e.g. INV-XXXX-XXXX-XXXX)')
          .setRequired(true)
      ),

    // 5. [NEW] Check Key command
    new SlashCommandBuilder()
      .setName('checkkey')
      .setDescription('Check expiration date, status, and HWID lock for a license key')
      .addStringOption(option =>
        option.setName('key')
          .setDescription('The License Key')
          .setRequired(true)
      ),

    // 6. [NEW] Ban User / HWID command
    new SlashCommandBuilder()
      .setName('banuser')
      .setDescription('Ban a License Key or Hardware ID (HWID)')
      .addStringOption(option =>
        option.setName('target')
          .setDescription('The License Key or HWID string to ban')
          .setRequired(true)
      )
      .addStringOption(option =>
        option.setName('reason')
          .setDescription('Reason for banning')
          .setRequired(false)
      )
  ].map(command => command.toJSON());

  // Register Commands
  const rest = new REST({ version: '10' }).setToken(TOKEN!);

  (async () => {
    try {
      console.log('[Discord Bot] Registering application (/) commands...');
      if (CLIENT_ID && GUILD_ID) {
        await rest.put(
          Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
          { body: commands }
        );
        console.log('[Discord Bot] Successfully registered guild commands.');
      } else if (CLIENT_ID) {
        await rest.put(
          Routes.applicationCommands(CLIENT_ID),
          { body: commands }
        );
        console.log('[Discord Bot] Successfully registered global application commands.');
      } else {
        console.log('[Discord Bot] DISCORD_CLIENT_ID missing. Commands registration skipped.');
      }
    } catch (error) {
      console.error('[Discord Bot Error] Failed to register commands:', error);
    }
  })();

  client.once('ready', () => {
    console.log(`[Discord Bot] Logged in as ${client.user?.tag}!`);
  });

  // Handle Command Interactions
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      // COMMAND: listapps
      if (commandName === 'listapps') {
        const apps = await db.find<Application>('applications');
        if (apps.length === 0) {
          await interaction.reply({ content: '❌ No applications found in Firestore.', ephemeral: true });
          return;
        }

        const embed = new EmbedBuilder()
          .setTitle('🛡️ KANISHK CHEATS — Registered Applications')
          .setColor(0x00f0ff)
          .setTimestamp();

        apps.forEach(app => {
          embed.addFields({
            name: `${app.appName} (${app.version})`,
            value: `**App ID:** \`${app.appid}\`\n**Internal ID:** \`${app.id}\`\n**Owner ID:** \`${app.ownerid}\``,
            inline: false
          });
        });

        await interaction.reply({ embeds: [embed] });
      }

      // COMMAND: createkey
      else if (commandName === 'createkey') {
        const appid = interaction.options.getString('appid', true);
        const expiryDays = interaction.options.getInteger('expiry', true);
        const quantity = Math.min(interaction.options.getInteger('quantity') || 1, 20);
        const prefix = (interaction.options.getString('prefix') || 'INV').toUpperCase().replace(/[^A-Z0-9]/g, '');

        let app = await db.findOne<Application>('applications', [{ field: 'appid', op: '==', value: appid }]);
        if (!app) { app = await db.getById<Application>('applications', appid); }
        
        if (!app) {
          await interaction.reply({ 
            content: `❌ Application with App ID \`${appid}\` was not found. Use \`/listapps\` to check active applications.`, 
            ephemeral: true 
          });
          return;
        }

        const generatedKeys: string[] = [];
        const expiresAtStr = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

        for (let i = 0; i < quantity; i++) {
          const p1 = crypto.randomBytes(2).toString('hex').toUpperCase();
          const p2 = crypto.randomBytes(2).toString('hex').toUpperCase();
          const p3 = crypto.randomBytes(2).toString('hex').toUpperCase();
          const licenseKey = `${prefix}-${p1}-${p2}-${p3}`;

          const newLicense: License = {
            id: `lic_${crypto.randomUUID()}`,
            appId: app.id,
            licenseKey,
            key: licenseKey,
            hwid: null,
            hwidLock: false,
            expiresAt: expiresAtStr,
            expires: expiresAtStr,
            status: 'unused',
            createdAt: new Date().toISOString(),
            maxResets: 10,
            resetCount: 0,
            lastResetAt: null,
            resetBy: `Discord Bot (${interaction.user.tag})`
          };

          await db.insert('licenses', newLicense);
          generatedKeys.push(licenseKey);
        }

        const embed = new EmbedBuilder()
          .setTitle('🔑 Licenses Generated Successfully!')
          .setDescription(`Generated **${quantity}** new license key(s) for **${app.appName}**.`)
          .setColor(0x00ff88)
          .addFields(
            { name: 'Application', value: `\`${app.appName}\` (ID: \`${app.appid}\`)`, inline: true },
            { name: 'Duration', value: `\`${expiryDays} Days\``, inline: true },
            { name: 'Keys List', value: `\`\`\`\n${generatedKeys.join('\n')}\n\`\`\``, inline: false }
          )
          .setFooter({ text: 'KANISHK CHEATS Key Auth System' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // COMMAND: appstats
      else if (commandName === 'appstats') {
        const appid = interaction.options.getString('appid', true);
        let app = await db.findOne<Application>('applications', [{ field: 'appid', op: '==', value: appid }]);
        if (!app) { app = await db.getById<Application>('applications', appid); }

        if (!app) {
          await interaction.reply({ content: `❌ Application with App ID \`${appid}\` not found.`, ephemeral: true });
          return;
        }

        const allKeys = await db.find<License>('licenses', [{ field: 'appId', op: '==', value: app.id }]);
        const activeKeys = allKeys.filter(k => k.status === 'active' || k.status === 'used').length;
        const boundDevices = allKeys.filter(k => k.hwid !== null).length;
        const totalResets = allKeys.reduce((sum, k) => sum + (k.resetCount || 0), 0);

        const embed = new EmbedBuilder()
          .setTitle(`📊 Application Stats: ${app.appName}`)
          .setColor(0xbd00ff)
          .addFields(
            { name: 'Total License Keys', value: `\`${allKeys.length}\``, inline: true },
            { name: 'Active/Used Licenses', value: `\`${activeKeys}\``, inline: true },
            { name: 'Bound Devices (HWID)', value: `\`${boundDevices}\``, inline: true },
            { name: 'Total HWID Resets', value: `\`${totalResets}\``, inline: true }
          )
          .setFooter({ text: 'KANISHK CHEATS Console' })
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // COMMAND: resethwid [NEW]
      else if (commandName === 'resethwid') {
        const key = interaction.options.getString('key', true).trim();
        let license = await db.findOne<License>('licenses', [{ field: 'key', op: '==', value: key }]);
        if (!license) { license = await db.findOne<License>('licenses', [{ field: 'licenseKey', op: '==', value: key }]); }

        if (!license) {
          await interaction.reply({ content: `❌ License key \`${key}\` was not found.`, ephemeral: true });
          return;
        }

        if ((license.resetCount || 0) >= (license.maxResets || 10)) {
          await interaction.reply({ content: `❌ Resets exceeded for this key. Limit: **${license.maxResets}**`, ephemeral: true });
          return;
        }

        if (license.lastResetAt) {
          const elapsed = Date.now() - new Date(license.lastResetAt).getTime();
          const cooldownMs = 24 * 60 * 60 * 1000;
          if (elapsed < cooldownMs) {
            const remainingHours = Math.ceil((cooldownMs - elapsed) / (1000 * 60 * 60));
            await interaction.reply({ content: `⏳ Cooldown active. Please retry in **${remainingHours} hours**.`, ephemeral: true });
            return;
          }
        }

        const oldHwid = license.hwid;
        await db.update<License>('licenses', license.id, {
          hwid: null,
          status: 'active',
          resetCount: (license.resetCount || 0) + 1,
          lastResetAt: new Date().toISOString()
        });

        await db.insert('hwid_resets', {
          id: `rst_${crypto.randomUUID()}`,
          appId: license.appId,
          licenseKey: key,
          licenseId: license.id,
          oldHwid,
          newHwid: null,
          resetTime: new Date().toISOString(),
          resetAt: new Date().toISOString(),
          resetBy: `Discord (${interaction.user.tag})`
        });

        await db.deleteMany('sessions', [{ field: 'appId', op: '==', value: license.appId }, { field: 'hwid', op: '==', value: oldHwid }]);

        const embed = new EmbedBuilder()
          .setTitle('🔄 HWID Reset Successful')
          .setDescription(`The hardware lock for key \`${key}\` has been cleared. It can now be used on a new machine.`)
          .setColor(0x00f0ff)
          .addFields(
            { name: 'Resets Used', value: `${(license.resetCount || 0) + 1} / ${license.maxResets || 10}`, inline: true },
            { name: 'Old HWID', value: `\`${oldHwid || 'None'}\``, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

      // COMMAND: checkkey [NEW]
      else if (commandName === 'checkkey') {
        const key = interaction.options.getString('key', true).trim();
        let license = await db.findOne<License>('licenses', [{ field: 'key', op: '==', value: key }]);
        if (!license) { license = await db.findOne<License>('licenses', [{ field: 'licenseKey', op: '==', value: key }]); }

        if (!license) {
          await interaction.reply({ content: `❌ License key \`${key}\` was not found.`, ephemeral: true });
          return;
        }

        const expStr = license.expires || license.expiresAt || 'N/A';
        const isExpired = expStr !== 'N/A' && new Date(expStr).getTime() < Date.now();

        const embed = new EmbedBuilder()
          .setTitle('🔍 License Key Inspector')
          .setColor(isExpired ? 0xff0033 : 0x00ff88)
          .addFields(
            { name: 'Key', value: `\`${key}\``, inline: false },
            { name: 'Status', value: isExpired ? '❌ **EXPIRED**' : `✅ **${license.status.toUpperCase()}**`, inline: true },
            { name: 'HWID Bound', value: license.hwid ? `\`${license.hwid.substring(0, 16)}...\`` : '🔓 *Not Bound*', inline: true },
            { name: 'Expires At', value: expStr !== 'N/A' ? new Date(expStr).toLocaleDateString() : 'Lifetime', inline: true },
            { name: 'Resets Used', value: `${license.resetCount || 0} / ${license.maxResets || 10}`, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // COMMAND: banuser [NEW]
      else if (commandName === 'banuser') {
        const target = interaction.options.getString('target', true).trim();
        const reason = interaction.options.getString('reason') || 'Banned via Discord command';

        // Check if target is a key or hwid
        let license = await db.findOne<License>('licenses', [{ field: 'key', op: '==', value: target }]);
        if (!license) { license = await db.findOne<License>('licenses', [{ field: 'licenseKey', op: '==', value: target }]); }

        const appId = license ? license.appId : 'GLOBAL';
        const type = license ? 'hwid' : 'hwid'; // Ban HWID if key found or direct hwid

        const bannedVal = license && license.hwid ? license.hwid : target;

        await db.insert('blacklists', {
          id: `bl_${crypto.randomUUID()}`,
          appId,
          type,
          value: bannedVal,
          reason,
          addedBy: `Discord (${interaction.user.tag})`,
          createdAt: new Date().toISOString()
        });

        if (license) {
          await db.update<License>('licenses', license.id, { status: 'expired' });
          if (license.hwid) {
            await db.deleteMany('sessions', [{ field: 'hwid', op: '==', value: license.hwid }]);
          }
        }

        const embed = new EmbedBuilder()
          .setTitle('🚫 Blacklist Enforcement')
          .setDescription(`Successfully blacklisted target: \`${bannedVal}\``)
          .setColor(0xff0033)
          .addFields(
            { name: 'Scope', value: appId === 'GLOBAL' ? 'Global Platform' : `App ID: \`${appId}\``, inline: true },
            { name: 'Reason', value: reason, inline: true }
          )
          .setTimestamp();

        await interaction.reply({ embeds: [embed] });
      }

    } catch (err: any) {
      console.error('[Discord Bot Error] Interaction failed:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: '❌ An error occurred while executing this command.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ An error occurred while executing this command.', ephemeral: true });
      }
    }
  });

  client.login(TOKEN);
}
export {};
