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
				chat.Games.updateChallengeWindow(user, key);
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
			chat.Messages.addMessage({type: "current"}, {type: "invitationCancelled", creator: user});
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