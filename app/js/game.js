var c = document.getElementById("gameArea");
var ctx = c.getContext("2d");

function Tile() {
	this.type;

	this.draw = function() {
		
	};
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
	this.offsetX;
	this.offsetY;

	// Updates offsets to correct values.
	this.updateOffset = function() {
		offsetX = /* c.offsetLeft */ - c.scrollLeft;
		offsetY = c.offsetTop - c.scrollTop;
	};
	
	this.drawOffset = function() {
		ctx.fillStyle = "#FF0000";
		ctx.fillRect(0, 0, c.width, c.height);
		ctx.fillStyle = "blue";
		ctx.font = "bold 16px Arial";
		ctx.fillText("X: " + offsetX, 100, 100);
		ctx.fillText("Y: " + offsetY, 100, 150);
	};

	// Initializes the game
	this.init = function() {
		this.updateScrollPos();
	}
}

var game = new Game();

c.addEventListener('mousemove', function(e) {
	game.updateOffset();
	//game.offsetX += e.offsetX;
	//game.offsetY += e.offsetY;
	game.drawOffset(e);
});