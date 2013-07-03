var pages = pages || {};
pages["chat"] = pages["chat"] || {};

pages["chat"].getData = function() {
	return {};
};

pages["chat"].init = function(pathname) {
	chat.init();
	chat.joinChannel("main");
};

pages["chat"].clean = function() {
	
};