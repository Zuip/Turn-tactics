pages = pages || {};
var templates = new Array;
var components = new Array;
var currentPage = 'index';
var firstInit = true;
var History = window.History;

// Precompile
for (var page in pages) {
	templates[page] = new EJS({url: APP_PATH+'/app/templates/' + page});
}
components["status"] = new EJS({url: APP_PATH+'/app/templates/status.ejs'});
components["logininfo"] = new EJS({url: APP_PATH+'/app/templates/logininfo.ejs'});
components["navigation"] = new EJS({url: APP_PATH+'/app/templates/navigation.ejs'});

function loadFile(page) {
	$.ajax({
        url: APP_PATH+'/app/templates/'+page+'.js',
            cache: true,
            success: function(data) {
				callback(page, data);
			},
    });
}

function updateLinks() {
	
	if (History.enabled) { // history.js
		$("a.inner_link").unbind('click');
		$("a.inner_link").on("click", function(event){
			event.preventDefault();
			History.pushState({page: $(this).attr('href')}, document.title, APP_PATH+"/"+$(this).attr('href'));
		});
	} else {
		// Fallback. No history
		$('a.inner_link').each(function(){
			var url = $(this).attr('href');
			if (url != "#") {
				$(this).click(function() {
					buildPage(url);
				});
				$(this).attr("href", "#");
			}
        });		
	}

}


// set default page and transform links
$(function() {
	
	if (History.enabled) {
		window.History.Adapter.bind(window, 'statechange', function() {
			var state = History.getState();
			setPageContent(state.data.page);
		});
	}

	var path = window.location.pathname;
	var realPath = path.substring(APP_PATH.length+1);
	var parts = realPath.split("/");
	var dir = parts[0];
	
	if (dir != "") {
		if (dir in pages) {
			currentPage = dir;
			if (typeof pages[currentPage].init == 'function') {
				pages[currentPage].init();
			}
			History.pushState({page: currentPage}, document.title, APP_PATH+"/"+currentPage);
		}
	} else {
		currentPage = "index";
		// if user had no page set, leave it that way in browser url bar
		History.pushState({page: currentPage}, document.title, "");
		if (typeof pages[currentPage].init == 'function') {
			pages[currentPage].init();
		}
	}

	updateLinks();
	firstInit = false;
	
});

// load a page
function buildPage(page) {
	if (page in pages) {
		setPageContent(page);
	}
}

function setPageContent(page) {

	if (firstInit == false) {
		if (typeof pages[currentPage].clean == 'function') { 
			pages[currentPage].clean();
		}
	}

	$.getJSON('ajax/'+page, function(jsondata) {
			var data = {data: jsondata};
			completePageChange(page, data);
	});

}

function completePageChange(page, data) {

	$("#status").html(components["status"].render(data));
	$("#login").html(components["logininfo"].render(data));
	$("#navigation").html(components["navigation"].render(data));
	var view = templates[page].render(data);
	$("#main").html(view);
	updateLinks();
	currentPage = page;
	if (firstInit == false) {
		if (typeof pages[currentPage].init == 'function') {
			pages[currentPage].init();
		}
	}

}