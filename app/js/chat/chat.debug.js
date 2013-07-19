/*
 * Combine
 * Multiple files combined into one.
 * http://www.smallsharptools.com/Projects/Packer/
*/

// chat.js
/**
 * Sanep 2013
 */

Chat = function() {
	"use strict";
	this.Events = new Chat.Events(this);
	this.ContextMenus = new Chat.ContextMenus(this);
	this.Games = new Chat.Games(this);
	this.Messages = new Chat.Messages(this);
	this.Tabs = new Chat.Tabs(this);
	
	this.socket = null;
	this.firstConnect = true;
	this.username = "Me";
	this.connected = false;
	this.msgWindow = null;
	this.userList = null;
	this.chatInput = null;
	this.chatInputText = null;
	this.chatInputButton = null;
	// Option to use tabs for challenges instead of pop-up windows
	this.GAMETABS = false;
	// list of channels the user is currently on
	this.channels = [];
	// userlists on each channel
	this.users = [];
	
	this.init = function() {
		this.Events.init();
	};
	
	// Create the graphic elements of the chat
	this.createChatUI = function() {
		var self = this;
		
		var chatDiv = $('#chat');
		$('#chat').empty();
		
		this.Tabs.tabs = $('<div>', {
		id: 'tabs',
		}).appendTo(chatDiv);
		
		this.msgWindow = $('<div>', {
		id: 'msgWindow',
		}).appendTo(chatDiv);
		
		this.userList = $('<div>', {
		id: 'userList',
		}).appendTo(chatDiv);
		
		this.chatInput = $('<div>', {
		id: 'chatInput',
		}).appendTo(chatDiv);
		
		this.chatInputText = $('<input>', { type: 'text',
		id: 'chatInputText'
		}).appendTo(this.chatInput);
		
		this.chatInputText.bind("enterKey",function(e){
			self.Messages.sendMessage(self.chatInputText);
		});
		this.chatInputText.keyup(function(e) {
			if (e.keyCode == 13) {
				$(this).trigger("enterKey");
			}
		});
		if (self.connected == false) {
			self.chatInputText.attr("disabled", true);
		}
		
		this.chatInputButton = $('<input>', { type: 'button',
		id: 'chatInputButton',
		value: 'Send'
		}).appendTo(this.chatInput);
		this.chatInputButton.on("click", function() {
			self.Messages.sendMessage(self.chatInputText);
		});
		
		this.Tabs.updateTabs();
		if (this.Tabs.currentTab != null && this.Tabs.currentTab.type == this.Tabs.TAB_CHANNEL) {
			this.Tabs.changeToChannelTab(this.Tabs.currentTab.channel, true);
		} else if (this.Tabs.currentTab != null && this.Tabs.currentTab.type == this.Tabs.TAB_GAME) {
			this.Tabs.changeToGameTab(this.Tabs.currentTab.creator, this.Tabs.currentTab.key);
		} else if (this.currentTab == null) {
			this.Tabs.updateUserList("");
			this.Tabs.updateMessageList("");
		}
	};
	
	this.joinChannel = function(channel) {
		if (this.channels.indexOf(channel) == -1) {
			this.socket.emit('joinChannel', channel);
		}
	};

	this.executeCommand = function(element) {
		var words = element.val().split(" ");
		var command = words[0].substr(1).toLowerCase();
		if (command == "help") {
			this.Messages.addMessage({type: "current"}, {time: new Date(), type: "notice", 
			msg: "The commands are: help, join, leave, cancel, close"});
			this.Tabs.updateCurrentTab();
			element.val("");
		} else if (command == "join") {
			if (words.length == 2) {
				if (this.channels.indexOf(words[1]) == -1) {
					this.joinChannel(words[1]);
					element.val("");
				}
			}
		} else if (command == "leave") {
			if (this.Tabs.currentTab != null &&
			this.Tabs.currentTab.type == this.Tabs.TAB_CHANNEL) {
				this.socket.emit("leaveChannel", this.Tabs.currentTab.channel);
				this.Tabs.deleteCurrentTab();
				element.val("");
			}
		} else if (command == "cancel") {
			if (this.Tabs.currentTab.type == this.Tabs.TAB_GAME) {
				if (this.Tabs.currentTab.creator != this.username) {
					this.socket.emit("cancelChallenge", this.Tabs.currentTab.creator, 
					this.Tabs.currentTab.key);
					delete this.games[this.Tabs.currentTab.creator][this.Tabs.currentTab.key];
					this.Tabs.deleteCurrentTab();
					element.val("");
				}
			}
		} else if (command == "close") {
			if (this.Tabs.currentTab.type == this.Tabs.TAB_GAME) {
				if (this.Tabs.currentTab.creator == this.username) {
					this.Games.closeGame(this.currentTab.key);
					this.Tabs.deleteCurrentTab();
					element.val("");
				}
			}
		}
	};
	
	this.userEntryExists = function(channel, user) {
		return typeof this.users[channel][user] != "undefined";
	};
	
	this.getUser = function(channel, user) {
		return this.users[channel][user];
	};
	
	this.createUser = function(channel, user, userdata) {
		this.users[channel][user] = userdata;
	};
	
	this.deleteUser = function(channel, username) {
		delete this.users[channel][user];
	};
	
	this.createUserEntry = function(channel) {
		if (typeof this.users[channel] == "undefined") {
			this.users[channel] = new Array();
		}
	};
	
};

