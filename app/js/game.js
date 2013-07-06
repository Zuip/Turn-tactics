var c = document.getElementById("gameArea");
var ctx = c.getContext("2d");

var game = new Game();
game.loader.init();

var gamemod = "editor";

// Pictures of land, water, roads, trees, buildings and mountain.
function TilePictures() {
	this.amountOfPictures = 0;

	this.sand;
	this.grass;
	this.water;
	this.road_straight;
	this.road_intersection1;
	this.road_intersection2;
	this.road_curve;
	this.road_end;
	this.building1;
	this.building2;
	this.tree1;
	this.mountain;
	this.selector;
	
	this.loadPictures = function() {
		// Sand
		this.sand = new Image();
		++this.amountOfPictures;
		this.sand.src = APP_PATH + '/images/sand.png';
		this.sand.onload = function(){ game.loader.haveLoaded(); }
		
		// Grass
		this.grass = new Image();
		++this.amountOfPictures;
		this.grass.src = APP_PATH + '/images/grass.png';
		this.grass.onload = function(){ game.loader.haveLoaded(); }
		
		// Water
		this.water = new Image();
		++this.amountOfPictures;
		this.water.src = APP_PATH + '/images/water.png';
		this.water.onload = function(){ game.loader.haveLoaded(); }
		
		// Straight road
		this.road_straight = new Image();
		++this.amountOfPictures;
		this.road_straight.src = APP_PATH + '/images/road_straight.png';
		this.road_straight.onload = function(){ game.loader.haveLoaded(); }
		
		// Intersection of four roads
		this.road_intersection1 = new Image();
		++this.amountOfPictures;
		this.road_intersection1.src = APP_PATH + '/images/road_intersection1.png';
		this.road_intersection1.onload = function(){ game.loader.haveLoaded(); }
		
		// Intersection of three roads
		this.road_intersection2 = new Image();
		++this.amountOfPictures;
		this.road_intersection2.src = APP_PATH + '/images/road_intersection2.png';
		this.road_intersection2.onload = function(){ game.loader.haveLoaded(); }
		
		// Curve road
		this.road_curve = new Image();
		++this.amountOfPictures;
		this.road_curve.src = APP_PATH + '/images/road_curve.png';
		this.road_curve.onload = function(){ game.loader.haveLoaded(); }
		
		// End of the road
		this.road_end = new Image();
		++this.amountOfPictures;
		this.road_end.src = APP_PATH + '/images/road_end.png';
		this.road_end.onload = function(){ game.loader.haveLoaded(); }
		
		// Apartment building
		this.building1 = new Image();
		++this.amountOfPictures;
		this.building1.src = APP_PATH + '/images/building1.gif';
		this.building1.onload = function(){ game.loader.haveLoaded(); }
		
		// House
		this.building2 = new Image();
		++this.amountOfPictures;
		this.building2.src = APP_PATH + '/images/building2.png';
		this.building2.onload = function(){ game.loader.haveLoaded(); }
		
		// Leaf tree
		this.tree1 = new Image();
		++this.amountOfPictures;
		this.tree1.src = APP_PATH + '/images/tree1.png';
		this.tree1.onload = function(){ game.loader.haveLoaded(); }
		
		// Mountain
		this.mountain = new Image();
		++this.amountOfPictures;
		this.mountain.src = APP_PATH + '/images/mountain.png';
		this.mountain.onload = function(){ game.loader.haveLoaded(); }
		
		// Selector
		this.selector = new Image();
		++this.amountOfPictures;
		this.selector.src = APP_PATH + '/images/selector.png';
		this.selector.onload = function(){ game.loader.haveLoaded(); }
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
		game.map.tilePictures.loadPictures();
		
		// Get amount of loadable data
		this.amountOfLoadable = game.map.tilePictures.amountOfPictures;
	}
}

