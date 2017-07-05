let _ = require('lodash')
let debug = require('debug')
let assert = require('assert')
let parseArgs = require('minimist')
let argv = parseArgs(process.argv.slice(2))

let tipbot = null

const SLACK_TOKEN = argv['slack-token'] || process.env.TIPBOT_SLACK_TOKEN
const RPC_USER = argv['rpc-user'] || process.env.TIPBOT_RPC_USER
const RPC_PASSWORD = argv['rpc-password'] || process.env.TIPBOT_RPC_PASSWORD
const RPC_PORT = argv['rpc-port'] || process.env.TIPBOT_RPC_PORT || 9998
const WALLET_PASSW = argv['wallet-password'] || process.env.TIPBOT_WALLET_PASSWORD

const base58check = require('base58check')
const request = require('request')

assert(RPC_USER, '--rpc-user or TIPBOT_RPC_USER is required')
assert(RPC_PASSWORD, '--rpc-password or TIPBOT_RPC_PASSWORD is required')

const TIPBOT_OPTIONS = {
	WALLET_PASSW: WALLET_PASSW,
	ALL_BALANCES: true,
	OTHER_BALANCES: true,
}


var fs = require('fs');

try {
	var Discord = require("discord.js");
} catch (e){
	console.log(e.stack);
	console.log(process.version);
	console.log("Please run npm install and ensure it passes with no errors!");
	process.exit();
}
console.log("Starting DiscordBot\nNode version: " + process.version + "\nDiscord.js version: " + Discord.version);


convertNumber = function (input) {
	if(input == ":100:") {
		return 100;
	}



	return input;
}



// Get authentication data
try {
	var AuthDetails = require("./auth.json");
} catch (e){
	console.log("Please create an auth.json like auth.json.example with a bot token or an email and password.\n"+e.stack);
	process.exit();
}

// Load custom permissions
var dangerousCommands = ["eval","pullanddeploy","setUsername"];
var Permissions = {};
try{
	Permissions = require("./permissions.json");
} catch(e){
	Permissions.global = {};
	Permissions.users = {};
}

for( var i=0; i<dangerousCommands.length;i++ ){
	var cmd = dangerousCommands[i];
	if(!Permissions.global.hasOwnProperty(cmd)){
		Permissions.global[cmd] = false;
	}
}
Permissions.checkPermission = function (user,permission){
	try {
		var allowed = true;
		try{
			if(Permissions.global.hasOwnProperty(permission)){
				allowed = Permissions.global[permission] === true;
			}
		} catch(e){}
		try{
			if(Permissions.users[user.id].hasOwnProperty(permission)){
				allowed = Permissions.users[user.id][permission] === true;
			}
		} catch(e){}
		return allowed;
	} catch(e){}
	return false;
}
fs.writeFile("./permissions.json",JSON.stringify(Permissions,null,2));

//load config data
var Config = {};
try{
	Config = require("./config.json");
} catch(e){ //no config file, use defaults
	Config.debug = false;
	Config.commandPrefix = '!';
	try{
		if(fs.lstatSync("./config.json").isFile()){
			console.log("WARNING: config.json found but we couldn't read it!\n" + e.stack);
		}
	} catch(e2){
		fs.writeFile("./config.json",JSON.stringify(Config,null,2));
	}
}
if(!Config.hasOwnProperty("commandPrefix")){
	Config.commandPrefix = '!';
}

var messagebox;

