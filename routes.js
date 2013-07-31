module.exports = function(app, pool, sessions, APP_PATH) {
	
	this.configure = function() {
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
		
		// Receive ajax post requests
		app.post(APP_PATH+'/ajax', function(req, res) {
			//todo
		});
		
		// Respond to ajax queries
		app.get(APP_PATH+'/ajax/:id', function(req, res){
			if (req.xhr) { // test if ajax call
				sessions.handlePage(req, res, pool, function(data) {
					//last param tells to send ajax data
					app.sendPageContent(req, res, data, true);
				});
			}
		});
		
		// Serve the layout and the page
		app.get(APP_PATH+'/', function(req, res){
			sessions.handlePage(req, res, pool, function(data) {
				app.sendPageContent(req, res, data, false);
			});
		});
		
		app.get(APP_PATH+'/:id', function(req, res, next){
			/* Do not process user data when getting favicon.ico
			 * Some browsers try to get favicon.ico even with every ajax request */
			if (req.params.id != "favicon.ico") {
				// regular page
				sessions.handlePage(req, res, pool, function(data) {
					app.sendPageContent(req, res, data, false);
				});
			} else {
				next();
			}
		});
		// serve images
		app.get(APP_PATH+"/images/:file", function(req, res) {
			app.serveFiles(req, res, "images");
		});
		// style.css
		app.get(APP_PATH+"/app/:file", function(req, res) {
			app.serveFiles(req, res, "app");
		});
		// serve front-end js directly
		app.get(APP_PATH+"/app/js/:file", function(req, res) {
			app.serveFiles(req, res, "app/js");
		});
		app.get(APP_PATH+"/app/templates/:file", function(req, res) {
			app.serveFiles(req, res, "app/templates");
		});
		// serve controllers directly
		app.get(APP_PATH+"/app/controllers/:file", function(req, res) {
			app.serveFiles(req, res, "app/controllers");
		});
		// serve language files directly
		app.get(APP_PATH+"/app/language/:file", function(req, res) {
			app.serveFiles(req, res, "app/language");
		});
		// serve view directly
		app.get(APP_PATH+"/app/views/:file", function(req, res) {
			app.serveFiles(req, res, "app/views");
		});
		
		//None of the other rules applied
		app.use(function(req, res, next) {
			res.status(404);
			res.render('views/404', { url: req.url });
		});
		
	}
	return this;
}