// chat.contextmenus.js
/**
 * Sanep 2013
 */

Chat.ContextMenus = function(chat) {
	"use strict";
	this.createContextMenus = function() {
		this.createUserMenu();
		this.createChallengeResponseMenu();
	};
	
	this.createUserMenu = function() {
		var self = this;
		$.contextMenu(
			{
				selector: '.chatuser:not(.chat_userself)', 
				build: function($trigger) {
					var username = $trigger.attr("id").substr(5);
					var options = {
						callback: function(key, options) {
							self.userMenuCallback(key, options, username);
						},
						items: {}
					};
					
					options.items.challenge = {name: "New challenge"};
					// create menu for challenge invitations that can be cancelled
					if (chat.Games.userHasChallenges(username)) {
						var challenges = {};
						var properties = false;
						for (var challenge in chat.Games.getMyChallengesToUser(username)) {
							if (chat.Games.getMyChallenge(username, challenge) == true) {
								challenges["cancel-"+challenge] = {name: "Cancel #"+challenge };
								properties = true;
							}
						}
						if (properties == true) {
							options.items.cancelchallenges = {name: "Cancel challenge", items: challenges};
						}
					}
					
					/* if games already exist and the current user isn't in all of them,
					 * show option to invite to existing game */
					if (chat.Games.userGamesDefined(chat.username)) {
						var existing = {};
						var properties = false;
						for (var game in chat.Games.getUserGames(chat.username)) {
							if (!chat.Games.doesChallengeByMeExist(username, game)
							&& chat.Games.getGameParticipants(chat.username, game).indexOf(username) == -1) {
								existing["invite-"+game] = {name: "Invite to #"+game };
								properties = true;
							}
						}
						if (properties == true) {
							options.items.invite = {name: "Invite to existing challenge", items: existing};
						}
					}
					
					return options;
				}
			}
		);
	};
	
	this.userMenuCallback = function(key, options, username) {
		if (key == "challenge") {
			if (!options.$trigger.hasClass('chat_userself')) {
				chat.socket.emit('createChallenge', chat.Tabs.currentTab.channel, username);
			}
		} else if (key.substr(0, 6) == "invite") {
			var gamekey = key.substr(7);
			chat.socket.emit('inviteToExistingChallenge', chat.Tabs.currentTab.channel, username, gamekey);
			chat.Games.createEntryIfndef("challenged", username);
			chat.Games.setChallengedByMe(username, gamekey, true);
			chat.Games.addGameInvited(chat.username, gamekey, 1);
		} else if (key.substr(0, 6) == "cancel") {
			var gamekey = key.substr(7);
			chat.socket.emit('cancelInvitation', username, gamekey);
			if (chat.Games.doesChallengeByMeExist(username, gamekey)) {
				chat.Games.deleteMyChallengeToUser(username, gamekey);
				chat.Games.addGameInvited(chat.username, gamekey, -1);
			} else {
				chat.Games.removeParticipant(chat.username, gamekey, username);
			}
			/* close game if the user was the only invited person
			 * and nobody had joined the game yet */
			chat.Games.checkGameCloseEvent(gamekey);
		}
	};
	
	this.createChallengeResponseMenu = function() {
		var self = this;
		$.contextMenu(
			{
				selector: '.challenge', 
				callback: function(key, options) {
					var username = options.$trigger.data("challenger");
					var gamekey = options.$trigger.data("key");
					if (key == "acceptChallenge") {
						chat.socket.emit('acceptChallenge', username, gamekey);
					} else if (key == "refuseChallenge") {
						chat.socket.emit('refuseChallenge', username, gamekey);
					}
				},
				items: {
					"acceptChallenge": {name: "Accept", 
					disabled: function(key, opt) {
						var username = opt.$trigger.data("challenger");
						var gamekey = opt.$trigger.data("key");
						
						var challengeExists = chat.Games.doesChallengeExist(username, gamekey);
						var inOptions = chat.Games.isGameDefined(username, gamekey);
						
						return !challengeExists || inOptions;
					}},
					"refuseChallenge": {name: "Refuse",
					disabled: function(key, opt) {
						var username = opt.$trigger.data("challenger");
						var gamekey = opt.$trigger.data("key");
						
						var challengeExists = chat.Games.doesChallengeExist(username, gamekey);
						var inOptions = chat.Games.isGameDefined(username, gamekey);
						
						return !challengeExists || inOptions;
					}}
				}
			}
		);
	
	};
};

// chat.events.js
/**
 * Sanep 2013
 */

