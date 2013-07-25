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
			$("#chat-"+channel).addClass("chatTabSelected");
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
		for (var i=0; i<this.tabList.length; i++) {
			if (this.tabList[i].type == this.TAB_CHANNEL) {
				this.createChannelTab(this.tabList[i].channel, true);
			} else if (this.tabList[i].type == this.TAB_GAME) {
				this.createGameTab(this.tabList[i].creator, this.tabList[i].key, true);
			}
		}
	};
	
	this.changeToCurrentTab = function() {
		if (this.currentTab != null && this.currentTab.type == this.TAB_CHANNEL) {
			this.changeToChannelTab(this.currentTab.channel, true);
		} else if (this.currentTab != null && this.currentTab.type == this.TAB_GAME) {
			this.changeToGameTab(this.currentTab.creator, this.currentTab.key);
		} else if (this.currentTab == null) {
			this.updateUserList("");
			this.updateMessageList("");
		}
	}
	
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
	
	this.escapeHTML = function(msg) {
		msg.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
		return msg;
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
				
				var message = this.createMessageDiv(chat.Messages.messages[channel][i], classes)
				.appendTo(chat.msgWindow);
				
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
			
			for (var msgid in messages) {
				var message = this.createMessageDiv(messages[msgid]).appendTo(target);
			};
		}
		
		if (onBottom == true) {
			this.scrollToBottom(chat.msgWindow);
		}
	};
	
	this.createMessageDiv = function(message, classes) {
		var timestamp = chat.Messages.getMessageTime(message);
		var msg = chat.Messages.formatMessage(message);
		var msgDiv = $('<div>', {
			html: timestamp + msg,
			class: classes});
		return msgDiv;
	}
	
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
			participants[creator] = {};
			for (var user in participants) {
				var userEntry = $('<div>', {
				id: 'user-'+user,
				class: 'chatuser',
				text: participants[user]
				}).appendTo(this.userList);
				if (user == chat.username) {
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