var commands = {
	"deposit": {
		description: "Get an address to deposit MoonCoins",
		process: function(bot, msg, suffix) {
			tipbot.wallet.TellDepositeAddress(msg.author)
				.then(line => {
					msg.author.sendMessage(line);
				})
				.catch(err => {
					debug('ERROR: cannot find a deposit address for \'' + user.username + '(' + user.id + ') : ' + err);
				})

			var msgText = msg.author+" looking up your deposit address! You will receive it in a DM."
			var richEmbed = new Discord.RichEmbed()
				.setDescription(msgText)
				.setColor(0x00AE86)
				.setTimestamp();
			msg.channel.sendEmbed(richEmbed)
		}
	},
    "balance": {
        description: "Check your current balance",
        process: function(bot, msg, suffix) {
            tipbot.wallet.GetBalanceLine(msg.author)
                .then(line => {
                msg.author.sendMessage(line);
        })
            .catch(err => {
                debug('ERROR: cannot tell ballance of ' + msg.author.username + '/' + msg.author.id)
            msg.author.sendMessage(err);
        })
        }
    },
    "withdraw": {
        usage: "<address> <amount to withdraw>",
        description: "Withdraw your MoonCoins",
        process: function(bot, msg, suffix) {
            if(!suffix){
                msg.channel.sendMessage("Use as !withdraw <address> <amount to withdraw>");
                return;
            }

            var args = suffix.split(' ');

            if(args.length < 2) {
                msg.channel.sendMessage("Use as !withdraw <address> <amount to withdraw>");
                return;
            }

            var address = args.shift();
            try {
                base58check.decode(address)
            } catch (e) {
                console.log('False address withdrawal');
                msg.author.sendMessage("Please enter a valid address")
                return false
            }


            var amount = args.shift();

            if(isNaN(amount)) {
                msg.author.sendMessage("Please enter a number for the amount you want to withdraw");
                return;
            }
            tipbot.normalizeValue(amount, "mooncoin", msg.author)
                .then(converted => {
                    tipbot.wallet.Withdraw(converted.newValue, address, tipbot.OPTIONS.WALLET_PASSW, msg.author)
                        .then(response => {
                            debug(user.username + ' has succesfull withdrawn ' + converted.text + ' to ' + address)
                            msg.author.sendMessage(converted.text + " MoonCoins are being withdrawn to address: " + address +"!");
                        })
                        .catch(err => {
                            debug('ERROR: cannot withdraw because: ' + err)
                            msg.author.sendMessage(err);
                        })

                    // msg.author.sendMessage(tipbotTxt.WithdrawQuestion[0] + converted.text +
                // tipbotTxt.WithdrawQuestion[1] + address +
                // tipbotTxt.WithdrawQuestion[2]);

                })
                .catch(errTxt => {
                    msg.author.sendMessage(errTxt);
                })


        }
    },
	"blue": {
    	usage: "",
		description: "Returns the market information for Bleutrade",
		process: function(bot, msg, suffix) {
			var richEmbed = new Discord.RichEmbed()
				.setAuthor("B L E U T R A D E", "https://bleutrade.com/imgs/favicon.ico", "https://bleutrade.com/exchange/MOON/BTC")
				.setDescription(responseMsg)
				.setColor(0xF1C40F)
				.setTimestamp();
			msg.channel.sendEmbed(richEmbed)
			return;
		}
	},
	"ccex": {
		usage: "",
		description: "Returns the market information for Bleutrade",
		process: function(bot, msg, suffix) {
			var richEmbed = new Discord.RichEmbed()
				.setAuthor("C - C E X E X C H A N G E", "https://c-cex.com/favicon.ico?v=2", "https://c-cex.com/?p=moon-btc")
				.setDescription(responseMsg)
				.setColor(0xF1C40F)
				.setTimestamp();
			msg.channel.sendEmbed(richEmbed)
			return;
		}
	},
	"nova": {
		usage: "",
		description: "Returns the market information for Bleutrade",
		process: function(bot, msg, suffix) {
			var richEmbed = new Discord.RichEmbed()
				.setAuthor("N O V A E X C H A N G E", "https://novaexchange.com/static/novaexchange_logo_small.png", "https://novaexchange.com/market/BTC_MOON/")
				.setDescription(responseMsg)
				.setColor(0xF1C40F)
				.setTimestamp();
			msg.channel.sendEmbed(richEmbed)
			return;
		}
	},
	"shitpost": {
		usage: "",
		description: "Returns the market information for Bleutrade",
		process: function(bot, msg, suffix) {
			var valueEmbed
			var valueReady = false;

			request.get('https://api.coinmarketcap.com/v1/ticker/mooncoin/?convert=EUR', function (err, response, body) {
				var prices = JSON.parse(body);
				var usd = (prices[0].price_usd * 1).toFixed(2);
				var eur = (prices[0].price_eur * 1).toFixed(2);
				var btc = (prices[0].price_btc * 1).toFixed(8);
				var valueResponse = "**USD**: \t$" + usd + "\n";
				valueResponse += "**EUR**: \t€" + eur + "\n";
				valueResponse += "**BTC**: \t฿" + btc;

				var usd24h = (prices[0]["24h_volume_usd"] * 1).toFixed(2);
				var btc24h = (usd24h/usd*btc).toFixed(2);

				var valueCap = "Rank: " + prices[0].rank + "\n";
				valueCap += "24H: $" + prices[0].rank + "\n";
				valueCap += "24H: " + prices[0].rank + " BTC";

				valueEmbed = new Discord.RichEmbed()
					.setAuthor("CoinMarketCap", "http://i.imgur.com/75d8dQt.png", "https://coinmarketcap.com/currencies/mooncoin/")
					// .setDescription(responseMsg)
					.setColor(0xF1C40F)
					.setTimestamp();
				valueEmbed.addField("Values", valueResponse, true);
				valueEmbed.addField("Cap", valueCap, true);
				valueReady = true;

			})

			while(true) {
				if (valueReady = true) {
					msg.channel.sendEmbed(valueEmbed);
					return;
				}
			}
			return;
		}
	},
	"value": {
    	usage: "<amount>",
		description: "Returns the value for the given amount of Mooncoins",
		process: function(bot, msg, suffix) {
			if(!suffix){
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Yea I can't process that. Please include the amount of Moon you want to value.")
					.setColor(0xE74C3C)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
				return;
			}

			var args = suffix.split(' ');
			var mooncoins = args.shift();

			if(mooncoins == '') {
				mooncoins = args.shift();
			}

			if(isNaN(mooncoins)) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("I'm not gonna value that.")
					.setColor(0xE74C3C)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
				return;
			}

			request.get('https://api.coinmarketcap.com/v1/ticker/mooncoin/?convert=EUR', function (err, response, body) {
				var prices = JSON.parse(body);
				var usd = (prices[0].price_usd * mooncoins).toFixed(2);
				var eur = (prices[0].price_eur * mooncoins).toFixed(2);
				var btc = (prices[0].price_btc * mooncoins).toFixed(8);
				var responseMsg = "**USD**: \t$" + usd + "\n";
				responseMsg += "**EUR**: \t€" + eur + "\n";
				responseMsg += "**BTC**: \t฿" + btc;

				var richEmbed = new Discord.RichEmbed()
					.setThumbnail("http://i.imgur.com/75d8dQt.png")
					.setAuthor("CoinMarketCap", "http://i.imgur.com/75d8dQt.png", "https://coinmarketcap.com/currencies/mooncoin/")
					.setDescription(responseMsg)
					.setColor(0xF1C40F)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
				return;
			})


		}
	},
	"topup": {
    	usage: "<amount>",
		description: "Top up the casino bankroll thereby increase max bets. You will earn our eternal gratitude!",
		process: function(bot, msg, suffix) {
			if(!suffix){
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Don't forget to include the amount which you want to add to the bankroll!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
				return;
			}

			var args = suffix.split(' ');
			var donation = args.shift();

			if(donation == "") {
				donation = args.shift();
			}

			if(isNaN(donation)) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Please enter the amount you want to donate to the bankroll " + msg.author.username + "!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
				return;
			}

			var misterdice = {};
			misterdice.id = 'misterdice';

			tipbot.normalizeValue(donation, "mooncoin", msg.author)
				.then(converted => {
					// send amount (move between accounts in wallet)
					console.log(msg.author.username + " topped up the bankroll with: " + donation);
					tipbot.wallet.Move(misterdice, converted.newValue, msg.author)
						.then(responses => {
							var richEmbed = new Discord.RichEmbed()
								.setDescription("Thank you very much for your generous donation to the bankroll! :game_die:")
								.setColor(0x00AE86)
								.setTimestamp();
							msg.channel.sendEmbed(richEmbed);
							// response to sender: send thanks and new balance
							msg.author.sendMessage(responses.privateToSender);

							var jasper = msg.channel.guild.members.get("181790539031642114")['user'];
							var richEmbedDM = new Discord.RichEmbed()
								.setDescription(msg.author.username + " has just topped up the bankroll with " + donation + " mooncoin! :game_die: ")
								.setColor(0x00AE86)
								.setTimestamp();
							jasper.sendEmbed(richEmbedDM);
						})
						.catch(err => {
							console.log('ERROR: cannot process donation')
							// warn sender about the error
							// response to sender: send thanks and new ballance
							var richEmbed = new Discord.RichEmbed()
								.setDescription("Oops something went wrong, no funds have been transferred!")
								.setColor(0x00AE86)
								.setTimestamp();
							msg.channel.sendEmbed(richEmbed)
							return;
						})
				})
				.catch(errTxt => {
					msg.channel.sendMessage(errTxt);
					return;
				})
		}
	},
	"tosscoin": {
    	usage: "<heads/tails> <amount|max 5>",
		description: "Throw a coin and gamble up to 100 Mooncoin. (2% House Edge)",
		process: function(bot, msg, suffix) {
    		if(!suffix){
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Let's toss some coins and win some money!\n\nTo play: `!tosscoin heads/tails bet`\n\nDue to our small bankroll, you can currently bet up to 100 coins. You always have a 49.0% to win, this gives us a house edge of 2%.\n\n**Good luck!**")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed);
				return;
			}


			var args = suffix.split(' ');
			var choice = args.shift();
			var bet = args.shift();

			bet = convertNumber(bet);

			if(choice != "heads" && choice != "tails") {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Either pick heads or tails!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed);
				return;
			}

			if(isNaN(bet)) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Please enter a valid bet amount!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed);
				return;
			}

			if(bet < 1 || bet > 100) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Please enter a bet between 1-100!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed);
				return;
			}

			if (msg.author.locked === true) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Looks like your account is locked. This is probably due to an unhandled transaction.\n\nIf the problem perseveres, contact @Jasper#4463 for help.")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed);
			}

			var misterdice = {};
			misterdice.id = 'misterdice';

			tipbot.wallet.GetBalance(misterdice.id, 6)
				.then(balance => {
					if(balance < bet) {
						var richEmbed = new Discord.RichEmbed()
							.setDescription("Sorry, the bankroll is empty!")
							.setColor(0x00AE86)
							.setTimestamp();
						msg.channel.sendEmbed(richEmbed);
						return;
					} else {
						tipbot.wallet.GetBalance(msg.author.id, 6)
							.then(balance => {
								if(balance < bet) {
									var richEmbed = new Discord.RichEmbed()
										.setDescription("Sorry, your balance is not sufficient!")
										.setColor(0x00AE86)
										.setTimestamp();
									msg.channel.sendEmbed(richEmbed);
									return;
								} else {
									tipbot.normalizeValue(bet, "mooncoin", msg.author)
										.then(converted => {
											// send amount (move between accounts in wallet)
											console.log(msg.author.username + " tosses a coin worth: " + bet);
											tipbot.wallet.Move(misterdice, converted.newValue, msg.author)
												.then(responses => {
													var richEmbed = new Discord.RichEmbed()
														.setDescription("Tossing the coin!")
														.setColor(0x00AE86)
														.setTimestamp();
													msg.channel.sendEmbed(richEmbed);

													var randomInt = Math.floor(Math.random() * 1000) + 1;
													if(randomInt < 490) {
														//WIN
														tipbot.normalizeValue(bet, "mooncoin", misterdice)
															.then(converted => {
																// send amount (move between accounts in wallet)
																console.log(msg.author.username + " won a bet of: " + bet);
																tipbot.wallet.Move(msg.author, converted.newValue, misterdice)
																	.then(responses => {
																		var richEmbed = new Discord.RichEmbed()
																			.setDescription("The coin landed on **" + choice + "**\n\nCongratulations " + msg.author.username + ", you have just won **" + bet + " mooncoin**!")
																			.setColor(0x00AE86)
																			.setTimestamp();
																		msg.channel.sendEmbed(richEmbed);
																	})
																	.catch(err => {
																		debug('ERROR: cannot process bet')
																		// warn sender about the error
																		// response to sender: send thanks and new ballance
																		var richEmbed = new Discord.RichEmbed()
																			.setDescription("Oops something went wrong, no funds have been transferred!")
																			.setColor(0x00AE86)
																			.setTimestamp();
																		msg.channel.sendEmbed(richEmbed)
																		return;
																	})
															})
															.catch(errTxt => {
																	msg.channel.sendMessage(errTxt);
																return;
															})

													} else {
														// LOSE
														if(choice == 'heads') {
															var result = 'tails';
														} else {
															var result = 'heads';
														}

														var richEmbed = new Discord.RichEmbed()
															.setDescription("The coin landed on **" + result + "**\n\nSorry " + msg.author.username + ", you have lost **" + bet + " mooncoin**!")
															.setColor(0x00AE86)
															.setTimestamp();
														msg.channel.sendEmbed(richEmbed);

													}
												})
												.catch(err => {
														debug('ERROR: cannot process bet')
													// warn sender about the error
													// response to sender: send thanks and new ballance
													var richEmbed = new Discord.RichEmbed()
														.setDescription("Oops something went wrong, no funds have been transferred!")
														.setColor(0x00AE86)
														.setTimestamp();
													msg.channel.sendEmbed(richEmbed)
													return;
												})
										})
										.catch(errTxt => {
											msg.channel.sendMessage(errTxt);
										})

								}
							})
							.catch(err => {
								console.log("FAAL")
								debug('ERROR: cannot check user balance')
								var richEmbed = new Discord.RichEmbed()
									.setDescription("Oops something went wrong with checking your balance")
									.setColor(0x00AE86)
									.setTimestamp();
								msg.channel.sendEmbed(richEmbed)
								return;
							})
					}
				})
				.catch(err => {
					console.log("FAAL")
					debug('ERROR: cannot check bankroll')
					var richEmbed = new Discord.RichEmbed()
						.setDescription("Oops something went wrong with checking the bankroll balance")
						.setColor(0x00AE86)
						.setTimestamp();
					msg.channel.sendEmbed(richEmbed)
					return;
				})
		}
	},
    "tip": {
        usage: "<user> <amount to tip>",
        description: "Make an user happy with some Mooncoins",
        process: function(bot, msg, suffix) {
            if(!suffix){
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Don't forget to include the user and tip amount!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
                return;
            }

            console.log(suffix);

            var args = suffix.split(' ');

            if(args.length < 2) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Don't forget to include the user and tip amount!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
                return;
            }

            var user = args.shift();
            var amount = args.shift();

			if(amount == "") {
				amount = args.shift();
			}

			amount = convertNumber(amount);


            console.log(user);

            if(user.startsWith('<@')){
                user = user.substr(2,user.length-3);
            } else {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Please input the username with the @ selector so we don't send your MoonCoins to the wrong guy!")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
				return;
            }
            console.log(user);
            if(user.startsWith('!')){
                user = user.substr(1,user.length-1);
            }

            if(msg.author.id == user) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Don't tip yourself fool! Why not tip someone else, @Tip Bot maybe? :100:")
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
				return;
			}

            console.log(user);

            var mentioned = msg.channel.guild.members.get(user)['user'];

			if(mentioned.id == '181790539031642114') {
				msg.author.locked = false;
			}

            console.log(mentioned);
            if(isNaN(amount)) {
				var richEmbed = new Discord.RichEmbed()
					.setDescription("Please enter the amount you want to tip " + mentioned.username)
					.setColor(0x00AE86)
					.setTimestamp();
				msg.channel.sendEmbed(richEmbed)
                return;
            }

            console.log("***");

            console.log(msg.author);
			console.log("***");

            tipbot.normalizeValue(amount, "mooncoin", msg.author)
                .then(converted => {
                // send amount (move between accounts in wallet)
                    console.log(mentioned.username + " got a tip of amount: " + amount + " from: " + msg.author.username);
                    tipbot.wallet.Move(mentioned, converted.newValue, msg.author)
                        .then(responses => {
                        	// msg.react(":money_mouth:");
                            // msg.react(":star2:");
                            // response in public channel:  announce tip
							if(mentioned.id == bot.user.id) {
								var richEmbed = new Discord.RichEmbed()
									.setDescription("Thank you very much for your generous donation! :rocket:")
									.setColor(0x00AE86)
									.setTimestamp();
								msg.channel.sendEmbed(richEmbed);
								// response to sender: send thanks and new balance
								msg.author.sendMessage(responses.privateToSender);

								var jasper = msg.channel.guild.members.get("181790539031642114")['user'];
								var richEmbedDM = new Discord.RichEmbed()
									.setDescription(msg.author.username + " has just donated " + amount + " mooncoin! :rocket:")
									.setColor(0x00AE86)
									.setTimestamp();
								jasper.sendEmbed(richEmbedDM);

							} else {
								var richEmbed = new Discord.RichEmbed()
									.setDescription(responses.public)
									.setColor(0x00AE86)
									.setTimestamp();
								msg.channel.sendEmbed(richEmbed);
								// response to sender: send thanks and new balance
								msg.author.sendMessage(responses.privateToSender);
								// response to reciever:  inform of the tip
								mentioned.sendMessage(responses.privateToReciever);
							}
                        })
                        .catch(err => {
                            debug('ERROR: cannot send ' + converted.newValue + ' to ' + mentioned.username + '(' + mentioned.id + ') : ' + err)
                            // warn sender about the error
                            // response to sender: send thanks and new ballance
                            msg.author.sendMessage(err);
                            return;
                        })
                })
                .catch(errTxt => {
                    msg.channel.sendMessage(errTxt);
                })
        }
    },
    "ping": {
        description: "responds pong, useful for checking if bot is alive",
        process: function(bot, msg, suffix) {
            msg.channel.sendMessage( msg.author+" pong!");
            if(suffix){
                msg.channel.sendMessage( "note that !ping takes no arguments!");
            }
        }
    },
	"msg": {
		usage: "<user> <message to leave user>",
		description: "leaves a message for a user the next time they come online",
		process: function(bot,msg,suffix) {
			var args = suffix.split(' ');
			var user = args.shift();
			var message = args.join(' ');
			if(user.startsWith('<@')){
				user = user.substr(2,user.length-3);
			}
			var target = msg.channel.guild.members.find("id",user);
			if(!target){
				target = msg.channel.guild.members.find("username",user);
			}
			messagebox[target.id] = {
				channel: msg.channel.id,
				content: target + ", " + msg.author + " said: " + message
			};
			updateMessagebox();
			msg.channel.sendMessage("message saved.")
		}
	}
};

