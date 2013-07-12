var c = document.getElementById("gameArea");
var ctx = c.getContext("2d");

ctx.canvas.width = document.getElementById("main").offsetWidth;
ctx.canvas.height = document.getElementById("main").offsetWidth * (9/16);

var game = new Game();
game.loader.init();

function Picture(name, type, pictureAddress) {
	this.name = name;
	this.pictureAddress = pictureAddress;
	this.image;
	this.type = type;

	this.init = function() {
		++game.pictures.amountOfPictures;
		this.name = name;
		this.image = new Image();
		this.image.src = APP_PATH + pictureAddress;
		this.image.onload = function(){ game.loader.haveLoaded(); }
	}
}

// Pictures of land, water, roads, trees, buildings and mountain.
function Pictures() {
	this.amountOfPictures = 0;
	
	this.pictures = new Array();
	
	this.returnPicture = function(name) {
		for(var i = 0; i < this.pictures.length; ++i) {
			if(this.pictures[i].name == name) {
				return this.pictures[i].image;
			}
		}
	}
	
	this.returnData = function(name) {
		for(var i = 0; i < this.pictures.length; ++i) {
			if(this.pictures[i].name == name) {
				return this.pictures[i];
			}
		}
	}
	
	this.loadPictures = function() {
	
		this.pictures[0] = new Picture('sand', 'land', '/images/sand.png');
		this.pictures[1] = new Picture('grass', 'land', '/images/grass.png');
		this.pictures[2] = new Picture('water', 'land', '/images/water.png');
		this.pictures[3] = new Picture('road_straight', 'object', '/images/road_straight.png');
		this.pictures[4] = new Picture('road_intersection1', 'object', '/images/road_intersection1.png');
		this.pictures[5] = new Picture('road_intersection2', 'object', '/images/road_intersection2.png');
		this.pictures[6] = new Picture('road_curve', 'object', '/images/road_curve.png');
		this.pictures[7] = new Picture('road_end', 'object', '/images/road_end.png');
		this.pictures[8] = new Picture('building1', 'object', '/images/building1.gif');
		this.pictures[9] = new Picture('building2', 'object', '/images/building2.png');
		this.pictures[10] = new Picture('tree1', 'object', '/images/tree1.png');
		this.pictures[11] = new Picture('mountain', 'object', '/images/mountain.png');
		this.pictures[12] = new Picture('selector', 'object', '/images/selector.png');
		
		for(var i = 0; i < this.pictures.length; ++i) {
			this.pictures[i].init();
		}
	}
}

function Loader() {
	this.amountOfLoadable = 0;
	this.amountLoaded = 0;
	this.loaded = false;
	
	// Loader screen's information
	this.loadBarTop = 330;
	this.loadBarHeight = 50;
	this.topicTop = 250;
	this.loadingTextTop = 300;
	this.topic = "Turn tactics";
	this.loadingText = "Loading";
	
	// Draw background, topic, loading-text and loader-bar
	this.drawLoader = function() {
		var textInfo;
	
		// Background
		ctx.fillStyle = "#1F7A99";
		ctx.fillRect(0, 0, c.width, c.height);
		
		// Loader-bar's background
		ctx.fillStyle = "#FF6666";
		ctx.fillRect(100, this.loadBarTop, c.width - 200, this.loadBarHeight);
		
		// Loader bar's amount of loaded data
		ctx.fillStyle = "#00CC66";
		ctx.fillRect(100, this.loadBarTop, ( this.amountLoaded / this.amountOfLoadable ) * ( c.width - 200 ),
				this.loadBarHeight);
				
		// Black rectangle around loader-bar
		ctx.strokeStyle = "#000000";
		ctx.strokeRect(100, this.loadBarTop, c.width - 200, this.loadBarHeight);
		
		// Topic
		ctx.font = "40pt Calibri";
		ctx.fillStyle = "#000000";
		textInfo = ctx.measureText(this.topic);
		ctx.fillText( this.topic, ( c.width / 2 ) - ( textInfo.width / 2 ), this.topicTop );
		
		// Loading-text
		ctx.font = "30pt Calibri";
		ctx.fillStyle = "#000000";
		textInfo2 = ctx.measureText(this.loadingText);
		ctx.fillText( this.loadingText, ( c.width / 2 ) - ( textInfo.width / 4 ), this.loadingTextTop );
	}
	
	// Returns the knowledge of have the needed data loaded.
	this.haveLoaded = function() {
		++this.amountLoaded;
		
		this.drawLoader();
		
		if(this.amountLoaded == this.amountOfLoadable) {
			this.loaded = true;
			game.init();
		}
	}

	this.init = function() {
		// Load map pictures
		game.pictures.loadPictures();
		
		// Get amount of loadable data
		this.amountOfLoadable = game.pictures.amountOfPictures;
	}
}

