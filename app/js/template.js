pages = pages || {};
var templates = new Array;
var currentPage = 'index';
var firstInit = true;
var History = window.History;

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
	
	if (History.enabled) { // history.js
		$("a.inner_link").unbind('click');
		$("a.inner_link").on("click", function(event){
			event.preventDefault();
			History.pushState({page: $(this).attr('href')}, document.title, $(this).attr('href'));
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
	
	updateLinks();

	var search = window.location.search;
	if (search.length != 0) {
		if (search.substr(1) in pages) {
			if (typeof pages[search.substr(1)].init == 'function') {
				pages[search.substr(1)].init();
			}
			currentPage = search.substr(1);
		}
		if (History.enabled) {
			History.replaceState({page: currentPage}, document.title, currentPage);
		}
	} else {
		currentPage = "index";
		pages["index"].init();
		// if user had no page set, leave it that way in browser url bar
		if (History.enabled) {
			History.replaceState({page: "index"}, document.title, "");
		}
	}
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