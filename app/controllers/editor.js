var pages = pages || {};
pages["editor"] = pages["editor"] || {};

pages["editor"].getData = function() {
	return {};
};

var handler2 = function() {
	alert('The quick brown fox jumps over the lazy dog.');
};

pages["editor"].init = function() {
	$(document).on('click', '#main', handler2);
};

pages["editor"].clean = function() {
	$(document).off('click', '#main', handler2);
};