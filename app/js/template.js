pages = pages || {};
var templates = new Array;
var currentPage = 'index';
var firstInit = true;

// Precompile
for (var page in pages) {
	templates[page] = new EJS({url: './app/templates/' + page});
}

function loadFile(page) {
	$.ajax({
        url: './app/templates/'+page+'.js',
            cache: true,
            success: function(data) {
				callback(page, data);
			},
    });
}

function updateLinks() {
	$("a.inner_link").unbind('click');
	$("a.inner_link").on("click", function(event){
		event.preventDefault();
		var url = $(this).attr('href');
		var page = url.substr(1);
		buildPage(page);
	});

}

// set default page and transform links
$(function() {

	updateLinks();
	// if user moved backwards or forwards
	window.addEventListener('popstate', function(event) {
		var page = event.state.page;
		buildPage(page, false);
	});

	var search = window.location.search;
	if (search.length != 0) {
		if (search.substr(1) in pages) {
			if (typeof pages[search.substr(1)].init == 'function') {
				pages[search.substr(1)].init();
			}
			currentPage = search.substr(1);
		}
		history.replaceState({page: currentPage}, "?"+currentPage, "?"+currentPage);
	} else {
		currentPage = "index";
		pages["index"].init();
		// if user had no page set, leave it that way in browser url bar
		history.replaceState({page: "index"}, "", "");
	}
	firstInit = false;
	
});

// load a page
function buildPage(page, saveState = true) {
	if (saveState == true) {
		history.pushState({page: page}, "?"+page, "?"+page);
	}
	popTwice = true;
	if (page in pages) {
		if (firstInit == false) {
			if (typeof pages[currentPage].clean == 'function') { 
				pages[currentPage].clean();
			}
		}
	
		var data = {};
		if (typeof(pages[page].getData) == typeof(Function)) {
			data = pages[page].getData();
		}
		var view = templates[page].render(data);
		$("#main").html(view);
		if (typeof pages[page].init == 'function') {
			pages[page].init();
		}
		updateLinks();
		currentPage = page;
	}
}