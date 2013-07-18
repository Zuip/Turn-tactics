chat = {
	socket: null,
	firstConnect: true,
	username: "Me",
	connected: false,
	tabs: null,
	tabList: [],
	msgWindow: null,
	userList: null,
	chatInput: null,
	chatInputText: null,
	chatInputButton: null,
	// Option to use tabs for challenges instead of pop-up windows
	GAMETABS: false,
	
	currentTab: { type: 0 },
	TAB_CHANNEL: 1,
	TAB_GAME: 2,
	
	// list of channels the user is currently on
	channels: [],
	// messages in each channel
	messages: [],
	// the challenges received from other users
	challenges: [],
	// other users that the user has challenged
	challenged: [],
	// information for challenges that have been accepted
	games: [],
	// userlists on each channel
	users: [],
	
	init: function() {
		var self = this;
		this.createChatUI();
		this.createContextMenus();
		if (this.connected == false) {
		
			this.socket = io.connect("http://"+window.location.host+"/chat");
			this.socket.on('connect', function() {
				self.connected = true;
				self.initChatEvents();
				self.chatInputText.attr("disabled", false);
				self.messages[""] = new Array();
				self.joinChannel("main");
				self.joinChannel("main2");
			});
			
			this.socket.on('error', function() {
				self.addMessage({type: "current"}, {type: "notice", msg: "Login to enter chat"});
				self.updateCurrentTab();
			});
		
		}

	},
	
	initChatEvents: function() {
		var self = this;
		
		this.socket.on('disconnect', function(){
			self.challenges = {};
			self.challenged = {};
			for (user in self.games) {
				for (key in self.games[user]) {
					if (typeof self.games[user][key].window != "undefined") {
						// delete event listener because the normal functionality can't be used
						self.games[user][key].window.unbind("dialogclose");
						self.games[user][key].window.dialog("close");
					}
				}
				delete self.games[user];
			}
		});
		
		this.socket.on('username', function(username) {
			self.username = username;
		});
	
		this.socket.on('messageDelivered', function(channel, status){
			self.chatInputText.attr("disabled", false);
			if (status == true) {
				self.addChatMessage(channel, self.username, self.chatInputText.val(), "normal");
				if (self.currentTab.type == self.TAB_CHANNEL &&
				self.currentTab.channel == channel) {
					self.updateMessageList(channel);
				}
			}
			self.chatInputText.val("");
		});
		
		this.socket.on('notOnChannel', function(channel) {
			self.chatInputText.attr("disabled", false);
			self.chatInputText.val("");
		});
		
		this.socket.on('gameMessageDelivered', function(creator, key){
		
			//Todo: better solution needed: both of the types could be used
			var source = null;
			if (self.GAMETABS == true) {
				source = self.chatInputText;
			} else {
				source = self.games[creator][key].textInput;
			}
			source.attr("disabled", false);
			self.games[creator][key].chatMessages.push({time: new Date(), sender: self.username, 
			msg: source.val(), type: "normal"});
			source.val("");
			
			if (self.GAMETABS == false) {
				self.updateGameMessageList(self.games[creator][key].chatDiv, creator, key);
			}
			
			if (self.GAMETABS == true) {
				if (self.currentTab.type == self.TAB_GAME && self.currentTab.creator == creator 
				&& self.currentTab.key == key) {
					self.updateGameMessageList(self.msgWindow, creator, key);
				}
			}
		});
		
		this.socket.on('gameMessage', function(creator, key, userdata, message) {
			if (typeof self.games[creator] != "undefined"
			&& typeof self.games[creator][key] != "undefined") {
				self.games[creator][key].chatMessages.push({time: new Date(), sender: userdata.username, msg: message, type: "normal"});
				
				if (self.GAMETABS == false) {
					self.updateGameMessageList(self.games[creator][key].chatDiv, creator, key);
				}
				if (self.GAMETABS == true) {
					if (self.currentTab.type == self.TAB_GAME && self.currentTab.creator == creator 
					&& self.currentTab.key == key) {
						self.updateGameMessageList(self.msgWindow, creator, key);
					}
				}
			}
		});
		
		this.socket.on('chatMessage', function(channel, userdata, message) {
			self.addChatMessage(channel, userdata.username, message, "normal");
			if (self.currentTab.type == self.TAB_CHANNEL
			&& self.currentTab.channel == channel) {
				self.updateMessageList(channel);
			}
		});
		
		this.socket.on('challengeCreated', function(user, key) {
			self.createEntryIfndef("challenged", user);
			self.createEntryIfndef("games", self.username);
			self.games[self.username][key] = {empty: true, participants: [], invited: 1, chatMessages: []};
			self.challenged[user][key] = true;
		}),
		
		this.socket.on('newChallenge', function(channel, user, key) {
			self.createEntryIfndef("challenges", user);
			self.challenges[user][key] = true;
			self.addMessage({type: "current"}, {type: "challenge", challenger: user, key: key});
			self.updateCurrentTab();
		});
		
		// Creator of the challenge closed the challenge
		this.socket.on('challengeClosed', function(user, key) {
			if (typeof self.games[user][key].window != "undefined") {
			self.games[user][key].window.dialog("close");
			}
			if (self.GAMETABS == true) {
				self.deleteTab({type: self.TAB_GAME, creator: user, key: key});
			}
			delete self.games[user][key];
			self.addMessage({type: "current"}, {type: "gameClosed", creator: user});
			self.updateCurrentTab();
		});
		
		// confirmation that the challenge was closed successfully
		this.socket.on('challengeCloseSuccessful', function(key) {});
		
		// one of the participants cancelled the challenge
		this.socket.on('challengeCancelled', function(user, key, leaver) {
		
			var closed = false;
			if (user == self.username) {
				// Sent challenges:
				// if every participant cancels, close the game
				self.removeParticipant(self.username, key, leaver);
				closed = self.checkGameCloseEvent(key);

				// delete challenge record
				if (typeof self.challenged[leaver] != "undefined"
				&& typeof self.challenged[leaver][key] != "undefined") {
					delete self.challenged[leaver][key];
				}
				self.addMessage({type: "current"}, {type: "challengeCancelled", participant: leaver});
			} else {
				// if the game isn't user's own, it means that one of the other participants left
				self.removeParticipant(user, key, leaver);
			}
			if (self.GAMETABS == false && closed == false) {
				self.updateChallengeWindow(user, key);
			}
			self.updateCurrentTab();
		});
		
		// Confirmation that the challenge was cancelled successfully
		this.socket.on('cancelSuccessful', function(user, key) {});
		
		// Game creator cancelled invite for current user
		this.socket.on('invitationCancelled', function(user, key) {
			// remove challenge
			delete self.challenges[user][key];
			// delete game data if the invitation was already accepted
			if (typeof(self.games[user]) != "undefined" 
			&& typeof(self.games[user][key]) != "undefined") {
				self.games[user][key].window.dialog("close");
				delete self.games[user][key];
			}
			self.addMessage({type: "current"}, {type: "invitationCancelled", creator: user});
			self.updateCurrentTab();
		});
		
		// New participant on challenge
		this.socket.on('challengeAccepted', function(user, key, joiner) {
			if (self.username == user) {
				self.games[self.username][key].invited--;
				self.addMessage({type: "current"}, {type: "challengeAccepted", challenger: joiner});
				self.updateCurrentTab();
				// create window only if it hasn't been already created
				if (self.games[self.username][key].empty == true) {
					if (self.GAMETABS == false) {
						self.createChallengeWindow(self.username, key);
					}
					if (self.GAMETABS == true) {
						self.createGameTab(self.username, key);
					}
					self.games[self.username][key].empty = false;
				}
				
			} else {
				//Todo: other kind of message
			}
			self.games[user][key].participants.push(joiner);
			if (self.GAMETABS == false) {
				self.updateChallengeWindow(user, key);
			}
			if (self.GAMETABS == true && self.currentTab.type == self.TAB_GAME
			&& self.currentTab.creator == user && self.currentTab.key == key) {
				self.updateCurrentTab();
			}
		});
		
		// Game creator: invited user refused challenge
		// This doesn't currently close the game if the only invited user refused
		this.socket.on('challengeRefused', function(user, key) {
			self.challenged[user][key] = false;
			self.games[self.username][key].invited--;
			self.addMessage({type: "current"}, {type: "challengeRefused", challenger: user});
			self.updateCurrentTab();
		});
		
		// current participant receives data about the challenge
		this.socket.on('challengeData', function(user, key, data) {
			self.createEntryIfndef("games", user);
			if (typeof self.games[user][key] == "undefined") {
				self.games[user][key] = {empty: true, chatMessages: []};
			}
			if (self.games[user][key].empty == true) {
				if (self.GAMETABS == false) {
					self.createChallengeWindow(user, key);
				}
				if (self.GAMETABS == true) {
					self.createGameTab(user, key);
				}
				self.games[user].empty = false;
			}
				
			if (typeof data.participants != "undefined") {
				self.games[user][key].participants = data.participants;
			}
			if (self.GAMETABS == false) {
				self.updateChallengeWindow(user, key);
			}
			if (self.GAMETABS == true && self.currentTab.type == self.TAB_GAME
			&& self.currentTab.creator == user && self.currentTab.key == key) {
				self.updateCurrentTab();
			}
		});
		
		this.socket.on('channelJoinSuccessful', function(channel) {
			self.channels.push(channel);
		
			if (typeof self.messages[channel] == "undefined") {
				self.messages[channel] = new Array();
			}
			if (typeof self.users[channel] == "undefined") {
				self.users[channel] = new Array();
			}
			
			self.createChannelTab(channel);
			self.changeToChannelTab(channel, false);
		});
		
		this.socket.on('userJoin', function(channel, user){
			self.addChatMessage(channel, "", 
			"User " + user.username + " joined the channel", "notice");
			self.users[channel][user.username] = user;
			if (self.currentTab.type == self.TAB_CHANNEL && self.currentTab.channel == channel) {
				self.updateMessageList(channel);
				self.updateUserList(channel);
			}
		});
		this.socket.on('userLeave', function(channel, user){
			self.addChatMessage(channel, "", 
			"User " + user.username + " left the channel", "notice");
			if (self.currentTab.type == self.TAB_CHANNEL && self.currentTab.channel == channel) {
				self.updateMessageList(channel);
				self.updateUserList(channel);
			}
			delete self.users[channel][user.username];
		});
		this.socket.on('userDisconnect', function(channel, user){
			self.addChatMessage(channel, "", "User " + user.username + " left the chat",
			"notice");
			if (self.currentTab.type == self.TAB_CHANNEL && self.currentTab.channel == channel) {
				self.updateMessageList(channel);
			}
			if (typeof self.challenges[user.username] != "undefined") {
				delete self.challenges[user.username];
			}
			if (typeof self.challenged[user.username] != "undefined") {
				delete self.challenged[user.username];
			}
			for (channel in self.users) {
				if (typeof self.users[channel][user.username] != "undefined") {
					delete self.users[channel][user.username];
					if (self.currentTab.type == self.TAB_CHANNEL && self.currentTab.channel == channel) {
						self.updateUserList(channel);
					}
				}
			}
		});
		
		// user receives channel user list after joining
		this.socket.on('userList', function(channel, userlist) {
			self.users[channel] = {};
			self.users[channel] = userlist;
			self.updateUserList(channel);
		});
	},
	
	// Create the graphic elements of the chat
	createChatUI: function() {
		var self = this;
		
		var chatDiv = $('#chat');
		$('#chat').empty();
		
		this.tabs = $('<div>', {
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
			self.sendMessage(self.chatInputText);
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
			self.sendMessage(self.chatInputText);
		});
		
		this.updateTabs();
		if (this.currentTab != null && this.currentTab.type == this.TAB_CHANNEL) {
			this.changeToChannelTab(this.currentTab.channel, true);
		} else if (this.currentTab == null) {
			this.updateUserList("");
			this.updateMessageList("");
		}
	},
	
	// Context menus
	createContextMenus: function() {
		var self = this;
		$.contextMenu(
			{
				selector: '.chatuser:not(.chat_userself)', 
				build: function($trigger) {
					var username = $trigger.attr("id").substr(5);
					var options = {
						callback: function(key, options) {
							if (key == "challenge") {
								if (!options.$trigger.hasClass('chat_userself')) {
									self.socket.emit('createChallenge', self.currentTab.channel, username);
								}
							} else if (key.substr(0, 6) == "invite") {
								var gamekey = key.substr(7);
								self.socket.emit('inviteToExistingChallenge', self.currentTab.channel, username, gamekey);
								self.createEntryIfndef("challenged", username);
								self.challenged[username][gamekey] = true;
								self.games[self.username][gamekey].invited++;
							} else if (key.substr(0, 6) == "cancel") {
								var gamekey = key.substr(7);
								self.socket.emit('cancelInvitation', username, gamekey);
								if (typeof (self.challenged[username]) != "undefined"
								&& typeof (self.challenged[username][gamekey]) != "undefined") {
									delete self.challenged[username][gamekey];
									self.games[self.username][gamekey].invited--;
								} else {
									self.removeParticipant(self.username, gamekey, username);
								}
								/* close game if the user was the only invited person
								 * and nobody had joined the game yet */
								self.checkGameCloseEvent(gamekey);
							}
						},
						items: {}
					};
					
					options.items.challenge = {name: "New challenge"};
					// create menu for challenge invitations that can be cancelled
					if (typeof(self.challenged[username]) != "undefined" && self.challenged[username].length > 0) {
						var challenges = {};
						var properties = false;
						for (challenge in self.challenged[username]) {
							if (self.challenged[username][challenge] == true) {
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
					if (typeof (self.games[self.username]) != "undefined") {
						var existing = {};
						var properties = false;
						for (game in self.games[self.username]) {
							if ((typeof(self.challenged[username]) == "undefined" ||
								typeof(self.challenged[username][game]) == "undefined" ||
								self.challenged[username][game] != true)
							&& self.games[self.username][game].participants.indexOf(username) == -1) {
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
		$.contextMenu(
			{
				selector: '.challenge', 
				callback: function(key, options) {
					var username = options.$trigger.data("challenger");
					var gamekey = options.$trigger.data("key");
					if (key == "acceptChallenge") {
						self.socket.emit('acceptChallenge', username, gamekey);
					} else if (key == "refuseChallenge") {
						self.socket.emit('refuseChallenge', username, gamekey);
					}
				},
				items: {
					"acceptChallenge": {name: "Accept", 
					disabled: function(key, opt) {
						var username = opt.$trigger.data("challenger");
						var gamekey = opt.$trigger.data("key");
						
						var challengeExists = (typeof(self.challenges[username]) != "undefined" && 
						typeof(self.challenges[username][gamekey]) != "undefined" && 
						self.challenges[username][gamekey] == true);
						
						var inOptions = (typeof(self.games[username]) != "undefined" && 
						typeof(self.games[username][gamekey]) != "undefined");
						return !challengeExists || inOptions;
					}},
					"refuseChallenge": {name: "Refuse",
					disabled: function(key, opt) {
						var username = opt.$trigger.data("challenger");
						var gamekey = opt.$trigger.data("key");
						var challengeExists = (typeof(self.challenges[username]) != "undefined" && 
						typeof(self.challenges[username][gamekey]) != "undefined" && 
						self.challenges[username][gamekey] == true);
						
						var inOptions = (typeof(self.games[username]) != "undefined" && 
						typeof(self.games[username][gamekey]) != "undefined");
						return !challengeExists || inOptions;
					}}
				}
			}
		);
	},
	
	joinChannel: function(channel) {
		if (this.channels.indexOf(channel) == -1) {
			this.socket.emit('joinChannel', channel);
		}
	},
	
	createChallengeWindow: function(user, key) {
		var challengeWindow = $('<div>', {
			title: "Game settings"
		});
		
		var userList = $('<div>', {}).appendTo(challengeWindow);
		var chatDiv = $('<div>', {}).appendTo(challengeWindow);
		var textInput = $('<input>', {type: "text"}).appendTo(challengeWindow);
		
		// Message event
		textInput.bind("enterKey",function(e){
			self.sendGameMessage(textInput, user, key);
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
			if (user != self.username) {
				self.socket.emit("cancelChallenge", user, key);
				delete self.games[user][key];
			} else {
				//delete challenge records
				for (participant in self.games[self.username][key].participants) {
					delete self.challenged[self.games[self.username][key].participants[participant]][key];
				}
				self.socket.emit("closeChallenge", key);
			}
			delete self.games[user][key];
		});
		
		challengeWindow.dialog();
	},
	
	createChannelTab: function(channel) {
		var self = this;
		var channelTab = $('<a>', {
		id: 'chat-'+channel,
		class: 'chatTab',
		text: channel
		}).appendTo(this.tabs);
		this.tabList.push({type: this.TAB_CHANNEL, channel: channel});
		channelTab.on('click', function() {
			self.changeToChannelTab($(this).attr('id').substr(5), false);
		});
	},
	
	createGameTab: function(creator, key) {
		var self = this;
		var channelTab = $('<a>', {
		class: 'chatTab',
		id: 'game-'+creator+'-'+key,
		text: creator + ":" + key
		}).appendTo(this.tabs);
		channelTab.on('click', function() {
			self.changeToGameTab(creator, key);
		});
		self.games[creator][key].challengeTab = true;
		self.tabList.push({type: self.TAB_GAME, creator: creator, key: key});
	},
	
	// Updates challenge window of certain game
	updateChallengeWindow: function(user, key) {
		this.games[user][key].userList.empty();
		var creator = $('<div>', { html: "Users: <br>"+user }).appendTo(this.games[user][key].userList);
		for (var i=0; i<this.games[user][key].participants.length; ++i) {
			var participant = $('<div>', { text: this.games[user][key].participants[i] }).appendTo(this.games[user][key].userList);
		}
	},
	
	// An user left a game
	// This keeps context menus and setup window updated
	removeParticipant: function(user, key, removed) {
		var index = this.games[user][key].participants.indexOf(removed);
		this.games[user][key].participants.splice(index, 1);
	},
	
	// Closes game if no participants and invites are left
	checkGameCloseEvent: function(key) {
		if (this.games[this.username][key].participants.length == 0) {
			if (this.games[this.username][key].invited > 0) {
				return false;
			}
			this.closeGame(key);
			return true;
		}
		return false;
	},
	
	// Game creator closes game
	closeGame: function(key) {
		if (typeof this.games[this.username][key].window != "undefined") {
			this.games[this.username][key].window.dialog("close");
		}
		if (this.GAMETABS == true) {
			this.deleteTab({type: this.TAB_GAME, creator: this.username, key: key});
		}
		delete this.games[this.username][key];
		this.socket.emit("closeChallenge", key);
	},
	
	addMessage: function(target, data) {
		data.time = new Date();
		if (target.type == "current") {
			if (this.currentTab.type == this.TAB_CHANNEL) {
				this.messages[this.currentTab.channel].push(data);
			} else if (this.currentTab.type == this.TAB_GAME) {
				this.games[this.currentTab.creator][this.currentTab.key].chatMessages.push(data);
			}
		} else if (target.type == "channel") {
			this.messages[target.channel].push(data);
		}
	},
	
	addChatMessage: function(channel, sender, message, type) {
		if (typeof this.messages[channel] == "undefined") {
			this.messages[channel] = new Array();
		}
		this.messages[channel].push({time: new Date(), sender: sender, msg: message, type: type});
	},
	
	isScrollOnBottom: function(element) {
		if (element.prop("scrollHeight") - element.scrollTop() == element.height()) {
			return true;
		}
		return false;
	},
	
	scrollToBottom: function(element) {
		element.scrollTop(element.prop("scrollHeight"));
	},
	
	changeToChannelTab: function(channel, init) {
		if (this.currentTab.type != this.TAB_CHANNEL 
		|| this.currentTab.channel != channel || init == true) {
			this.removeTabHighlight();
			this.updateMessageList(channel);
			this.updateUserList(channel);
			$("#chat-"+channel).addClass("chatTabSelected");
			this.currentTab.type = this.TAB_CHANNEL;
			this.currentTab.channel = channel;
		}
	},
	
	// Alternative way to handle challenge windows
	changeToGameTab: function(creator, key) {
		this.removeTabHighlight();
		$("#game-"+creator+'-'+key).addClass("chatTabSelected");
		this.updateGameUserList(creator, key);
		this.updateGameMessageList(this.msgWindow, creator, key);
		this.currentTab.type = this.TAB_GAME;
		this.currentTab.creator = creator;
		this.currentTab.key = key;
	},
	
	removeTabHighlight: function() {
		if (this.currentTab != null) {
			if (this.currentTab.type == this.TAB_CHANNEL) {
				$("#chat-"+this.currentTab.channel).removeClass("chatTabSelected");
			} else if (this.currentTab.type == this.TAB_GAME) {
				$("#game-"+this.currentTab.creator+"-"+this.currentTab.key).removeClass("chatTabSelected");
			}
		}
	},
	
	sendMessage: function(element) {
		if (element.val().substr(0, 1) == "/") {
			this.executeCommand(element);
		} else if (this.currentTab.type == this.TAB_CHANNEL) {
			this.socket.emit('sendMessage', this.currentTab.channel, element.val());
			element.attr("disabled", true);
		} else if (this.currentTab.type == this.TAB_GAME) {
			this.socket.emit('gameMessage', this.currentTab.creator, this.currentTab.key, element.val());
			element.attr("disabled", true);
		}
	},
	
	sendGameMessage: function(element, creator, key) {
		this.socket.emit('gameMessage', creator, key, element.val());
		element.attr("disabled", true);
	},
	
	executeCommand: function(element) {
		var words = element.val().split(" ");
		var command = words[0].substr(1).toLowerCase();
		if (command == "help") {
			this.addMessage({type: "current"}, {time: new Date(), type: "notice", 
			msg: "The commands are: help, join, leave, cancel, close"});
			this.updateCurrentTab();
			element.val("");
		} else if (command == "join") {
			if (words.length == 2) {
				if (this.channels.indexOf(words[1]) == -1) {
					this.joinChannel(words[1]);
					element.val("");
				}
			}
		} else if (command == "leave") {
			if (this.currentTab != null &&
			this.currentTab.type == this.TAB_CHANNEL) {
				this.socket.emit("leaveChannel", this.currentTab.channel);
				this.deleteCurrentTab();
				element.val("");
			}
		} else if (command == "cancel") {
			if (this.currentTab.type == this.TAB_GAME) {
				if (this.currentTab.creator != this.username) {
					this.socket.emit("cancelChallenge", this.currentTab.creator, this.currentTab.key);
					delete this.games[this.currentTab.creator][this.currentTab.key];
					this.deleteCurrentTab();
					element.val("");
				}
			}
		} else if (command == "close") {
			if (this.currentTab.type == this.TAB_GAME) {
				if (this.currentTab.creator == this.username) {
					this.closeGame(this.currentTab.key);
					this.deleteCurrentTab();
					element.val("");
				}
			}
		}
	},
	
	updateTabs: function() {
		$('#tabs').empty();
		for (var i=0; i<this.tabList.length; ++i) {
			if (this.tabList[i].type == "channel") {
				self.createChannelTab(channel);
			} else {
				self.createGameTab(this.tabList[i].creator, this.tabList[i].key);
			}
		}
	},
	
	updateUserList: function(channel) {
		
		this.userList.html("");
		this.userList.children().remove();
		
		if (typeof this.users[channel] != 'undefined') {
			for (user in this.users[channel]) {
				var userEntry = $('<div>', {
				id: 'user-'+this.users[channel][user].username,
				class: 'chatuser',
				text: this.users[channel][user].username
				}).appendTo(this.userList);
				if (this.users[channel][user].username == this.username) {
					userEntry.addClass('chat_userself');
				}
			}
		}
	},
	
	updateMessageList: function(channel) {
	
		var onBottom = this.isScrollOnBottom(this.msgWindow);
		
		$('#msgWindow').empty();
		if (typeof this.messages[channel] != 'undefined') {
			for (var i=0; i<this.messages[channel].length; ++i) {
				var time = "["+this.messages[channel][i].time.getHours() + ":"
							+ this.messages[channel][i].time.getMinutes()+"] ";
				
				var classes = "";
				if (this.messages[channel][i].type == "challenge") {
					classes = "challenge";
				}
				
				var message = $('<div>', {
					text: this.formatMessage(this.messages[channel][i]),
					class: classes
				}).appendTo(this.msgWindow);
				
				if (this.messages[channel][i].type == "challenge") {
					message.data("challenger", this.messages[channel][i].challenger);
					message.data("key", this.messages[channel][i].key);
				}
				
			}
		}
		
		if (onBottom == true) {
			this.scrollToBottom(this.msgWindow);
		}
	},
	
	updateGameUserList: function(creator, key) {
		this.userList.html("");
		this.userList.children().remove();
		
		if (typeof this.games[creator][key] != 'undefined') {
			var participants = this.games[creator][key].participants.slice();
			participants.splice(0, 0, creator);
			for (user in participants) {
				var userEntry = $('<div>', {
				id: 'user-'+participants[user],
				class: 'chatuser',
				text: participants[user]
				}).appendTo(this.userList);
				if (participants[user] == this.username) {
					userEntry.addClass('chat_userself');
				}
			}
		}
	},
	
	updateGameMessageList: function(target, creator, key) {
	
		var onBottom = this.isScrollOnBottom(this.msgWindow);
	
		$('#msgWindow').empty();
		if (typeof this.games[creator] != "undefined"
		&& typeof this.games[creator][key] != "undefined") {
			var messages = this.games[creator][key].chatMessages;
			
			for (var i=0; i<messages.length; ++i) {
				var message = $('<div>', {
					text: this.formatMessage(messages[i])
				}).appendTo(target);
			};
		}
		
		if (onBottom == true) {
			this.scrollToBottom(this.msgWindow);
		}
	},
	
	updateCurrentTab: function() {
		if (this.currentTab.type == this.TAB_CHANNEL) {
			this.updateMessageList(this.currentTab.channel);
			this.updateUserList(this.currentTab.channel);
		} else if (this.currentTab.type == this.TAB_GAME) {
			this.updateGameMessageList(this.msgWindow, this.currentTab.creator, this.currentTab.key);
			this.updateGameUserList(this.currentTab.creator, this.currentTab.key);
		}
	},
	
	deleteTab: function(info) {
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
	},
	
	deleteCurrentTab: function() {
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
	},
	
	changeToNewTab: function(oldid, currentTab) {
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
	},
	
	formatMessage: function(message) {
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
	},
	
	// helper function to reduce repetition of definition checks
	createEntryIfndef: function(entrytype, user) {
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
	}
	
}