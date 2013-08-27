/**
 * Sanep 2013
 */

var Chat = Chat || {};
Chat.ContextMenus = function(chat) {
	"use strict";
	
	this.createContextMenus = function() {
		this.createUserMenu();
		this.createChallengeResponseMenu();
		this.createPublicChallengeMenu();
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
							&& chat.Games.doesParticipantExist(chat.username, game, username)) {
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
				chat.socket.emit('createChallenge', chat.Tabs.currentTab.channel, false, username);
			}
		} else if (key.substr(0, 6) == "invite") {
			var gamekey = key.substr(7);
			chat.socket.emit('inviteToExistingChallenge', chat.Tabs.currentTab.channel, username, gamekey);
		} else if (key.substr(0, 6) == "cancel") {
			var gamekey = key.substr(7);
			chat.socket.emit('cancelInvitation', username, gamekey);
			if (chat.Games.doesChallengeByMeExist(username, gamekey)) {
				chat.Games.deleteMyChallengeToUser(username, gamekey);
				chat.Games.deleteInvited(chat.username, gamekey, username);
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
	
	
	this.createPublicChallengeMenu = function() {
		var self = this;
		$.contextMenu(
			{
				selector: '.publicGame', 
				callback: function(key, options) {
					var username = options.$trigger.data("challenger");
					var gamekey = options.$trigger.data("key");
					if (key == "joinChallenge") {
						chat.socket.emit('acceptChallenge', username, gamekey);
					}
				},
				items: {
					"joinChallenge": {name: "Join"}
				}
			}
		);
	
	};
	
};