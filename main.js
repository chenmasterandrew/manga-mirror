// made by following the "Command Handler" section of discordjs.guide
// using "MangaDex Full API" by md-y at github.com/md-y/mangadex-full-api

const Discord = require('discord.js');
const fs = require('fs');
const config = require('./config.json');
const helpers = require('./helpers.js');
const client = new Discord.Client();
const cooldowns = new Discord.Collection();

client.commands = new Discord.Collection();

const commandFiles = fs.readdirSync('./commands/').filter(file => file.endsWith('.js'));
for(const file of commandFiles) {
	const command = require(`./commands/${file}`);

	client.commands.set(command.name, command);
}

String.prototype.replaceAt = function(index, replacement) {
	return this.substr(0, index) + replacement + this.substr(index + 1);
};


client.once('ready', () => {
	console.log('MangaMirror activates!');
});

process.on('unhandledRejection', error => {
	console.error('Unhandled promise rejection:', error);
});

client.on('message', message =>{
	if(!message.content.startsWith(config.prefix) || message.author.bot) return;

	const quoteIndices = [];
	let currentIndex = -1;
	let quotedMessage = message.content;
	for(let i = quotedMessage.length - 1; i >= 0; i--) {
		if (quotedMessage[i] == '"') {
			quoteIndices.push(i);
			currentIndex += 1;
			if (!(currentIndex % 2 == 0)) {
				for (let j = (i + 1); j < (quoteIndices[currentIndex - 1]); j++) {
					if (quotedMessage[j] == ' ') {
						quotedMessage = quotedMessage.replaceAt(j, '_');
					}
				}
				quotedMessage = quotedMessage.replaceAt(quoteIndices[currentIndex - 1], '');
				quotedMessage = quotedMessage.replaceAt(i, '');
			}

		}
	}

	const args = quotedMessage.slice(config.prefix.length).split(/ +/);

	const commandName = args.shift().toLowerCase();

	const command = client.commands.get(commandName)
		|| client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

	if (!command) return;

	if (command.args && !args.length) {
		helpers.improperUsage(command, message, 'You did not provide any arguments');
	}

	if (!cooldowns.has(command.name)) {
		cooldowns.set(command.name, new Discord.Collection());
	}

	const now = Date.now();
	const timestamps = cooldowns.get(command.name);
	const cooldownAmount = (command.cooldown || 3) * 1000;

	if (timestamps.has(message.author.id)) {
		const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

		if (now < expirationTime) {
			const timeLeft = (expirationTime - now) / 1000;
			return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
		}
	}

	timestamps.set(message.author.id, now);
	setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

	try {
		command.execute(message, args);
	}
	catch (error) {
		console.error(error);
		message.reply('There was an error trying to execute that command!');
	}
});


client.login(config.token);