// if(AuthDetails.hasOwnProperty("client_id")){
// 	commands["invite"] = {
// 		description: "generates an invite link you can use to invite the bot to your server",
// 		process: function(bot,msg,suffix){
// 			msg.channel.sendMessage("invite link: https://discordapp.com/oauth2/authorize?&client_id=" + AuthDetails.client_id + "&scope=bot&permissions=470019135");
// 		}
// 	}
// }


try{
	messagebox = require("./messagebox.json");
} catch(e) {
	//no stored messages
	messagebox = {};
}
function updateMessagebox(){
	require("fs").writeFile("./messagebox.json",JSON.stringify(messagebox,null,2), null);
}

var bot = new Discord.Client();

bot.on("ready", function () {
	console.log("Logged in! Serving in " + bot.guilds.array().length + " servers");
	require("./plugins.js").init();
	console.log("type "+Config.commandPrefix+"help in Discord for a commands list.");
	bot.user.setGame(Config.commandPrefix+"help | " + bot.guilds.array().length +" Servers");

	if (tipbot === null) {
		debug('tipbot:bot')('******** Setup TipBot ********')
		// load TipBot after mongoose model is loaded
		var TipBot = require('./lib/tipbot')
		tipbot = new TipBot(bot, RPC_USER, RPC_PASSWORD, RPC_PORT, TIPBOT_OPTIONS)
	}
});

