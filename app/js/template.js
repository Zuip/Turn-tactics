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
	$('a.inner_link').each(function () {
		var oldText = $(this).attr("href");
		$(this).attr("href", "#" + oldText.substr(1));
	});
}

// set default page and transform links
$(function() {

	updateLinks();
	var search = window.location.search;
	var hash = window.location.hash.substring(1);
	if (search.length != 0) {
		if (search.substr(1) in pages) {
			if (typeof pages[search.substr(1)].init == 'function') {
				pages[search.substr(1)].init();
			}
			currentPage = search.substr(1);
		}
	} else if (hash.length != 0) {
			buildPage(hash);
	} else {
		currentPage = "index";
		pages["index"].init();
	}
	firstInit = false;
	
});

// load a page
function buildPage(event, page) {
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