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