Chat.Events = function(chat) {
	"use strict";
	this.init = function() {
		var self = this;
		chat.createChatUI();
		chat.ContextMenus.createContextMenus();
		if (chat.connected == false) {
		
			chat.socket = io.connect("http://"+window.location.host+"/chat");
			chat.socket.on('connect', function() {
				chat.connected = true;
				self.initChatEvents();
				chat.chatInputText.attr("disabled", false);
				chat.Messages.messages[""] = new Array();
				chat.joinChannel("main");
				chat.joinChannel("main2");
			});
			
			chat.socket.on('error', function() {
				chat.Messages.addMessage({type: "current"}, {type: "notice", msg: "Login to enter chat"});
				chat.Tabs.updateCurrentTab();
			});
		
		} else {
			chat.Tabs.updateTabs();
		}
	};
	
	this.initChatEvents = function() {
		var self = this;
		
		chat.socket.on('disconnect', function() {
			chat.Games.challenges = {};
			chat.Games.challenged = {};
			for (var user in chat.Games.games) {
				for (var key in chat.Games.games[user]) {
					if (typeof chat.Games.getGame(user, key).window != "undefined") {
						// delete event listener because the normal functionality can't be used
						chat.Games.getGame(user, key).window.unbind("dialogclose");
						chat.Games.getGame(user, key).window.dialog("close");
					}
				}
				chat.Games.deleteGames(user);
			}
		});
		
		chat.socket.on('username', function(username) {
			chat.username = username;
		});
	
		chat.socket.on('messageDelivered', function(channel, status){
			chat.chatInputText.attr("disabled", false);
			if (status == true) {
				chat.Messages.addChatMessage(channel, chat.username, chat.chatInputText.val(), "normal");
				if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL &&
				chat.Tabs.currentTab.channel == channel) {
					chat.Tabs.updateMessageList(channel);
				}
			}
			chat.chatInputText.val("");
		});
		
		chat.socket.on('notOnChannel', function(channel) {
			chat.chatInputText.attr("disabled", false);
			chat.chatInputText.val("");
		});
		
		chat.socket.on('gameMessageDelivered', function(creator, key){
		
			//Todo: better solution needed: both of the types could be used
			var source = null;
			if (chat.GAMETABS == true) {
				source = chat.chatInputText;
			} else {
				source = chat.Games.getGame(creator, key).textInput;
			}
			source.attr("disabled", false);
			chat.Games.getGame(creator, key).chatMessages.push({time: new Date(), sender: chat.username, 
			msg: source.val(), type: "normal"});
			source.val("");
			
			if (chat.GAMETABS == false) {
				chat.Tabs.updateGameMessageList(chat.Games.getGame(creator, key).chatDiv, creator, key);
			}
			
			if (chat.GAMETABS == true) {
				if (chat.Tabs.currentTab.type == chat.Tabs.TAB_GAME 
				&& chat.Tabs.currentTab.creator == creator 
				&& chat.Tabs.currentTab.key == key) {
					chat.Tabs.updateGameMessageList(chat.msgWindow, creator, key);
				}
			}
		});
		
		chat.socket.on('gameMessage', function(creator, key, userdata, message) {
			if (chat.Games.isGameDefined(creator, key)) {
				chat.Games.getGame(creator, key).chatMessages.push({time: new Date(), sender: userdata.username, msg: message, type: "normal"});
				
				if (chat.GAMETABS == false) {
					chat.Tabs.updateGameMessageList(chat.Games.getGame(creator, key).chatDiv, creator, key);
				}
				if (chat.GAMETABS == true) {
					if (chat.Tabs.currentTab.type == chat.Tabs.TAB_GAME 
					&& chat.Tabs.currentTab.creator == creator 
					&& chat.Tabs.currentTab.key == key) {
						chat.Tabs.updateGameMessageList(chat.msgWindow, creator, key);
					}
				}
			}
		});
		
		chat.socket.on('chatMessage', function(channel, userdata, message) {
			chat.Messages.addChatMessage(channel, userdata.username, message, "normal");
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL
			&& chat.Tabs.currentTab.channel == channel) {
				chat.Tabs.updateMessageList(channel);
			}
		});
		
		chat.socket.on('challengeCreated', function(user, key) {
			chat.Games.createEntryIfndef("challenged", user);
			chat.Games.createEntryIfndef("games", chat.username);
			chat.Games.createGame(chat.username, key, 
			{empty: true, participants: [], invited: 1, chatMessages: []});
			chat.Games.setChallengedByMe(user, key, true);
		});
		
		chat.socket.on('newChallenge', function(channel, user, key) {
			chat.Games.createEntryIfndef("challenges", user);
			chat.Games.setChallenged(user, key, true);
			chat.Messages.addMessage({type: "current"}, {type: "challenge", challenger: user, key: key});
			chat.Tabs.updateCurrentTab();
		});
		
		// Creator of the challenge closed the challenge
		chat.socket.on('challengeClosed', function(user, key) {
			if (typeof chat.Games.getGame(user, key).window != "undefined") {
				chat.Games.getGame(user, key).window.dialog("close");
			}
			if (chat.GAMETABS == true) {
				chat.Tabs.deleteTab({type: self.Tabs.TAB_GAME, creator: user, key: key});
			}
			chat.Games.deleteGame(user, key);
			chat.Messages.addMessage({type: "current"}, {type: "gameClosed", creator: user});
			chat.Tabs.updateCurrentTab();
		});
		
		// confirmation that the challenge was closed successfully
		chat.socket.on('challengeCloseSuccessful', function(key) {});
		
		// one of the participants cancelled the challenge
		chat.socket.on('challengeCancelled', function(user, key, leaver) {
		
			var closed = false;
			if (user == chat.username) {
				// Sent challenges:
				// if every participant cancels, close the game
				chat.Games.removeParticipant(chat.username, key, leaver);
				closed = chat.Games.checkGameCloseEvent(key);

				// delete challenge record
				if (chat.Games.doesChallengeByMeExist(leaver, key)) {
					chat.Games.deleteMyChallengeToUser(leaver, key);
				}
				chat.Messages.addMessage({type: "current"}, {type: "challengeCancelled", participant: leaver});
			} else {
				// if the game isn't user's own, it means that one of the other participants left
				chat.Games.removeParticipant(user, key, leaver);
			}
			if (chat.GAMETABS == false && closed == false) {
				chat.Tabs.updateChallengeWindow(user, key);
			}
			chat.Tabs.updateCurrentTab();
		});
		
		// Confirmation that the challenge was cancelled successfully
		chat.socket.on('cancelSuccessful', function(user, key) {});
		
		// Game creator cancelled invite for current user
		chat.socket.on('invitationCancelled', function(user, key) {
			// remove challenge
			chat.Games.deleteChallenge(user, key);
			// delete game data if the invitation was already accepted
			if (chat.Games.isGameDefined(user, key)) {
				chat.Games.getGame(user, key).window.dialog("close");
				chat.Games.deleteGame(user, key);
			}
			chat.Tabs.addMessage({type: "current"}, {type: "invitationCancelled", creator: user});
			chat.Tabs.updateCurrentTab();
		});
		
		// New participant on challenge
		chat.socket.on('challengeAccepted', function(user, key, joiner) {
			if (chat.username == user) {
				chat.Games.addGameInvited(chat.username, key, -1);
				chat.Messages.addMessage({type: "current"}, {type: "challengeAccepted", challenger: joiner});
				chat.Tabs.updateCurrentTab();
				// create window only if it hasn't been already created
				if (chat.Games.getGame(chat.username, key).empty == true) {
					if (chat.GAMETABS == false) {
						chat.Games.createChallengeWindow(chat.username, key);
					}
					if (chat.GAMETABS == true) {
						chat.Tabs.createGameTab(chat.username, key, false);
					}
					chat.Games.getGame(chat.username, key).empty = false;
				}
				
			} else {
				//Todo: other kind of message
			}
			chat.Games.getGameParticipants(user, key).push(joiner);
			if (chat.GAMETABS == false) {
				chat.Games.updateChallengeWindow(user, key);
			}
			if (chat.GAMETABS == true && chat.Tabs.currentTab.type == chat.Tabs.TAB_GAME
			&& chat.Tabs.currentTab.creator == user && chat.Tabs.currentTab.key == key) {
				chat.Tabs.updateCurrentTab();
			}
		});
		
		// Game creator: invited user refused challenge
		// This doesn't currently close the game if the only invited user refused
		chat.socket.on('challengeRefused', function(user, key) {
			chat.Games.setChallengedByMe(user, key, false);
			chat.Games.addGameInvited(chat.username, key, -1);
			chat.Messages.addMessage({type: "current"}, {type: "challengeRefused", challenger: user});
			chat.Tabs.updateCurrentTab();
		});
		
		// current participant receives data about the challenge
		chat.socket.on('challengeData', function(user, key, data) {
			chat.Games.createEntryIfndef("games", user);
			if (!chat.Games.isGameDefined(user, key)) {
				chat.Games.createGame(user, key, {empty: true, chatMessages: []});
			}
			if (chat.Games.getGame(user, key).empty == true) {
				if (chat.GAMETABS == false) {
					chat.Games.createChallengeWindow(user, key);
				}
				if (chat.GAMETABS == true) {
					chat.Tabs.createGameTab(user, key, false);
				}
				chat.Games.getGame(user, key).empty = false;
			}
				
			if (typeof data.participants != "undefined") {
				chat.Games.setGameParticipants(user, key, data.participants)
			}
			if (chat.GAMETABS == false) {
				chat.Games.updateChallengeWindow(user, key);
			}
			if (chat.GAMETABS == true && chat.Tabs.currentTab.type == chat.Tabs.TAB_GAME
			&& chat.Tabs.currentTab.creator == user && chat.Tabs.currentTab.key == key) {
				chat.Tabs.updateCurrentTab();
			}
		});
		
		chat.socket.on('channelJoinSuccessful', function(channel) {
			chat.channels.push(channel);
			chat.Messages.createMessagesEntry(channel);
			chat.createUserEntry(channel);
			chat.Tabs.createChannelTab(channel, false);
			chat.Tabs.changeToChannelTab(channel, false);
		});
		
		chat.socket.on('userJoin', function(channel, user){
			chat.Messages.addChatMessage(channel, "", 
			"User " + user.username + " joined the channel", "notice");
			chat.createUser(channel, user.username, user);
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL 
			&& chat.Tabs.currentTab.channel == channel) {
				chat.Tabs.updateMessageList(channel);
				chat.Tabs.updateUserList(channel);
			}
		});
		
		chat.socket.on('userLeave', function(channel, user){
			chat.Messages.addChatMessage(channel, "", 
			"User " + user.username + " left the channel", "notice");
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL 
			&& chat.Tabs.currentTab.channel == channel) {
				chat.Tabs.updateMessageList(channel);
				chat.Tabs.updateUserList(channel);
			}
			chat.deleteUser(channel, user.username);
		});
		
		chat.socket.on('userDisconnect', function(channel, user){
			chat.Messages.addChatMessage(channel, "", "User " + user.username + " left the chat",
			"notice");
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL 
			&& chat.Tabs.currentTab.channel == channel) {
				chat.Tabs.updateMessageList(channel);
			}

			chat.Games.deleteChallenges(user);
			chat.Games.deleteMyChallengesToUser(user);
			
			for (var chan in Chat.users) {
				if (chat.userEntryExists(chan, user.username)) {
					chat.deleteUser(chan, user.username);
					if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL 
					&& chat.Tabs.currentTab.channel == channel) {
						chat.Tabs.updateUserList(channel);
					}
				}
			}
		});
		
		// user receives channel user list after joining
		chat.socket.on('userList', function(channel, userlist) {
			chat.users[channel] = {};
			chat.users[channel] = userlist;
			chat.Tabs.updateUserList(channel);
		});
	};
	
};

