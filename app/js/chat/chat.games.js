/**
 * Sanep 2013
 */
 
var Chat = Chat || {};
Chat.Games = function(chat) {
	"use strict";
	
	// the challenges received from other users
	this.challenges = [];
	// other users that the user has challenged
	this.challenged = [];
	// information for challenges that have been accepted
	this.games = [];
	// list of public games in each channel
	this.pubgames = {};

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
		delete this.challenges[user][game];
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
	
	this.addParticipant = function(user, game, participant, data) {
		this.games[user][game].participants[participant] = data;
	};
	
	this.doesParticipantExist = function(user, game, participant) {
		if (typeof this.games[user][game].participants[participant] != "undefined") {
			return true;
		}
		return false;
	}
	
	this.getGameInvited = function(user, game) {
		return this.games[user][game].invited;
	};
	
	this.addGameInvited = function(user, game, inv) {
		this.games[user][game].invited.push(inv);
	};
	
	this.deleteInvited = function(user, game, invited) {
		var index = this.games[user][game].invited.indexOf(invited);
		this.games[user][game].invited.splice(index, 1);
	}
	
	this.createGameChannel = function(user, key) {
		if (this.getGame(user, key).empty == true) {
			if (chat.GAMETABS == false) {
				this.createChallengeWindow(user, key);
				this.updateChallengeWindow(user, key);
			}
			if (chat.GAMETABS == true) {
				chat.Tabs.createGameTab(user, key, false);
			}
			this.getGame(user, key).empty = false;
		}
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
		
		this.games[user][key].window = challengeWindow;
		this.games[user][key].userList = userList;
		this.games[user][key].chatDiv = chatDiv;
		this.games[user][key].textInput = textInput;
		
		var self = this;
		challengeWindow.bind('dialogclose', function(event) {
			// cancels challenge creator invite data
			if (typeof(self.challenges[user]) != "undefined" && 
			typeof(self.challenges[user][key]) != "undefined") {
				delete self.challenges[user][key];
			}
			// if the window is closed, it always closes the game
			if (user != chat.username) {
				chat.socket.emit("cancelChallenge", user, key);
				delete self.games[user][key];
			} else {
				chat.socket.emit("closeChallenge", key);
			}
		});
		
		challengeWindow.dialog();
	};
	
	// Updates challenge window of certain game
	this.updateChallengeWindow = function(user, key) {
		this.games[user][key].userList.empty();
		var creator = $('<div>', { html: "Users: <br>"+user }).appendTo(this.games[user][key].userList);
		for (var p in this.games[user][key].participants) {
			var userText = chat.Tabs.escapeHTML(p);
			var participant = $('<div>', { html: userText }).appendTo(this.games[user][key].userList);
		}
	};

	this.getPubGameList = function(channel) {
		if (typeof this.pubgames[channel] != "undefined") {
			return this.pubgames[channel];
		}
		return {};
	}
	
	this.setPubGameList = function(channel, list) {
		if (list == null) {
			list = {};
		}
		this.pubgames[channel] = list;
	}
	
	this.addPublicGame = function(channel, creator, key) {
		if (typeof this.pubgames[channel] == "undefined") {
			this.pubgames[channel] = {};
		}
		if (typeof this.pubgames[channel][creator] == "undefined") {
			this.pubgames[channel][creator] = {};
		}
		this.pubgames[channel][creator][key] = true;
	};
	
	this.deletePublicGame = function(channel, creator, key) {
		if (typeof this.pubgames[channel] != "undefined"
		&& typeof this.pubgames[channel][creator] != "undefined"
		&& typeof this.pubgames[channel][creator][key] != "undefined") {
			delete this.pubgames[channel][creator][key];
		}
	}
	
	// An user left a game
	// This keeps context menus and setup window updated
	this.removeParticipant = function(user, key, removed) {
		delete this.games[user][key].participants[removed];
	};
	
	// Closes game if no participants and invites are left
	this.checkGameCloseEvent = function(key) {
		for (var p in this.games[chat.username][key].participants) {
			return false;
		}
		if (this.games[chat.username][key].invited.length > 0) {
			return false;
		}
		this.closeGame(key);
		return true;
	};
	
	// Game creator closes game
	this.closeGame = function(key) {
		chat.socket.emit("closeChallenge", key);
	};
	
	// Deletes game data
	this.closeFinal = function(key) {
		// delete invited
		for (var inv in this.games[chat.username][key].invited) {
			delete this.challenged[this.games[chat.username][key].invited[inv]][key];
		}
		if (typeof this.games[chat.username][key].window != "undefined") {
			this.games[chat.username][key].window.dialog("close");
		}
		if (this.GAMETABS == true) {
			chat.Tabs.deleteTab({type: chat.Tabs.TAB_GAME, creator: chat.username, key: key});
		}
		delete this.games[chat.username][key];
	}
	
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