function Tile(land, object) {
	this.land = land;
	this.object = object;
	this.terrainCost;
	this.defenceArea;
	
	this.draw = function(coordX, coordY) {

		if(this.land != '') {
			ctx.drawImage(game.pictures.returnPicture(this.land), coordX, coordY);
		}

		if(this.object != '') {
			ctx.drawImage(game.pictures.returnPicture(this.object), coordX, coordY);
		}
	}
}

function Node(land, object) {
	this.unit;
	this.tile = new Tile(land, object);
	
	this.draw = function(coordX, coordY) {
		console.log(coordX + " " + coordY);
		this.tile.draw(coordX, coordY);
	}
}

function Map() {
	this.nodes;
	this.sizeX;
	this.sizeY;
	this.locationX = 0;
	this.locationY = 0;
	this.tileSize = 50;
	
	this.updateXSize = function(size) {
		// New X size is bigger, create new nodes
		if(size > this.sizeX) {
			var sizeDif = size - this.sizeX;
			for(var i = this.sizeX; i < size; ++i) {
				this.nodes[i] = new Array();
				
				for(var j = 0; j < this.sizeY; ++j) {
					this.nodes[i][j] = new Node("water", "");
				}
			}
		}
		
		// Always update size
		this.sizeX = size;
	}
	
	this.updateYSize = function(size) {
		// New Y size is bigger, create new nodes
		if(size > this.sizeY) {
			var sizeDif = size - this.sizeY;
			for(var i = 0; i < this.sizeX; ++i) {
				for(var j = this.sizeY; j < size; ++j) {
					this.nodes[i][j] = new Node("water", "");
				}
			}
		}
		
		// Always update size
		this.sizeY = size;
	}
	
	this.addElement = function(mouseX, mouseY, element) {
		nodeX = ( mouseX + this.locationX - ( mouseX + this.locationX ) % 50 ) / 50;
		nodeY = ( mouseY + this.locationY - ( mouseY + this.locationY ) % 50 ) / 50;
		
		if(nodeX < this.sizeX && nodeY < this.sizeY) {
			elementData = game.pictures.returnData(element);
			if(elementData.type == 'land') {
				this.nodes[nodeX][nodeY].tile.land = element;
			}
			
			else if(elementData.type == 'object') {
				this.nodes[nodeX][nodeY].tile.object = element;
			}
		}
	}

	this.draw = function() {
		for(var i = 0; i < this.sizeX; ++i) {
			for(var j = 0; j < this.sizeY; ++j) {
				this.nodes[i][j].draw(this.locationX + i * this.tileSize, this.locationY + j * this.tileSize);
			}
		}
	}
	
	this.init = function(sizeX, sizeY) {
		this.sizeX = sizeX;
		this.sizeY = sizeY;
	
		// Initialize nodes
		this.nodes = new Array();
		for(var i = 0; i < this.sizeX; ++i) {
			this.nodes[i] = new Array();
			
			for(var j = 0; j < this.sizeY; ++j) {
				this.nodes[i][j] = new Node("sand", "");
			}
		}
	}
}

