chat = {
	socket: null,
	firstConnect: true,
	username: "Me",
	connected: false,
	tabs: null,
	msgWindow: null,
	userList: null,
	chatInput: null,
	chatInputText: null,
	
	currentChannel: "",
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
		
			this.socket = io.connect("http://"+window.location.host);
			this.socket.on('connect', function() {
				self.connected = true;
				self.initChatEvents();
				self.chatInputText.attr("disabled", false);
				self.messages[""] = new Array();
				self.joinChannel("main");
				self.joinChannel("main2");
			});
			
			this.socket.on('error', function() {
				self.addChatMessage(self.currentChannel, "", "Login to enter chat", "notice");
				self.updateMessageList(self.currentChannel);
			});
		
		}

	},
	
	initChatEvents: function() {
		var self = this;
		
		this.socket.on('disconnect', function(){
			self.socket.disconnect();
			self.socket.removeAllListeners();
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
				if (channel == self.currentChannel) {
					self.updateMessageList(channel);
				}
			}
			self.chatInputText.val("");
		});
		
		this.socket.on('chatMessage', function(channel, userdata, message) {
			self.addChatMessage(channel, userdata.username, message, "normal");
			if (channel == self.currentChannel) {
				self.updateMessageList(channel);
			}
		});
		
		this.socket.on('challengeCreated', function(user, key) {
			self.createEntryIfndef("challenged", user);
			self.createEntryIfndef("games", self.username);
			self.games[self.username][key] = {empty: true, participants: [], invited: 1};
			self.challenged[user][key] = true;
		}),
		
		this.socket.on('newChallenge', function(channel, user, key) {
			self.createEntryIfndef("challenges", user);
			self.challenges[user][key] = true;
			self.addMessage(self.currentChannel, {type: "challenge", challenger: user, key: key});
			self.updateMessageList(self.currentChannel);
		});
		
		// Creator of the challenge closed the challenge
		this.socket.on('challengeClosed', function(user, key) {
			self.games[user][key].window.dialog("close");
			delete self.games[user][key];
			self.addMessage(self.currentChannel, {type: "gameClosed", creator: user});
			self.updateMessageList(self.currentChannel);
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
				self.addMessage(self.currentChannel, {type: "challengeCancelled", participant: leaver});
			} else {
				// if the game isn't user's own, it means that one of the other participants left
				self.removeParticipant(user, key, leaver);
			}
			if (closed == false) {
				self.updateChallengeWindow(user, key);
			}
			self.updateMessageList(self.currentChannel);
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
			self.addMessage(self.currentChannel, {type: "invitationCancelled", creator: user});
			self.updateMessageList(self.currentChannel);
		});
		
		// New participant on challenge
		this.socket.on('challengeAccepted', function(user, key, joiner) {
			if (self.username == user) {
				self.addMessage(self.currentChannel, {type: "challengeAccepted", challenger: joiner});
				self.updateMessageList(self.currentChannel);
				// create window only if it hasn't been already created
				if (self.games[self.username][key].empty == true) {
					self.createChallengeWindow(self.username, key);
					self.games[self.username][key].empty = false;
				}
			} else {
				//Todo: other kind of message
			}
			self.games[user][key].participants.push(joiner);
			self.updateChallengeWindow(user, key);
		});
		
		// Game creator: invited user refused challenge
		// This doesn't currently close the game if the only invited user refused
		this.socket.on('challengeRefused', function(user, key) {
			self.challenged[user][key] = false;
			self.games[self.username][key].invited--;
			self.addMessage(self.currentChannel, {type: "challengeRefused", challenger: user});
			self.updateMessageList(self.currentChannel);
		});
		
		// current participant receives data about the challenge
		this.socket.on('challengeData', function(user, key, data) {
			if (typeof self.games[user] == "undefined" || typeof self.games[user][key] == "undefined") {
				self.createChallengeWindow(user, key);
			}
			if (typeof data.participants != "undefined") {
				self.games[user][key].participants = data.participants;
			}
			self.updateChallengeWindow(user, key);
		});
		
		this.socket.on('channelJoinSuccessful', function(channel, username) {
			self.channels.push(channel);
		
			if (typeof self.messages[channel] == "undefined") {
				self.messages[channel] = new Array();
			}
			if (typeof self.users[channel] == "undefined") {
				self.users[channel] = new Array();
			}
			
			var channelTab = $('<a>', {
			id: 'chat-'+channel,
			class: 'chatTab',
			text: channel
			}).appendTo(self.tabs);
			channelTab.on('click', function() {
				self.changeTab($(this).attr('id').substr(5), false);
			});
			
			self.changeTab(channel, false);
		});
		
		this.socket.on('userJoin', function(channel, user){
			self.addChatMessage(channel, "", 
			"User " + user.username + " joined the channel", "notice");
			self.users[channel][user.username] = user;
			if (channel == self.currentChannel) {
				self.updateMessageList(channel);
				self.updateUserList(channel);
			}
		});
		this.socket.on('userLeave', function(channel, user){
			self.addChatMessage(self.currentChannel, "", 
			"User " + user.username + " left the channel", "notice");
			if (channel == self.currentChannel) {
				self.updateMessageList(channel);
				self.updateUserList(channel);
			}
			delete self.users[channel][user.username];
		});
		this.socket.on('userDisconnect', function(channel, user){
			self.addChatMessage(channel, "", "User " + user.username + " left the chat",
			"notice");
			if (channel == self.currentChannel) {
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
					if (channel == self.currentChannel) {
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
			self.sendMessage();
		});
		this.chatInputText.keyup(function(e) {
			if (e.keyCode == 13) {
				$(this).trigger("enterKey");
			}
		});
		if (self.connected == false) {
			self.chatInputText.attr("disabled", true);
		}
		
		this.updateTabs();
		if (this.currentChannel != "") {
			this.changeTab(this.currentChannel, true);
		} else {
			this.updateUserList(this.currentChannel);
			this.updateMessageList(this.currentChannel);
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
									self.socket.emit('createChallenge', self.currentChannel, username);
								}
							} else if (key.substr(0, 6) == "invite") {
								var gamekey = key.substr(7);
								self.socket.emit('inviteToExistingChallenge', self.currentChannel, username, gamekey);
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
						typeof(self.games[username][gamekey]) != "undefined" && 
						self.games[username][gamekey].cancelled ==  false);
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
						typeof(self.games[username][gamekey]) != "undefined" && 
						self.games[username][gamekey].cancelled ==  false);
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
		
		this.createEntryIfndef("games", user);
		this.games[user][key] = {window: challengeWindow, cancelled: false, participants: [],
		userList: userList};
		
		var self = this;
		challengeWindow.bind('dialogclose', function(event) {
			if (typeof(self.challenges[user]) != "undefined" && 
			typeof(self.challenges[user][key]) != "undefined") {
				delete self.challenges[user][key];
			}
			// if the window is closed, it always closes the game
			if (user != self.username) {
				if (self.games[user][key].cancelled == false) {
					self.socket.emit("cancelChallenge", user, key);
					delete self.games[user][key];
				}
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
			if (typeof this.games[this.username][key].window != "undefined") {
				this.games[this.username][key].window.dialog("close");
			}
			delete this.games[this.username][key];
			this.socket.emit("closeChallenge", key);
			return true;
		}
		return false;
	},
	
	addMessage: function(channel, data) {
		if (typeof this.messages[channel] == "undefined") {
			this.messages[channel] = new Array();
		}
		this.messages[channel].push(data);
	},
	
	addChatMessage: function(channel, sender, message, type) {
		if (typeof this.messages[channel] == "undefined") {
			this.messages[channel] = new Array();
		}
		this.messages[channel].push({sender: sender, msg: message, type: type});
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
	
	changeTab: function(channel, init) {
		if (channel != this.currentChannel || init == true) {
			if (this.currentChannel != "") {
				$("#chat-"+this.currentChannel).removeClass("chatTabSelected");
			}
			this.updateMessageList(channel);
			this.updateUserList(channel);
			$("#chat-"+channel).addClass("chatTabSelected");
			this.currentChannel = channel;
		}
	},
	
	sendMessage: function() {
		this.socket.emit('sendMessage', this.currentChannel, this.chatInputText.val());
		this.chatInputText.attr("disabled", true);
	},
	
	updateTabs: function() {
		$('#tabs').empty();
		for (var i=0; i<this.channels.length; ++i) {
			var channel = $('.chat-'+this.channels[i]);
			if (!channel.length) {
				var channelTab = $('<a>', {
				id: 'chat-'+this.channels[i],
				class: 'chatTab',
				text: this.channels[i]
				}).appendTo(this.tabs);
				var self = this;
				channelTab.on('click', function() {
					self.changeTab($(this).attr('id').substr(5), false);
				});
			}
		}
	},
	
	updateUserList: function(channel) {
		//todo: sort users?
		
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
				if (this.messages[channel][i].type == "normal") {
					var message = $('<div>', {
					text: this.messages[channel][i].sender+": "+this.messages[channel][i].msg
					}).appendTo(this.msgWindow);
				} else if (this.messages[channel][i].type == "notice") {
					var message = $('<div>', {
					text: this.messages[channel][i].msg
					}).appendTo(this.msgWindow);
				} else if (this.messages[channel][i].type == "challenge") {
					var message = $('<div>', {
					text: this.messages[channel][i].challenger + " has challenged you",
					class: "challenge",
					}).appendTo(this.msgWindow);
					message.data("challenger", this.messages[channel][i].challenger);
					message.data("key", this.messages[channel][i].key);
				} else if (this.messages[channel][i].type == "challengeCancelled") {
					var message = $('<div>', {
					text: this.messages[channel][i].participant + " cancelled the challenge",
					}).appendTo(this.msgWindow);
				} else if (this.messages[channel][i].type == "invitationCancelled") {
					var message = $('<div>', {
					text: this.messages[channel][i].creator + " cancelled challenge invitation",
					}).appendTo(this.msgWindow);
				} else if (this.messages[channel][i].type == "gameClosed") {
					var message = $('<div>', {
					text: this.messages[channel][i].creator + " closed the game",
					}).appendTo(this.msgWindow);
				} else if (this.messages[channel][i].type == "challengeAccepted") {
					var message = $('<div>', {
					text: this.messages[channel][i].challenger + " accepted your challenge",
					}).appendTo(this.msgWindow);
				} else if (this.messages[channel][i].type == "challengeRefused") {
					var message = $('<div>', {
					text: this.messages[channel][i].challenger + " refused your challenge",
					}).appendTo(this.msgWindow);
				}
			}
		}
		
		if (onBottom == true) {
			this.scrollToBottom(this.msgWindow);
		}
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