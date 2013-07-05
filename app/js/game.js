var c = document.getElementById("gameArea");
var ctx = c.getContext("2d");

var game = new Game();
game.loader.init();

// Pictures of land, water, roads, trees, buildings and mountain.
function TilePictures() {
	this.amountOfPictures = 0;

	this.sand = new Image(); ++this.amountOfPictures;
	this.grass = new Image(); ++this.amountOfPictures;
	this.water = new Image(); ++this.amountOfPictures;
	this.road_straight = new Image(); ++this.amountOfPictures;
	this.road_intersection1 = new Image(); ++this.amountOfPictures;
	this.road_intersection2 = new Image(); ++this.amountOfPictures;
	this.road_curve = new Image(); ++this.amountOfPictures;
	this.road_end = new Image(); ++this.amountOfPictures;
	this.building1 = new Image(); ++this.amountOfPictures;
	this.building2 = new Image(); ++this.amountOfPictures;
	this.tree1 = new Image(); ++this.amountOfPictures;
	this.mountain = new Image(); ++this.amountOfPictures;
	
	this.loadPictures = function() {
		this.sand.src = APP_PATH + '/images/sand.png';
		this.grass.src = APP_PATH + '/images/grass.png';
		this.water.src = APP_PATH + '/images/water.png';
		this.road_straight.src = APP_PATH + '/images/road_straight.png';
		this.road_intersection1.src = APP_PATH + '/images/road_intersection1.png';
		this.road_intersection2.src = APP_PATH + '/images/road_intersection2.png';
		this.road_curve.src = APP_PATH + '/images/road_curve.png';
		this.road_end.src = APP_PATH + '/images/road_end.png';
		this.building1.src = APP_PATH + '/images/building1.gif';
		this.building2.src = APP_PATH + '/images/building2.png';
		this.tree1.src = APP_PATH + '/images/tree1.png';
		this.mountain.src = APP_PATH + '/images/mountain.png';
	}
}

function Loader() {
	this.amountOfLoadable;
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
			loaded = true;
			game.init();
		}
	}

	this.init = function() {
		this.amountOfLoadable = game.map.pictures.amountOfPictures;
	
		// Load map pictures
		game.map.pictures.loadPictures();
		game.map.pictures.sand.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.grass.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.water.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.road_straight.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.road_intersection1.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.road_intersection2.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.road_curve.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.road_end.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.building1.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.building2.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.tree1.onload = function(){ game.loader.haveLoaded(); }
		game.map.pictures.mountain.onload = function(){ game.loader.haveLoaded(); }
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
			ctx.drawImage(game.map.pictures.sand, this.coordX, this.coordY);
		} else if(land == 'grass') {
			ctx.drawImage(game.map.pictures.grass, this.coordX, this.coordY);
		} else if(land == 'water') {
			ctx.drawImage(game.map.pictures.water, this.coordX, this.coordY);
		} else {
			ctx.drawImage(game.map.pictures.water, this.coordX, this.coordY);
		}
		
		// Draw buildings, roads, trees and mountains
		if(object == 'road_straight') {
			ctx.drawImage(game.map.pictures.road_straight, this.coordX, this.coordY);
		} else if(object == 'road_intersection1') {
			ctx.drawImage(game.map.pictures.road_intersection1, this.coordX, this.coordY);
		} else if(object == 'road_intersection2') {
			ctx.drawImage(game.map.pictures.road_intersection2, this.coordX, this.coordY);
		} else if(object == 'road_curve') {
			ctx.drawImage(game.map.pictures.road_curve, this.coordX, this.coordY);
		} else if(object == 'road_end') {
			ctx.drawImage(game.map.pictures.road_end, this.coordX, this.coordY);
		} else if(object == 'building1') {
			ctx.drawImage(game.map.pictures.building1, this.coordX, this.coordY);
		} else if(object == 'building2') {
			ctx.drawImage(game.map.pictures.buildin2, this.coordX, this.coordY);
		} else if(object == 'tree1') {
			ctx.drawImage(game.map.pictures.tree1, this.coordX, this.coordY);
		} else if(object == 'mountain') {
			ctx.drawImage(game.map.pictures.mountain, this.coordX, this.coordY);
		}
	};
	
	this.init = function(initLand, initObject) {
		this.pictures.loadPictures();
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
	this.sizeX;
	this.sizeY;
	this.pictures = new TilePictures();

	this.draw = function() {
		
	};
}

function Unit() {
	this.type;

	this.draw = function() {
		
	};
}

function Game() {
	this.units;
	this.map = new Map();
	this.loader = new Loader();
	
	// Mouse coordinates in canvas
	this.mouseX;
	this.mouseY;

	// Updates offsets to correct values.
	this.updateCoordinates = function(mouseRealX, mouseRealY) {
		mouseX = mouseRealX - c.offsetLeft + c.scrollLeft;
		mouseY = mouseRealY - c.offsetTop + c.scrollTop;
	};

	// Initializes the game
	this.init = function() {
		//
	}
}

c.addEventListener('mousemove', function(e) {
	// Update coordinates in game-class on mouse move.
	game.updateCoordinates(e.pageX, e.pageY);
});