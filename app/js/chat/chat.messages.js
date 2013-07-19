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