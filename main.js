//==== CONFIG =====//

const prefix = 's!';
const timeout_duration = 5 * 60 * 1000; // 5 minutes
const receive_channel = '956237822845665374';


//============///


const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const discordModals = require('discord-modals')
const uuid = require("uuid")
const fs = require('fs');
require('dotenv').config();


const tickets_db = {};
const timeout_db = {};
var ticket_id = uuid.v4()

const client_sup = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGE_TYPING,
        Intents.FLAGS.DIRECT_MESSAGE_REACTIONS
    ],
    partials: ["CHANNEL"]
})

discordModals(client);
client_sup.login(process.env.TOKEN)

client_sup.on('ready', async () => {
    console.log('Bot is ready!')
    client.user.setActivity('DMs for help', { type: 'WATCHING' })

     client.application.commands.create({
        name: 'dm_reply',
        description: 'Reply to a ticket. (Moderators only)',
        type: 'STRING',
        options: [{
            name: 'ticket_id',
            description: 'The ID of the ticket you want to reply to',
            required: true,
            type: 'STRING'
        }]
     })
})

client.on('messageCreate', async message => {
    if(message.author.bot) return null;

    const args = message.content.slice(prefix.length).trim().split(/ +/);

    if(message.content.startsWith( prefix + 'blacklist')) {
        if(message.member.permissions.has('ADMINISTRATOR')) {
            if(args[1] === 'add') {
                const blacklist_db = JSON.parse(fs.readFileSync('./blacklist.json', 'utf8'))
                const user = message.mentions.users.first()
                if(!user) return message.channel.send('Please mention a user!'), message.delete()
                const reason = message.content.split(' ').slice(3).join(' ')
                if(!reason) return message.channel.send('Please provide a reason!'), message.delete()
                if(blacklist_db[user.id]) return message.channel.send('This user is already blacklisted!'), message.delete();
                blacklist_db[user.id] = {
                    reason: reason,
                }
                fs.writeFileSync('./blacklist.json', JSON.stringify(blacklist_db, null, 4))
                message.channel.send(`${user.tag} has been blacklisted for ${reason}`)
            } else if(args[1] === 'remove') {
                const user = message.mentions.users.first()
                if(!user) return message.channel.send('Please mention a user!'), message.delete()
                const blacklist_db = JSON.parse(fs.readFileSync('./blacklist.json', 'utf8'))
                if(!blacklist_db[user.id]) return message.channel.send('This user is not blacklisted!'), message.delete()
                delete blacklist_db[user.id]
                fs.writeFileSync('./blacklist.json', JSON.stringify(blacklist_db, null, 4))
                message.channel.send(`${user.tag} has been removed from the blacklist!`)
            } else {
                message.channel.send('Please provide a valid command!')
            }
        } else {
            return null;
        }
    } 


    if(message.channel.type === "DM"){
        if(timeout_db[message.author.id]) {
            await message.channel.send('You are on cooldown! You can send again a new message in 5 minutes!')
            return;
        }

        if(tickets_db[ticket_id]) return ticket_id = uuid.v4();
        tickets_db[ticket_id] = {
            author: message.author.id
        };
        timeout_db[message.author.id] = {};
           
        const embed = new MessageEmbed()
        .setTitle(`✉️ New message!`)
        .setDescription(message.content)
        .setColor('YELLOW')
        .setFooter(`ID: ${ticket_id}`)
        .setAuthor('Author: ' + message.author.username, message.author.displayAvatarURL())
        const channel = client.channels.cache.get(receive_channel)
        const msg = await channel.send({embeds: [embed]}) 
        message.channel.send('You message was send to the support team! It will take a while until we anwer to your question.\n\n• General Support channel: <#944550542129115196>\n• Vote us(DBL): https://discordbotlist.com/bots/krak')
        msg.react('✅')

        setInterval (function () {
            delete timeout_db[message.author.id];
        }, timeout_duration); 
        
    } else {
        return null;
    }
})

client.on('interactionCreate', async (interaction) => {
    if(!interaction.isApplicationCommand()) return null;

    if(interaction.commandName === 'dm_reply'){
        if(!interaction.memberPermissions.has('MANAGE_MESSAGES')){
            await interaction.reply('You do not have the permission to use this command!')
            return;
        }
        const ticket_id = interaction.options.getString('ticket_id')

        if(tickets_db[ticket_id]){
            const reply_input = new discordModals.Modal()
            .setCustomId('reply_text')
            .setTitle(`Reply message`)
            .addComponents(
                new discordModals.TextInputComponent()
                .setCustomId('reply_TextInput')
                .setLabel('Message Reply')
                .setPlaceholder('Type your message here!')
                .setMaxLength(500)
                .setRequired(true)
                .setStyle('LONG')
            )

            discordModals.showModal(reply_input, {
                client: client,
                interaction: interaction
            })
        } else {
            await interaction.reply('There isn\'t any ticket with this id!', {ephemeral: true })
            return;
        }
    }
})

client.on('modalSubmit', async (modal) => {
    if(modal.customId === 'reply_text'){
        modal.deferReply({ephemeral: true})
        const firstResponse = modal.getTextInputValue('reply_TextInput')
        const author2 = tickets_db[ticket_id].author
        const user = client.users.cache.get(author2)
        await user.send('**ANSWER TO YOUR QUESTION**\n\n' + firstResponse + "\n\n__Do you have any other question? If so, please send it to us!__")
        await modal.editReply('Message sent!', { ephemeral: true })

        delete tickets_db[ticket_id]
    }  
  })