/**
 * Sanep 2013
 */
 
var Chat = Chat || {};
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
				chat.setInteraction(true);
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
			chat.setInteraction(true);
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
		
		chat.socket.on('serverinfo', function(data) {
			chat.username = data.username;
			chat.userlevel = data.userlevel;
		});
	
		chat.socket.on('messageDelivered', function(channel, status){
			chat.chatInputText.attr("disabled", false);
			if (status == true) {
				chat.Messages.addChatMessage(channel, {username: chat.username, userlevel: chat.userlevel}, chat.chatInputText.val(), "normal");
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
		
		chat.socket.on('excessFlood', function() {
			chat.Messages.addMessage({type: "current"}, {type: "excessFlood"});
			chat.Tabs.updateCurrentTab();
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
			var data = {time: new Date(), sender: {username: chat.username, userlevel: chat.userlevel}, 
			msg: source.val(), type: "normal"};
			var game = chat.Games.getGame(creator, key);
			game.chatMessages.push(data);
			chat.Messages.limitArray(game.chatMessages, chat.Messages.BUFFER_SIZE);
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
				var game = chat.Games.getGame(creator, key);
				game.chatMessages.push({time: new Date(), sender: userdata, msg: message, type: "normal"});
				chat.Messages.limitArray(game.chatMessages, chat.Messages.BUFFER_SIZE);
				
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
			chat.Messages.addChatMessage(channel, userdata, message, "normal");
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL
			&& chat.Tabs.currentTab.channel == channel) {
				chat.Tabs.updateMessageList(channel);
			}
		});
		
		chat.socket.on('challengeCreated', function(user, key) {
			chat.Games.createEntryIfndef("challenged", user);
			chat.Games.createEntryIfndef("games", chat.username);
			chat.Games.createGame(chat.username, key, 
			{empty: true, participants: [], invited: [user], chatMessages: []});
			chat.Games.setChallengedByMe(user, key, true);
			// create game window or tab
			chat.Games.createGameChannel(chat.username, key);
			
		});
		
		chat.socket.on('ongoingChallenge', function(data) {
			var creator = data.creator;
			var key = data.key;
			chat.Games.createEntryIfndef("games", creator);
			chat.Games.createGame(creator, key, 
			{empty: true, participants: data.participants, invited: [], chatMessages: []});
			for (var i in data.invited) {
				chat.Games.addGameInvited(creator, key, data.invited[i].username);
				chat.Games.createEntryIfndef("challenged", data.invited[i].username);
				chat.Games.setChallengedByMe(data.invited[i].username, key, true);
			}
			chat.Games.createGameChannel(creator, key);
		});
		
		chat.socket.on('pendingChallenge', function(data) {
			chat.Games.createEntryIfndef("challenges", data.creator);
			chat.Games.setChallenged(data.creator, data.key, true);
			chat.Messages.addMessage({type: "current"}, {type: "challenge", challenger: data.creator, key: data.key});
			chat.Tabs.updateCurrentTab();
		});
		
		chat.socket.on('newChallenge', function(channel, user, key) {
			chat.Games.createEntryIfndef("challenges", user);
			chat.Games.setChallenged(user, key, true);
			chat.Messages.addMessage({type: "current"}, {type: "challenge", challenger: user, key: key});
			chat.Tabs.updateCurrentTab();
		});
		
		// Creator of the challenge closed the challenge
		chat.socket.on('challengeClosed', function(user, key) {
			if (typeof chat.Games.getGame(user, key) != "undefined"
			&& typeof chat.Games.getGame(user, key).window != "undefined") {
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
		chat.socket.on('challengeCloseSuccessful', function(key) {
			chat.Games.closeFinal(key);
		});
		
		// one of the participants cancelled the challenge
		chat.socket.on('challengeCancelled', function(user, key, leaver) {
		
			if (user == chat.username) {
				chat.Games.removeParticipant(chat.username, key, leaver);

				// delete challenge record
				if (chat.Games.doesChallengeByMeExist(leaver, key)) {
					chat.Games.deleteMyChallengeToUser(leaver, key);
				}
				chat.Messages.addMessage({type: "current"}, {type: "challengeCancelled", participant: leaver});
			} else {
				// if the game isn't user's own, it means that one of the other participants left
				chat.Games.removeParticipant(user, key, leaver);
			}
			if (chat.GAMETABS == false) {
				chat.Games.updateChallengeWindow(user, key);
			}
			chat.Tabs.updateCurrentTab();
		});
		
		// Confirmation that the challenge was cancelled successfully
		chat.socket.on('cancelSuccessful', function(user, key) {});
		
		chat.socket.on('inviteStatus', function(invited, key, status) {
			if (status == true) {
				chat.Games.createEntryIfndef("challenged", invited);
				chat.Games.setChallengedByMe(invited, key, true);
				chat.Games.addGameInvited(chat.username, key, invited);
			}
		});
		
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
				chat.Games.deleteInvited(chat.username, key, joiner);
				chat.Messages.addMessage({type: "current"}, {type: "challengeAccepted", challenger: joiner});
				chat.Tabs.updateCurrentTab();
			} else {
				//Todo: other kind of message
			}
			chat.Games.addParticipant(user, key, joiner, {accepted: false});
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
			chat.Games.deleteInvited(chat.username, key, user);
			chat.Messages.addMessage({type: "current"}, {type: "challengeRefused", challenger: user});
			chat.Tabs.updateCurrentTab();
		});
		
		// new public game on a channel
		chat.socket.on('newPublicChallenge', function(channel, creator, key) {
			chat.Games.addPublicGame(channel, creator, key);
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL
			&& chat.Tabs.currentTab.channel == channel) {
				chat.Tabs.updatePublicGameList(channel);
			}
		});
		
		// public game removed or hidden
		chat.socket.on('publicChallengeClosed', function(channel, creator, key) {
			chat.Games.deletePublicGame(channel, creator, key);
			if (chat.Tabs.currentTab.type == chat.Tabs.TAB_CHANNEL
			&& chat.Tabs.currentTab.channel == channel) {
				chat.Tabs.updatePublicGameList(channel);
			}
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
		
		chat.socket.on('channelJoinSuccessful', function(channel, publicGameList) {
			chat.channels.push(channel);
			chat.Messages.createMessagesEntry(channel);
			chat.createUserEntry(channel);
			chat.Games.setPubGameList(channel, publicGameList);
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