// chat.games.js
/**
 * Sanep 2013
 */

Chat.Games = function(chat) {
	"use strict";
	// the challenges received from other users
	this.challenges = [];
	// other users that the user has challenged
	this.challenged = [];
	// information for challenges that have been accepted
	this.games = [];

	this.getGame = function(creator, key) {
		return this.games[creator][key];
	};
	
	this.createGame = function(creator, key, gamedata) {
		if (typeof this.games[creator] == "undefined") {
			this.games[creator] = {};
		}
		this.games[creator][key] = gamedata;
	};
	
	this.deleteGame = function(creator, key) {
		delete this.games[creator][key];
	};
	
	this.deleteGames = function(creator) {
		delete this.games[creator];
	};
	
	this.userGamesDefined = function(creator) {
		return typeof this.games[creator] != "undefined";
	};
	
	this.getUserGames = function(creator) {
		return this.games[creator];
	};
	
	this.isGameDefined = function(creator, key) {
		return (typeof this.games[creator] != "undefined"
		&& typeof this.games[creator][key] != "undefined");
	};
	
	this.userHasChallenges = function(username) {
		return (typeof this.challenged[username] != "undefined" 
		&& this.challenged[username].length > 0);
	};
	
	this.getChallenges = function(user, key) {
		return this.challenged[user][key];
	};
	
	this.getMyChallengesToUser = function(user) {
		return this.challenged[user];
	};
	
	this.setChallenged = function(user, game, status) {
		this.challenges[user][game] = status;
	};
	
	this.deleteChallenge = function(user, game) {
		this.challenges[user][game];
	};
	
	this.setChallengedByMe = function(user, game, status) {
		this.challenged[user][game] = status;
	};
	
	this.doesChallengeExist = function(username, gamekey) {
		return (typeof(this.challenges[username]) != "undefined" && 
				typeof(this.challenges[username][gamekey]) != "undefined" && 
				this.challenges[username][gamekey] == true);
	};
	
	this.doesChallengeByMeExist = function(username, game) {
		return (typeof this.challenged[username] != "undefined" 
				&& typeof this.challenged[username][game] != "undefined" 
				&& this.challenged[username][game] == true);
	};
	
	this.deleteMyChallengeToUser = function(user, challenge) {
		delete this.challenged[user][challenge];
	};
	
	this.deleteChallenges = function(user) {
		delete this.challenges[user];
	};
	
	this.deleteMyChallengesToUser = function(user) {
		delete this.challenged[user];
	};
	
	this.getMyChallenge = function(user, challenge) {
		return this.challenged[user][challenge];
	};
	
	this.getGameParticipants = function(user, game) {
		return this.games[user][game].participants;
	};
	
	this.setGameParticipants = function(user, game, participants) {
		this.games[user][game].participants = participants;
	};
	
	this.getGameInvited = function(user, game) {
		return this.games[user][game].invited;
	};
	
	this.addGameInvited = function(user, game, amount) {
		this.games[user][game].invited = this.games[user][game].invited + amount;
	};
	
	this.createChallengeWindow = function(user, key) {
		var challengeWindow = $('<div>', {
			title: "Game settings"
		});
		
		var userList = $('<div>', {}).appendTo(challengeWindow);
		var chatDiv = $('<div>', {}).appendTo(challengeWindow);
		var textInput = $('<input>', {type: "text"}).appendTo(challengeWindow);
		
		// Message event
		textInput.bind("enterKey",function(e){
			chat.Messages.sendGameMessage(textInput, user, key);
		});
		textInput.keyup(function(e) {
			if (e.keyCode == 13) {
				$(this).trigger("enterKey");
			}
		});
		
		this.games[user][key] = {window: challengeWindow, participants: [],
		userList: userList, chatMessages: [], chatDiv: chatDiv, textInput: textInput};
		
		var self = this;
		challengeWindow.bind('dialogclose', function(event) {
			if (typeof(self.challenges[user]) != "undefined" && 
			typeof(self.challenges[user][key]) != "undefined") {
				delete self.challenges[user][key];
			}
			// if the window is closed, it always closes the game
			if (user != chat.username) {
				chat.socket.emit("cancelChallenge", user, key);
				delete self.games[user][key];
			} else {
				//delete challenge records
				for (var participant in self.games[chat.username][key].participants) {
					delete self.challenged[self.games[chat.username][key].participants[participant]][key];
				}
				chat.socket.emit("closeChallenge", key);
			}
			delete self.games[user][key];
		});
		
		challengeWindow.dialog();
	};
	
	// Updates challenge window of certain game
	this.updateChallengeWindow = function(user, key) {
		this.games[user][key].userList.empty();
		var creator = $('<div>', { html: "Users: <br>"+user }).appendTo(this.games[user][key].userList);
		for (var i=0; i<this.games[user][key].participants.length; ++i) {
			var participant = $('<div>', { text: this.games[user][key].participants[i] }).appendTo(this.games[user][key].userList);
		}
	};

	// An user left a game
	// This keeps context menus and setup window updated
	this.removeParticipant = function(user, key, removed) {
		var index = this.games[user][key].participants.indexOf(removed);
		this.games[user][key].participants.splice(index, 1);
	};
	
	// Closes game if no participants and invites are left
	this.checkGameCloseEvent = function(key) {
		if (this.games[chat.username][key].participants.length == 0) {
			if (this.games[chat.username][key].invited > 0) {
				return false;
			}
			this.closeGame(key);
			return true;
		}
		return false;
	};
	
	// Game creator closes game
	this.closeGame = function(key) {
		if (typeof this.games[chat.username][key].window != "undefined") {
			this.games[chat.username][key].window.dialog("close");
		}
		if (this.GAMETABS == true) {
			chat.Tabs.deleteTab({type: chat.Tabs.TAB_GAME, creator: chat.username, key: key});
		}
		delete this.games[chat.username][key];
		chat.socket.emit("closeChallenge", key);
	};
	
	// helper function to reduce repetition of definition checks
	this.createEntryIfndef = function(entrytype, user) {
		if (entrytype == "challenges") {
			if (typeof(this.challenges[user]) == "undefined") {
				this.challenges[user] = [];
			}
		} else if (entrytype == "challenged") {
			if (typeof(this.challenged[user]) == "undefined") {
				this.challenged[user] = [];
			}
		} else if (entrytype == "games") {
			if (typeof(this.games[user]) == "undefined") {
				this.games[user] = [];
			}
		}
	};
	
};