function Unit() {
	this.type;

	this.draw = function() {
		
	}
}

function Editor() {
	this.width = 200;
	this.mod = "editor";
	
	// Map creation settings
	this.minSize = 10;
	this.maxSize = 100;
	
	// Map size button settings
	this.sizeButtonWidth = 30;
	this.sizeButtonHeight = 20;
	this.sizeButtonX = c.width - 130;
	this.sizeButtonY = 70;
	this.lowerMinus = 15;
	
	// Editor settings
	this.objects = new Array('sand', 'grass', 'water', 'road_straight', 'building1', 'building2', 'tree1', 'mountain');
	this.page = 0;
	this.disBetweenPics = 10;
	this.editorX = c.width - this.width + 15;
	this.editorY = 60;
	this.amountOfObjects = 0;

	this.draw = function() {
		// Update needed information in case of window resize
		this.sizeButtonX = c.width - 130;
		this.editorX = c.width - this.width + 15;
	
		// Editor bar's background
		ctx.fillStyle = "#1F7A99";
		ctx.fillRect(c.width - this.width, 0, this.width, c.height);
		ctx.strokeStyle = "#000000";
		ctx.strokeRect(c.width - this.width, 1, this.width - 1, c.height - 2);
		
		// Rectangle drawn behind passive mod topic
		var recX = 0;
		if(this.mod == "editor") { recX = 100; }
		ctx.fillStyle = "#13495C";
		ctx.fillRect(c.width - this.width + recX, 0, this.width - 100, 35);
		ctx.strokeStyle = "#000000";
		ctx.strokeRect(c.width - this.width + recX, 1, this.width - 100, 35);
		
		// Editor text
		ctx.font = "18pt Calibri";
		ctx.fillStyle = "#000000";
		ctx.fillText( 'Editor', c.width - 190, 25 );
		
		// Settings text
		ctx.font = "18pt Calibri";
		ctx.fillText( 'Settings', c.width - 90, 25 );
		
		// Settings page
		if(this.mod == "settings") {
			// Map size text
			ctx.font = "18pt Calibri";
			ctx.fillText( 'Map size', c.width - 195, 60 );

			ctx.font = "15pt Calibri";

			ctx.fillText( 'X: ' + game.map.sizeX, c.width - 193, 87 );
			ctx.fillText( 'Y: ' + game.map.sizeY, c.width - 193, 122 );
			
			// Map size buttons
			for(var i = 0; i < 2; ++i) {
				ctx.strokeStyle = "#000000";
				ctx.fillStyle = "#FF3300";
				var buttonOffset = i*(this.lowerMinus + this.sizeButtonHeight);
				ctx.fillRect(this.sizeButtonX, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.strokeRect(this.sizeButtonX, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.fillRect(this.sizeButtonX + 30, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.strokeRect(this.sizeButtonX + 30, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.fillStyle = "#009933";
				ctx.fillRect(this.sizeButtonX + 60, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.strokeRect(this.sizeButtonX + 60, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.fillRect(this.sizeButtonX + 90, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.strokeRect(this.sizeButtonX + 90, this.sizeButtonY + buttonOffset, this.sizeButtonWidth, this.sizeButtonHeight);
				ctx.font = "12pt Calibri";
				ctx.fillStyle = "#000000";
				ctx.fillText( '-10', this.sizeButtonX + 4, this.sizeButtonY + 15 + buttonOffset );
				ctx.fillText( '-1', this.sizeButtonX + 8 + 30, this.sizeButtonY + 15 + buttonOffset );
				ctx.fillText( '+1', this.sizeButtonX + 7 + 60, this.sizeButtonY + 15 + buttonOffset );
				ctx.fillText( '+10', this.sizeButtonX + 3 + 90, this.sizeButtonY + 15 + buttonOffset );
			}
		}
		
		// Editor page
		if(this.mod == "editor") {
			this.amountOfObjects = this.objects.length - this.page * 9;
			if(this.amountOfObjects > 9) {
				this.amountOfObjects = 9;
			}
			for(var i = this.page * 9; i < this.page * 9 + this.amountOfObjects; ++i) {
				if(i < this.amountOfObjects) {
					var locX = this.editorX + i % 3 * (game.map.tileSize + this.disBetweenPics);
					var locY = this.editorY + ( (i - i % 3) / 3 ) % 3 * (game.map.tileSize + this.disBetweenPics);
					ctx.drawImage(game.pictures.returnPicture(this.objects[i]), locX, locY);
					ctx.strokeRect(locX - 1, locY - 1, game.map.tileSize + 2, game.map.tileSize + 2);
				}
			}
			
			// Buttons in editor
			ctx.strokeStyle = "#000000";
			ctx.font = "15pt Calibri";
			ctx.strokeRect(this.editorX, this.editorY + 180, 80, 25);
			ctx.strokeRect(c.width - 95, this.editorY + 180, 80, 25);
			ctx.strokeRect(this.editorX, this.editorY + 215, 170, 25);
			ctx.fillText( 'Selector', this.editorX + 50, this.editorY + 235 );
		}
	}
}

function MouseEvents() {
	// Mouse information
	this.coordX;
	this.coordY;
	this.downCoordX = 0;
	this.downCoordY = 0;
	this.out = false;
	this.down = false;
	
	// Variables for moving map
	this.movedDuringDown = false;
	this.originalX = 0;
	this.originalY = 0;
	this.originalMapX = 0;
	this.originalMapY = 0;
	
	// Updates offsets to correct values.
	this.updateCoordinates = function(mouseRealX, mouseRealY) {
		this.coordX = mouseRealX - c.offsetLeft + c.scrollLeft;
		this.coordY = mouseRealY - c.offsetTop + c.scrollTop;
	}
	
	this.wasPressedDown = function(mouseRealX, mouseRealY) {
		this.updateCoordinates(mouseRealX, mouseRealY);
		this.mouseDownCoordX = this.coordX;
		this.mouseDownCoordY = this.coordY;
	}
}

function Game() {
	this.units;
	this.loader = new Loader();
	this.map = new Map();
	this.mouse = new MouseEvents();
	this.pictures = new Pictures();
	this.editor = new Editor();
	
	// Variable that knows what picture should be drawn as a selector
	this.selector = 'selector';
	
	this.mod = 'editor';

	this.draw = function() {
		// Background
		ctx.fillStyle = "#308ED3";
		ctx.fillRect(0, 0, c.width, c.height);
		
		// Draw map
		this.map.draw();

		// Draw selector
		if(!this.mouse.out && !(game.mod == 'editor' && this.mouse.coordX > c.width - this.editor.width - 1)) {
			var selectorX = this.mouse.coordX - (this.mouse.coordX - this.map.locationX) % 50;
			var selectorY = this.mouse.coordY - (this.mouse.coordY - this.map.locationY) % 50;
			ctx.drawImage(this.pictures.returnPicture(this.selector), selectorX, selectorY);
		}
		
		if(game.mod == 'editor') {
			this.editor.draw();
		}
	}
	
	// Initializes the game
	this.init = function() {
		var mapSizeX = 10;
		var mapSizeY = 10;
		this.map.init(mapSizeX, mapSizeY);
		
		this.draw();
	}
}

function mouseDragged() {
	// If mouse is down and mouse moved much enough, map is moved.
	if(Math.abs(game.mouse.originalX - game.mouse.coordX) + Math.abs(game.mouse.originalY - game.mouse.coordY) > 5) {
		game.mouse.movedDuringDown = true;
	}

	// Moving playing area
	if(game.mouse.movedDuringDown && (game.mod == "play" || (game.mod == "editor" && game.mouse.coordX < c.width - game.editor.width))) {
		var locX = game.mouse.originalMapX + game.mouse.coordX - game.mouse.originalX;
		var locY = game.mouse.originalMapY + game.mouse.coordY - game.mouse.originalY;
			
		if(locX <= 0) {
			game.map.locationX = locX;
		}
		if(locY <= 0) {
			game.map.locationY = locY;
		}
	}
}

// Event listener for mouse move
c.addEventListener('mousemove', function(e) {
	e.preventDefault();

	// Don't do anything if loader isn't ready
	if(!game.loader.loaded) {
		return;
	}

	// Update coordinates in game-class on mouse move.
	game.mouse.updateCoordinates(e.pageX, e.pageY);

	if(game.mouse.down) {
		mouseDragged();
	}
	
	game.draw();
	
	return;
});

// Event listener for mouse down
c.addEventListener('mousedown', function(e) {
	e.preventDefault();

	// Don't do anything if loader isn't ready
	if(!game.loader.loaded) {
		return;
	}

	game.mouse.down = true;
	game.mouse.originalX = game.mouse.coordX;
	game.mouse.originalY = game.mouse.coordY;
	game.mouse.originalMapX = game.map.locationX;
	game.mouse.originalMapY = game.map.locationY;
	game.mouse.wasPressedDown(e.pageX, e.pageY);
	game.mouse.movedDuringDown = false;
	
	return;
});

function mapSizeButtonEvents() {
	// If mouse is too much left or right, button was not pressed.
	if(game.mouse.coordX < game.editor.sizeButtonX || game.mouse.coordX > game.editor.sizeButtonX + game.editor.sizeButtonWidth * 4) {
		return;
	}
	
	// If mouse is too high of too low, button was not pressed.
	if(game.mouse.coordY < game.editor.sizeButtonY || game.mouse.coordY > game.editor.sizeButtonY + game.editor.sizeButtonHeight * 2 + game.editor.lowerMinus) {
		return
	}
	
	// Map X size buttons
	if(game.mouse.coordY < game.editor.sizeButtonY + game.editor.sizeButtonHeight) {
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth) { // - 10
			if(game.map.sizeX - 10 >= game.editor.minSize) {
				game.map.updateXSize(game.map.sizeX - 10);
			} else {
				game.map.updateXSize(game.editor.minSize);
			}
			return;
		}
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth * 2) { // -1
			if(game.map.sizeX - 1 >= game.editor.minSize) {
				game.map.updateXSize(game.map.sizeX - 1);
			}
			return;
		}
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth * 3) { // +1
			if(game.map.sizeX + 1 <= game.editor.maxSize) {
				game.map.updateXSize(game.map.sizeX + 1);
			}
			return;
		}
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth * 4) { // +10
			if(game.map.sizeX + 10 <= game.editor.maxSize) {
				game.map.updateXSize(game.map.sizeX + 10);
			} else {
				game.map.updateXSize(game.editor.maxSize);
			}
			return;
		}
	}
	
	// Map Y size buttons
	if(game.mouse.coordY > game.editor.sizeButtonY + game.editor.sizeButtonHeight + game.editor.lowerMinus) {
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth) { // -10
			if(game.map.sizeY - 10 >= game.editor.minSize) {
				game.map.updateYSize(game.map.sizeY - 10);
			} else {
				game.map.updateYSize(game.editor.minSize);
			}
			return;
		}
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth * 2) { // -1
			if(game.map.sizeY - 1 >= game.editor.minSize) {
				game.map.updateYSize(game.map.sizeY - 1);
			}
			return;
		}
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth * 3) { // +1
			if(game.map.sizeY + 1 <= game.editor.maxSize) {
				game.map.updateYSize(game.map.sizeY + 1);
			}
			return;
		}
		if(game.mouse.coordX < game.editor.sizeButtonX + game.editor.sizeButtonWidth * 4) { // +10
			if(game.map.sizeY + 10 <= game.editor.maxSize) {
				game.map.updateYSize(game.map.sizeY + 10);
			} else {
				game.map.updateYSize(game.editor.maxSize);
			}
			return;
		}
	}
}

