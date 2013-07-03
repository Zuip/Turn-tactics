var pages = pages || {};
pages["login"] = pages["login"] || {};

pages["login"].getData = function(pathname) {
	var data = {loginSuc: 0};
	return {data: data};
};