// chat.messages.js
/**
 * Sanep 2013
 */

Chat.Messages = function(chat) {
	"use strict";
	// messages in each channel
	this.messages = [];
	this.messages[""] = new Array();

	this.messagesExist = function(channel) {
		return typeof this.messages[channel] != "undefined";
	};
	
	this.createMessagesEntry = function(channel) {
		if (!this.messagesExist(channel)) {
			this.messages[channel] = new Array();
		}
	};
	
	this.addMessage = function(target, data) {
		data.time = new Date();
		if (target.type == "current") {
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL) {
				this.messages[chat.Tabs.currentTab.channel].push(data);
			} else if (chat.Tabs.currentTab.type == chat.Tabs.TAB_GAME) {
				chat.Games.getGame(chat.Tabs.currentTab.creator, Chat.Tabs.currentTab.key).chatMessages.push(data);
			} else {
				this.messages[""].push(data);
			}
		} else if (target.type == "channel") {
			this.messages[target.channel].push(data);
		}
	};
	
	this.addChatMessage = function(channel, sender, message, type) {
		if (typeof this.messages[channel] == "undefined") {
			this.messages[channel] = new Array();
		}
		this.messages[channel].push({time: new Date(), sender: sender, msg: message, type: type});
	};
	
	this.sendMessage = function(element) {
		if (element.val().substr(0, 1) == "/") {
			chat.executeCommand(element);
		} else if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL) {
			chat.socket.emit('sendMessage', chat.Tabs.currentTab.channel, element.val());
			element.attr("disabled", true);
		} else if (chat.Tabs.currentTab.type == chat.Tabs.TAB_GAME) {
			chat.socket.emit('gameMessage', chat.Tabs.currentTab.creator, chat.Tabs.currentTab.key, element.val());
			element.attr("disabled", true);
		}
	};
	
	this.sendGameMessage = function(element, creator, key) {
		chat.socket.emit('gameMessage', creator, key, element.val());
		element.attr("disabled", true);
	};

	this.formatMessage = function(message) {
		var time = "["+message.time.getHours() + ":"
					+ ("0"+message.time.getMinutes()).slice(-2)+"] ";
		var formatted = "";
		if (message.type == "normal") {
			formatted = time + message.sender + ": "+ message.msg;
		} else if (message.type == "notice") {
			formatted = time + message.msg;
		} else if (message.type == "challenge") {
			formatted = time + message.challenger + " has challenged you";
		} else if (message.type == "challengeCancelled") {
			formatted = time + message.participant + " cancelled the challenge";
		} else if (message.type == "invitationCancelled") {
			formatted = time + message.creator + " cancelled challenge invitation";
		} else if (message.type == "gameClosed") {
			formatted = time + message.creator + " closed the game";
		} else if (message.type == "challengeAccepted") {
			formatted = time + message.challenger + " accepted your challenge";
		} else if (message.type == "challengeRefused") {
			formatted = time + message.challenger + " refused your challenge";
		}
		return formatted;
	};
	
};

