module.exports = function(express, app, pool, sessions, APP_PATH) {
	
	this.configure = function() {
	
		app.use(APP_PATH + "/app/js", express.static(__dirname + APP_PATH + '/app/js'));
		app.use(APP_PATH + "/app/templates", express.static(__dirname + APP_PATH + '/app/templates'));
		app.use(APP_PATH + "/app/language", express.static(__dirname + APP_PATH + '/app/language'));
		app.use(APP_PATH + "/app/controllers", express.static(__dirname + APP_PATH + '/app/controllers'));
		app.use(APP_PATH + "/views", express.static(__dirname + APP_PATH + '/views'));
		app.use(APP_PATH + "/media", express.static(__dirname + APP_PATH + '/media'));
		
		// Handle post requests
		app.post(APP_PATH+'/', function(req, res) {
			app.handlePostQueries(req, res);
		});
		
		// Handle registering
		app.post(APP_PATH+'/register', function(req, res) {
			app.handlePostQueries(req, res);
		});
		
		// Handle logins
		app.post(APP_PATH+'/login', function(req, res) {
			app.handlePostQueries(req, res);
		});
		
		// Respond to ajax queries
		app.get(APP_PATH+'/ajax/:id', function(req, res){
			if (req.xhr) { // test if ajax call
				var startdata = {};
				sessions.handlePage(req, res, pool, startdata, function(data) {
					//last param tells to send ajax data
					app.sendPageContent(req, res, data, true);
				});
			}
		});
		
		// Serve the layout and the page
		app.get(APP_PATH+'/', function(req, res){
			var startdata = {};
			sessions.handlePage(req, res, pool, startdata, function(data) {
				app.sendPageContent(req, res, data, false);
			});
		});
		
		app.get(APP_PATH+'/:id', function(req, res, next){
			/* Do not process user data when getting favicon.ico
			 * Some browsers try to get favicon.ico even with every ajax request */
			if (req.params.id != "favicon.ico") {
				// regular page
				var startdata = {};
				sessions.handlePage(req, res, pool, startdata, function(data) {
					app.sendPageContent(req, res, data, false);
				});
			} else {
				next();
			}
		});
		
		//None of the other rules applied
		app.use(function(req, res, next) {
			res.status(404);
			res.render('views/404', { url: req.url });
		});
		
	}
	return this;
}