bot.on("disconnected", function () {

	console.log("Disconnected!");
	process.exit(1); //exit node.js with an error

});

function checkMessageForCommand(msg, isEdit) {
	//check if message is a command
	if(msg.author.id != bot.user.id && (msg.content.startsWith(Config.commandPrefix))){
        console.log("treating " + msg.content + " from " + msg.author + " as command");
		var cmdTxt = msg.content.split(" ")[0].substring(Config.commandPrefix.length);
        var suffix = msg.content.substring(cmdTxt.length+Config.commandPrefix.length+1);//add one for the ! and one for the space

		/*
        if(msg.isMentioned(bot.user)){
			try {
				console.log(cmdTxt);
				console.log(suffix);
				console.log("Man command");
				cmdTxt = msg.content.split(" ")[1];
				suffix = msg.content.substring(bot.user.mention().length+cmdTxt.length+Config.commandPrefix.length+1);
				console.log("Done");
				console.log(cmdTxt);
				console.log(suffix);
			} catch(e){ //no command
				msg.channel.sendMessage("Yes?");
				return;
			}
        }
        */
		var cmd = commands[cmdTxt];
        if(cmdTxt === "help"){
            //help is special since it iterates over the other commands
						if(suffix){
							var cmds = suffix.split(" ").filter(function(cmd){return commands[cmd]});
							var info = "";
							for(var i=0;i<cmds.length;i++) {
								var cmd = cmds[i];
								info += "**"+Config.commandPrefix + cmd+"**";
								var usage = commands[cmd].usage;
								if(usage){
									info += " " + usage;
								}
								var description = commands[cmd].description;
								if(description instanceof Function){
									description = description();
								}
								if(description){
									info += "\n\t" + description;
								}
								info += "\n"
							}
							msg.channel.sendMessage(info);
						} else {
							var richEmbed = new Discord.RichEmbed()
								.setDescription("So you want to tip other users? Awesome! Type `!deposit` to get a private deposit address to top up your tip wallet.\n\nThen, use `!tip @user [amount]` to make somebody happy! Like `!tip @Jasper#4463 1337`.\n\nIf you happen to receive a big ass tip from someone and you wanna cash it out; just use `!withdraw`.\n\nFurther info has been sent as a DM!")
								.setColor(0x00AE86)
								.setTimestamp();
							msg.channel.sendEmbed(richEmbed);
							msg.author.sendMessage("**Available Commands:**").then(function(){
								var batch = "";
								var sortedCommands = Object.keys(commands).sort();
								for(var i in sortedCommands) {
									var cmd = sortedCommands[i];
									var info = "**"+Config.commandPrefix + cmd+"**";
									var usage = commands[cmd].usage;
									if(usage){
										info += " " + usage;
									}
									var description = commands[cmd].description;
									if(description instanceof Function){
										description = description();
									}
									if(description){
										info += "\n\t" + description;
									}
									var newBatch = batch + "\n" + info;
									if(newBatch.length > (1024 - 8)){ //limit message length
										msg.author.sendMessage(batch);
										batch = info;
									} else {
										batch = newBatch
									}
								}
								if(batch.length > 0){
									msg.author.sendMessage(batch);
								}
						});
					}
        }
		else if(cmd) {
			if(Permissions.checkPermission(msg.author,cmdTxt)){
				try{
					cmd.process(bot,msg,suffix,isEdit);
				} catch(e){
					var msgTxt = "command " + cmdTxt + " failed :(";
					if(Config.debug){
						 msgTxt += "\n" + e.stack;
					}
					msg.channel.sendMessage(msgTxt);
				}
			} else {
				msg.channel.sendMessage("You are not allowed to run " + cmdTxt + "!");
			}
		} else {
			//msg.channel.sendMessage(cmdTxt + " not recognized as a command!").then((message => message.delete(5000)))
		}
	} else {
		//message isn't a command or is from us
        //drop our own messages to prevent feedback loops
        if(msg.author == bot.user){
            return;
        }

        if (msg.author != bot.user && msg.isMentioned(bot.user)) {
                msg.channel.sendMessage(msg.author + ", you called?");
        } else {

				}
    }
}

bot.on("message", (msg) => checkMessageForCommand(msg, false));
bot.on("messageUpdate", (oldMessage, newMessage) => {
	checkMessageForCommand(newMessage,true);
});

//Log user status changes
bot.on("presence", function(user,status,gameId) {
	//if(status === "online"){
	//console.log("presence update");
	console.log(user+" went "+status);
	//}
	try{
	if(status != 'offline'){
		if(messagebox.hasOwnProperty(user.id)){
			console.log("found message for " + user.id);
			var message = messagebox[user.id];
			var channel = bot.channels.get("id",message.channel);
			delete messagebox[user.id];
			updateMessagebox();
			bot.sendMessage(channel,message.content);
		}
	}
	}catch(e){}
});


exports.addCommand = function(commandName, commandObject){
    try {
        commands[commandName] = commandObject;
    } catch(err){
        console.log(err);
    }
}
exports.commandCount = function(){
    return Object.keys(commands).length;
}
if(AuthDetails.bot_token){
	console.log("logging in with token");
	bot.login(AuthDetails.bot_token);
} else {
	console.log("Logging in with user credentials is no longer supported!\nYou can use token based log in with a user account, see\nhttps://discord.js.org/#/docs/main/master/general/updating");
}