// Chooses the object that will be added to map
function chooseEditorElement() {
	for(var i = game.editor.page * 9; i < game.editor.page * 9 + game.editor.amountOfObjects; ++i) {
		if(i < game.editor.amountOfObjects) {
			var locX = game.editor.editorX + i % 3 * (game.map.tileSize + game.editor.disBetweenPics);
			var locY = game.editor.editorY + ( (i - i % 3) / 3 ) % 3 * (game.map.tileSize + game.editor.disBetweenPics);
			
			if(game.mouse.coordX > locX && game.mouse.coordX < locX + game.map.tileSize
						&& game.mouse.coordY > locY && game.mouse.coordY < locY + game.map.tileSize) {
				game.selector = game.editor.objects[i];
			}
			
			ctx.drawImage(game.pictures.returnPicture(game.editor.objects[i]), locX, locY);
			ctx.strokeRect(locX - 1, locY - 1, game.map.tileSize + 2, game.map.tileSize + 2);
		}
	}
	
	// Select selector
	if(game.mouse.coordX > game.editor.editorX && game.mouse.coordX < game.editor.editorX + 170
						&& game.mouse.coordY > game.editor.editorY + 215 && game.mouse.coordY < game.editor.editorY + 240) {
		game.selector = "selector";			
	}
}