function Tile() {
	this.land;
	this.object;
	this.coordX = 0;
	this.coordY = 0;
	this.terrainCost;
	this.defenceArea;
	
	this.draw = function() {
	
		// Draw land or water
		if(land == 'sand') {
			ctx.drawImage(game.map.tilePictures.sand, this.coordX, this.coordY);
		} else if(land == 'grass') {
			ctx.drawImage(game.map.tilePictures.grass, this.coordX, this.coordY);
		} else if(land == 'water') {
			ctx.drawImage(game.map.tilePictures.water, this.coordX, this.coordY);
		} else {
			ctx.drawImage(game.map.tilePictures.water, this.coordX, this.coordY);
		}
		
		// Draw buildings, roads, trees and mountains
		if(object == 'road_straight') {
			ctx.drawImage(game.map.tilePictures.road_straight, this.coordX, this.coordY);
		} else if(object == 'road_intersection1') {
			ctx.drawImage(game.map.tilePictures.road_intersection1, this.coordX, this.coordY);
		} else if(object == 'road_intersection2') {
			ctx.drawImage(game.map.tilePictures.road_intersection2, this.coordX, this.coordY);
		} else if(object == 'road_curve') {
			ctx.drawImage(game.map.tilePictures.road_curve, this.coordX, this.coordY);
		} else if(object == 'road_end') {
			ctx.drawImage(game.map.tilePictures.road_end, this.coordX, this.coordY);
		} else if(object == 'building1') {
			ctx.drawImage(game.map.tilePictures.building1, this.coordX, this.coordY);
		} else if(object == 'building2') {
			ctx.drawImage(game.map.tilePictures.buildin2, this.coordX, this.coordY);
		} else if(object == 'tree1') {
			ctx.drawImage(game.map.tilePictures.tree1, this.coordX, this.coordY);
		} else if(object == 'mountain') {
			ctx.drawImage(game.map.tilePictures.mountain, this.coordX, this.coordY);
		}
	}
	
	this.init = function(initLand, initObject) {
		this.tilePictures.loadPictures();
		land = initLand;
		object = initObject;
		/*
		if(objectType == 'building1') {
			objectImage.src = APP_PATH + '/images/building2.png';
			var imageData = ctx.getImageData(5, 5, 10, 10);
			var imageData2 = objectImage.getImageData(5, 5, 49, 49);
			var data = imageData.data;
			var data2 = imageData.data;
			for(var i = 0; i < 2500; ++i) {
				data[i*4 + 1] = 0;
				data[i*4 + 2] = 0;
				data[i*4 + 3] = 0;
			}
			ctx.putImageData(imageData, 10, 10);
		}

		ctx.fillStyle = "#00FF00";
		ctx.fillRect(50, 50, 50, 50);
		*/
	}
}

function Node() {
	this.unit;
	this.tile;
}

function Map() {
	this.nodes;
	this.sizeX = 0;
	this.sizeY = 0;
	this.tilePictures = new TilePictures();
	this.locationX = 0;
	this.locationY = 0;

	this.draw = function() {
		
	}
	
	this.init = function() {
		
	}
}

function Unit() {
	this.type;

	this.draw = function() {
		
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

	this.draw = function() {
		// Background
		ctx.fillStyle = "#308ED3";
		ctx.fillRect(0, 0, c.width, c.height);
		
		// Draws sand block, meant for demoing
		ctx.drawImage(this.map.tilePictures.sand, this.map.locationX + 200, this.map.locationY + 200);
		
		// Draw selector
		if(!this.mouse.out) {
			var selectorX = this.mouse.coordX - (this.mouse.coordX - this.map.locationX) % 50;
			var selectorY = this.mouse.coordY - (this.mouse.coordY - this.map.locationY) % 50;
			ctx.drawImage(this.map.tilePictures.selector, selectorX, selectorY);
		}
	}
	
	// Initializes the game
	this.init = function() {
		if(gamemod == "editor") {
			this.draw();
		}
	}
}

// Event listener for mouse move
c.addEventListener('mousemove', function(e) {
	// Update coordinates in game-class on mouse move.
	game.mouse.updateCoordinates(e.pageX, e.pageY);
	
	if(game.loader.loaded == true) {
		game.draw();
		
		// If mouse is down and mouse moved much enough, map is moved.
		if(game.mouse.down) {
			if(Math.abs(game.mouse.originalX - game.mouse.coordX) + Math.abs(game.mouse.originalY - game.mouse.coordY) > 10) {
				game.mouse.movedDuringDown = true;
			}
			if(game.mouse.movedDuringDown) {
				game.map.locationX = game.mouse.originalMapX + game.mouse.coordX - game.mouse.originalX;
				game.map.locationY = game.mouse.originalMapY + game.mouse.coordY - game.mouse.originalY;
			}
		}
	}
});

// Event listener for mouse down
c.addEventListener('mousedown', function(e) {
	if(game.loader.loaded == true) {
		game.mouse.down = true;
		game.mouse.originalX = game.mouse.coordX;
		game.mouse.originalY = game.mouse.coordY;
		game.mouse.originalMapX = game.map.locationX;
		game.mouse.originalMapY = game.map.locationY;
		game.mouse.wasPressedDown(e.pageX, e.pageY);
		game.mouse.movedDuringDown = false;
	}
});

// Event listener for mouse up
c.addEventListener('mouseup', function(e) {
	if(game.loader.loaded == true) {
		game.mouse.down = false;
	}
});

// Event listener for mouse out
c.addEventListener('mouseout', function(e) {
	if(game.loader.loaded == true) {
		game.mouse.out = true;
		game.draw();
	}
});

// Event listener for mouse over
c.addEventListener('mouseover', function(e) {
	if(game.loader.loaded == true) {
		game.mouse.out = false;
	}
});