// chat.tabs.js
/**
 * Sanep 2013
 */

Chat.Tabs = function(chat) {
	"use strict";
	this.tabs = null,
	this.tabList = [],
	this.currentTab = { type: 0 };
	// enums
	this.TAB_CHANNEL = 1;
	this.TAB_GAME = 2;
	
	this.createChannelTab = function(channel, recreate) {
		var self = this;
		var channelTab = $('<a>', {
		id: 'chat-'+channel,
		class: 'chatTab',
		text: channel
		}).appendTo(this.tabs);
		if (recreate !== true) {
			this.tabList.push({type: this.TAB_CHANNEL, channel: channel});
		}
		channelTab.on('click', function() {
			self.changeToChannelTab($(this).attr('id').substr(5), false);
		});
	};

	this.createGameTab = function(creator, key, recreate) {
		var channelTab = $('<a>', {
		class: 'chatTab',
		id: 'game-'+creator+'-'+key,
		text: creator + ":" + key
		}).appendTo(this.tabs);
		channelTab.on('click', function() {
			self.changeToGameTab(creator, key);
		});
		chat.Games.getGame(creator, key).challengeTab = true;
		if (recreate !== true) {
			self.tabList.push({type: self.TAB_GAME, creator: creator, key: key});
		}
	};
		
	this.changeToChannelTab = function(channel, init) {
		if (this.currentTab.type != this.TAB_CHANNEL 
		|| this.currentTab.channel != channel || init == true) {
			this.removeTabHighlight();
			this.updateMessageList(channel);
			this.updateUserList(channel);
			console.log("JOO: "+$("#chat-"+channel).length);
			$("#chat-"+channel).addClass("chatTabSelected");
			console.log("LISATTY?: "+$("#chat-"+channel).attr('class'));
			this.currentTab.type = this.TAB_CHANNEL;
			this.currentTab.channel = channel;
		}
	};
	
	this.changeToGameTab = function(creator, key) {
		this.removeTabHighlight();
		$("#game-"+creator+'-'+key).addClass("chatTabSelected");
		this.updateGameUserList(creator, key);
		this.updateGameMessageList(chat.msgWindow, creator, key);
		this.currentTab.type = chat.TAB_GAME;
		this.currentTab.creator = creator;
		this.currentTab.key = key;
	};
	
	this.removeTabHighlight = function() {
	console.log("POISTO");
		if (this.currentTab != null) {
			if (this.currentTab.type == this.TAB_CHANNEL) {
				$("#chat-"+this.currentTab.channel).removeClass("chatTabSelected");
			} else if (this.currentTab.type == this.TAB_GAME) {
				$("#game-"+this.currentTab.creator+"-"+this.currentTab.key).removeClass("chatTabSelected");
			}
		}
	};
	
	this.updateTabs = function() {
		this.tabs.empty();
		//$('#tabs').empty();
		for (var i=0; i<this.tabList.length; i++) {
			if (this.tabList[i].type == this.TAB_CHANNEL) {
				this.createChannelTab(this.tabList[i].channel, true);
			} else if (this.tabList[i].type == this.TAB_GAME) {
				this.createGameTab(this.tabList[i].creator, this.tabList[i].key, true);
			}
		}
	};
	
	this.updateCurrentTab = function() {
		if (this.currentTab.type == this.TAB_CHANNEL) {
			this.updateMessageList(this.currentTab.channel);
			this.updateUserList(this.currentTab.channel);
		} else if (this.currentTab.type == this.TAB_GAME) {
			this.updateGameMessageList(chat.msgWindow, this.currentTab.creator, this.currentTab.key);
			this.updateGameUserList(this.currentTab.creator, this.currentTab.key);
		} else {
			this.updateMessageList("");
			this.updateUserList("");
		}
	};
	
	this.deleteTab = function(info) {
		var found = false;
		if (this.tabList.length == 1) {
			this.currentTab = null;
			this.updateMessageList("");
			this.updateUserList("");
			return;
		}
		var id = "";
		for (var tab=0; tab<this.tabList.length; tab++) {
			if (this.tabList[tab].type == info.type) {
				if (this.tabList[tab].type == this.TAB_CHANNEL 
				&& this.tabList[tab].channel == info.channel){
					found = true;
					id = "#chat-"+this.tabList[tab].channel;
				} else if (this.tabList[tab].type == this.TAB_GAME
				&& this.tabList[tab].creator == info.creator
				&& this.tabList[tab].key == info.key) {
					found = true;
					id = "#game-"+this.tabList[tab].creator+"-"+this.tabList[tab].key;
				}
				
				if (found == true) {
					this.changeToNewTab(id, tab);
					this.updateCurrentTab();
					return;
				}
			}
		}
	};
	
	this.deleteCurrentTab = function() {
		var found = false;
		if (this.tabList.length == 1) {
			this.tabs.empty();
			this.currentTab = {type: this.TAB_CHANNEL, channel: ""};
			this.updateMessageList("");
			this.updateUserList("");
			return;
		}
		var id = "";
		for (var tab=0; tab<this.tabList.length; tab++) {
			if (this.tabList[tab].type == this.currentTab.type) {
				if (this.tabList[tab].type == this.TAB_CHANNEL 
				&& this.tabList[tab].channel == this.currentTab.channel){
					found = true;
					id = "#chat-"+this.tabList[tab].channel;
				} else if (this.tabList[tab].type == this.TAB_GAME
				&& this.tabList[tab].creator == this.currentTab.creator
				&& this.tabList[tab].key == this.currentTab.key) {
					found = true;
					id = "#game-"+this.tabList[tab].creator+"-"+this.tabList[tab].key;
				}
				
				if (found == true) {
					this.changeToNewTab(id, tab);
					this.updateCurrentTab();
					return;
				}
			}
		}
	};
	
	this.changeToNewTab = function(oldid, currentTab) {
		$(oldid).remove();
		this.tabList.splice(currentTab, 1);
		var copy = null;
		if (currentTab == 0) {
			copy = this.tabList[0];
		} else {
			copy = this.tabList[currentTab-1];
		}
		
		this.currentTab.type = copy.type;
		if (copy.type == this.TAB_CHANNEL) {
			this.currentTab.channel = copy.channel;
			$("#chat-"+this.currentTab.channel).addClass("chatTabSelected");
		} else if (copy.type == this.TAB_GAME) {
			this.currentTab.creator = copy.creator;
			this.currentTab.key = copy.key;
			$("#game-"+this.currentTab.creator+'-'+this.currentTab.key).addClass("chatTabSelected");
		}
	};
	
	this.updateMessageList = function(channel) {
	
		var onBottom = this.isScrollOnBottom(chat.msgWindow);
		
		$('#msgWindow').empty();
		if (typeof chat.Messages.messages[channel] != 'undefined') {
			for (var i=0; i<chat.Messages.messages[channel].length; ++i) {
				var time = "["+chat.Messages.messages[channel][i].time.getHours() + ":"
							+ chat.Messages.messages[channel][i].time.getMinutes()+"] ";
				
				var classes = "";
				if (chat.Messages.messages[channel][i].type == "challenge") {
					classes = "challenge";
				}
				
				var message = $('<div>', {
					text: chat.Messages.formatMessage(chat.Messages.messages[channel][i]),
					class: classes
				}).appendTo(chat.msgWindow);
				
				if (chat.Messages.messages[channel][i].type == "challenge") {
					message.data("challenger", chat.Messages.messages[channel][i].challenger);
					message.data("key", chat.Messages.messages[channel][i].key);
				}
				
			}
		}
		
		if (onBottom == true) {
			this.scrollToBottom(chat.msgWindow);
		}
	};
	
	this.updateGameMessageList = function(target, creator, key) {
	
		var onBottom = this.isScrollOnBottom(chat.msgWindow);
	
		$(target).empty();
		if (chat.Games.isGameDefined(creator, key)) {
			var messages = chat.Games.getGame(creator, key).chatMessages;
			
			for (var i=0; i<messages.length; ++i) {
				var message = $('<div>', {
					text: chat.Messages.formatMessage(messages[i])
				}).appendTo(target);
			};
		}
		
		if (onBottom == true) {
			this.scrollToBottom(chat.msgWindow);
		}
	};
	
	this.updateUserList = function(channel) {
		
		chat.userList.html("");
		chat.userList.children().remove();
		
		if (typeof chat.users[channel] != 'undefined') {
			for (var user in chat.users[channel]) {
				var userEntry = $('<div>', {
				id: 'user-'+chat.users[channel][user].username,
				class: 'chatuser',
				text: chat.users[channel][user].username
				}).appendTo(chat.userList);
				if (chat.users[channel][user].username == chat.username) {
					userEntry.addClass('chat_userself');
				}
			}
		}
	};
	
	this.updateGameUserList = function(creator, key) {
		chat.userList.html("");
		chat.userList.children().remove();
		
		if (chat.Games.isGameDefined(creator, key)) {
			var participants = chat.Games.getGame(creator, key).participants.slice();
			participants.splice(0, 0, creator);
			for (var user in participants) {
				var userEntry = $('<div>', {
				id: 'user-'+participants[user],
				class: 'chatuser',
				text: participants[user]
				}).appendTo(this.userList);
				if (participants[user] == chat.username) {
					userEntry.addClass('chat_userself');
				}
			}
		}
	};
	
	this.scrollToBottom = function(element) {
		element.scrollTop(element.prop("scrollHeight"));
	};
	
	this.isScrollOnBottom = function(element) {
		if (element.prop("scrollHeight") - element.scrollTop() == element.height()) {
			return true;
		}
		return false;
	};
	
};