// Event listener for mouse up
c.addEventListener('mouseup', function(e) {
	// Do nothing if loader isn't ready
	if(!game.loader.loaded) {
		return;
	}
	
	// Mouse is not down.
	game.mouse.down = false;
	
	// Do nothing if mouse was dragged
	if(game.mouse.movedDuringDown) {
		return;
	}
	
	// In editor change between settings and editor
	if(game.mod == "editor" && game.mouse.coordY < 35 && game.mouse.coordX > c.width - game.editor.width) {
		if(game.mouse.coordX < c.width - 100) {
			game.editor.mod = "editor";
		} else {
			game.editor.mod = "settings";
			game.selector = "selector";
		}
	}
	
	// Set map size in map settings
	if(game.mod == "editor" && game.editor.mod == "settings") {
		mapSizeButtonEvents();
	}
	
	// Edit map elements
	if(game.mod == "editor" && game.editor.mod == "editor") {
		chooseEditorElement();
	}
	
	// Add new elements to map
	if(game.mod == "editor" && game.editor.mod == "editor" && game.selector != "selector" && game.mouse.coordX < c.width - game.editor.width) {
		game.map.addElement(game.mouse.coordX, game.mouse.coordY, game.selector);
	}
	
	game.draw();
});

// Event listener for mouse out
c.addEventListener('mouseout', function(e) {

	// Don't do anything if loader isn't ready
	if(!game.loader.loaded) {
		return;
	}
	
	game.mouse.out = true;
	game.mouse.down = false;
	game.draw();
});

// Event listener for mouse over
c.addEventListener('mouseover', function(e) {
	// Don't do anything if loader isn't ready
	if(!game.loader.loaded) {
		return;
	}
	
	game.mouse.out = false;
});
/*
window.addEventListener("resize",function(){
	ctx.canvas.width = document.getElementById("main").offsetWidth;
	ctx.canvas.height = document.getElementById("main").offsetWidth * (9/16);
});

window.onResize(function(){
	ctx.canvas.width = document.getElementById("main").offsetWidth;
	ctx.canvas.height = document.getElementById("main").offsetWidth * (9/16);
});
*/
$(window).resize(function(){
	ctx.canvas.width = document.getElementById("main").offsetWidth;
	ctx.canvas.height = document.getElementById("main").offsetWidth * (9/16);
});