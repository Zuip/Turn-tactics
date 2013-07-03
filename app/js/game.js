var c = document.getElementById("gameArea");
var ctx = c.getContext("2d");
ctx.fillStyle = "#FF0000";
ctx.fillRect(0, 0, c.width, c.height);

function Tile() {
	this.land;
	this.object;
	this.coordX;
	this.coordY;
	this.image;
	
	this.draw = function() {
		ctx.drawImage(image,0,0);
	};
	
	this.init = function(landType, objectType) {
		var objectImage = new Image();;
		image = new Image();

		if(landType == 'sand') {
			image.src = APP_PATH + '/images/sand.png';
		} else if(landType == 'grass') {
			image.src = APP_PATH + '/images/grass.png';
		} else if(landType == 'water') {
			image.src = APP_PATH + '/images/water.png';
		}


		if(objectType == 'building1') {
			objectImage.src = APP_PATH + '/images/building1.png';/*
			var imageData = ctx.getImageData(5, 5, 10, 10);
			//var imageData2 = objectImage.getImageData(5, 5, 49, 49);
			var data = imageData.data;
			//var data2 = imageData.data;
			for(var i = 0; i < 2500; ++i) {
				data[i*4 + 1] = 0;
				data[i*4 + 2] = 0;
				data[i*4 + 3] = 0;
			}
			ctx.putImageData(imageData, 10, 10);*/
		}
	}
}

function Node() {
	this.unit;
	this.tile;
}

function Map() {
	this.nodes;
	this.size;

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
	this.map;
	
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
		//map = newArray();
		var tile = new Tile();
		tile.init('sand', 'building1');
		tile.draw();
	}
}

var game = new Game();
game.init();

c.addEventListener('mousemove', function(e) {
	// Update coordinates in game-class on mouse move.
	game.updateCoordinates(e.pageX, e.pageY);
});

c.addEventListener('resize', function(e) {
	alert("Woo!");
});