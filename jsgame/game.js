var config = {
    type: Phaser.AUTO,
    width: Math.min(window.innerWidth, window.outerWidth),
    height: Math.min(window.innerHeight, window.outerHeight),
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },    
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    debug: true
};

var game = new Phaser.Game(config);

var backgroundLayer;
var collisionLayer;
var itemsLayer;

var enemyVelocityX = 0;
var enemyVelocityY = 0;

var prevEnemyPosX = 0;
var prevEnemyPosY = 0;


var map;
var coinsCollected = 0;
var bestCollected = 0;
var text;
var player;
var items;
var bombs;
var enemy;
var gameOver = false;
var move_ctl = false;
var left,right,up,down;
var counter = 0;

var spawnNewItem = false;

var isCollision;

var seconds;

const itemsWidth = 7;
const itemsHeight = 17;

function preload ()
{
    this.load.spritesheet('robot', 'assets/lego.png',
        { frameWidth: 37, frameHeight: 48 } ); 

    this.load.spritesheet('items', 'assets/items.png', { frameWidth: 32, frameHeight: 32 } ); 

    this.load.image('tiles', 'assets/map_tiles.png');
    this.load.tilemapTiledJSON('json_map', 'assets/json_map.json');  

    this.load.audio('pickup','assets/audio/pick_up.wav');
    this.load.audio('kill','assets/audio/kill.wav');
    this.load.audio('record','assets/audio/record.wav');
}

function resize (width, height)
{
/*  if (width === undefined) { width = game.config.width; }
    if (height === undefined) { height = game.config.height; }
    //console.log('W: ' +  width + ', H: ' + height); 
    if (width < backgroundLayer.width || height < backgroundLayer.height) {
		map.scene.cameras.main.zoom = 0.5;
		map.scene.cameras.main.setPosition(-width/2, -height/2);
  } else {
		map.scene.cameras.main.zoom = 1;
		map.scene.cameras.main.setPosition(0,0);
	}
    //backgroundLayer.setSize(width, height);
    map.scene.cameras.resize(width/map.scene.cameras.main.zoom, height/map.scene.cameras.main.zoom);
	if (game.renderer.type === Phaser.WEBGL){	
		game.renderer.resize(width, height);
	}
    updateText();
*/
}		

function create ()
{
    isCollision = 0;
    map = this.make.tilemap({ key: 'json_map' });
    
    //F: 'map_tiles' - name of the tilesets in json_map.json
    //F: 'tiles' - name of the image in load.images()
    var tiles = map.addTilesetImage('map_tiles','tiles');
    

    backgroundLayer = map.createDynamicLayer('background', tiles, 0, 0);
    collisionLayer = map.createDynamicLayer('collision', tiles, 0, 0).setVisible(true);
    collisionLayer.setCollisionByExclusion([ -1 ]);
    
    items = this.physics.add.sprite(100, 150, 'items', itemsWidth*itemsHeight - 1);
   // items.setBounce(0.1);
    
    player = this.physics.add.sprite(100, 450, 'robot');
    player.setBounce(0.1);
    
    enemy = this.physics.add.sprite(100,100,'robot');
    enemy.setBounce(0.1);
    enemy.setAlpha(0.5);

   
    
    this.physics.add.collider(player, collisionLayer);
    this.physics.add.overlap(player, backgroundLayer);

    this.physics.add.collider(enemy, collisionLayer);
    this.physics.add.overlap(enemy, backgroundLayer);
    
    //F:set collision range 
    backgroundLayer.setCollisionBetween(1, 25);    
       
    //F:Checks to see if the player overlaps with any of the items, 
    //f:if he does call the collisionHandler function
    this.physics.add.overlap(player, items, collisionHandler);
    this.physics.add.overlap(player,enemy,resetScore);
    
    
    //  this.cameras.main.startFollow(player);    
 
    text = this.add.text(game.canvas.width/2, 16, '', {
        fontSize: '3em',
        fontFamily: 'fantasy',
        align: 'center',
        boundsAlignH: "center", 
        boundsAlignV: "middle", 
        fill: '#ffffff'
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0);    
    updateText();
    
    this.anims.create({
        key: 'run',
        frames: this.anims.generateFrameNumbers('robot', { start: 0, end: 16 }),
        frameRate: 20,
        repeat: -1
    }); 
    
    cursors = this.input.keyboard.createCursorKeys();  

	this.input.on('pointerdown', function (pointer) { 
		move_ctl = true; 
		pointer_move(pointer); 
	});
	this.input.on('pointerup', function (pointer) { move_ctl = false; reset_move()});
	this.input.on('pointermove', pointer_move);
	window.addEventListener('resize', function (event) {
		resize(Math.min(window.innerWidth, window.outerWidth), Math.min(window.innerHeight, window.outerHeight));
	}, false);		
    resize(Math.min(window.innerWidth, window.outerWidth), Math.min(window.innerHeight, window.outerHeight));

    seconds = new Date();
    seconds.setSeconds(seconds.getSeconds() + 10);

    if(localStorage.getItem('best') !== null)
    {
        bestCollected = localStorage.getItem('best');
    }

}



function pointer_move(pointer) {
        var dx=dy=0;
        //console.log(pointer);
	    //var min_pointer=20; // virtual joystick
		var min_pointer = (player.body.width + player.body.height) / 4 ; // following pointer by player
		if (move_ctl) {
			reset_move();
			// virtual joystick
 			//dx =  (pointer.x - pointer.downX); 
			//dy = (pointer.y - pointer.downY);
			
			// following pointer by player
			dx = (pointer.x / map.scene.cameras.main.zoom - player.x);
			dy = (pointer.y / map.scene.cameras.main.zoom - player.y);
		    //console.log( 'Xp:'  + player.x + ', Xc:'  + pointer.x + ', Yp:' + player.y + ', Yc:' + pointer.y );
			
			if (Math.abs(dx) > min_pointer) {
				left = (dx < 0); 
				right = !left; 
			} else { 
				left = right = false;
			}
			if (Math.abs(dy) > min_pointer) {
				up = (dy < 0); 
				down = !up; 
			} else { 
				up = down = false;
			}
		}
		//console.log( 'L:'  + left + ', R:'  + right + ', U:' + up + ', D:' + down, ', dx: ' + dx + ',dy: ' + dy );
}

function reset_move() {
  up = down = left = right = false;
}

function update ()
{     
	// Needed for player following the pointer:
	if (move_ctl) { pointer_move(game.input.activePointer); }
	
    // Horizontal movement
    if (cursors.left.isDown || left)
    {
        player.body.setVelocityX(-150);
        player.angle = 90;
        player.anims.play('run', true); 
    }
    else if (cursors.right.isDown || right)
    {
        player.body.setVelocityX(150);
        player.angle = 270;
        player.anims.play('run', true); 
    }
    else
    {
        player.body.setVelocityX(0);
    }

    // Vertical movement
    if (cursors.up.isDown || up)
    {
        player.body.setVelocityY(-150);
        player.angle = 180;
        player.anims.play('run', true); 
    }
    else if (cursors.down.isDown || down)
    {
        player.body.setVelocityY(150);
        player.anims.play('run', true); 
        player.angle = 0;
    }
    else
    {
        player.body.setVelocityY(0);
    }

    if(spawnNewItem) 
    {
        var rand = Math.floor(Math.random()*1000);
        var xCor = 100 + rand % ((backgroundLayer.width)-200);
        var yCor = 100 + rand % ((backgroundLayer.height)-200);
        var itemIndex = rand % (itemsWidth*itemsHeight - 1);

        items = this.physics.add.sprite(xCor, yCor, 'items', itemIndex);
        this.physics.add.overlap(player, items, collisionHandler);
        spawnNewItem = false;

        console.log("New Item spawned: " + itemIndex + " x: " + xCor + " y: " + yCor);
    }

    if((seconds - new Date())/1000 <= 0)
    {
        resetTimer();
        items.destroy(); 
        coinsCollected -=1;
        spawnNewItem = true;
    }


    if(counter %250 == 0 || (prevEnemyPosX == enemy.x && prevEnemyPosY == enemy.y))
    {
        enemyVelocityX=(Math.random() >= 0.5)? (-1*Math.random() * 100) -50  : (Math.random() * 100) + 50;
        enemyVelocityY = (Math.random() >= 0.5)? (-1*Math.random() * 100) -50  : (Math.random() * 100) + 50;
    }
    enemy.setVelocityX(enemyVelocityX);
    enemy.setVelocityY(enemyVelocityY);

    updateText();

    counter +=(counter>10000)? -1*counter:1;

    prevEnemyPosX = enemy.x;
    prevEnemyPosY = enemy.y;
}


function updateText ()
{
	text.setPosition(game.canvas.width/2 / map.scene.cameras.main.zoom, text.height);
    text.setText(
        'Seconds remaining: ' + (Math.floor((seconds - new Date())/1000)) + ' Coins collected: ' + coinsCollected +
        ' Best Score: ' + localStorage.getItem('best') //+ '    Best result: ' + bestCollected
    );
    text.setColor('white');
}


function resetTimer()
{
    seconds.setSeconds((seconds.getSeconds() - (seconds - new Date())/1000) + 10);
}

function resetScore()
{
    coinsCollected = 0;
    player.x = backgroundLayer.width/2;
    player.y = backgroundLayer.height/2;
    game.sound.play('kill');
}


// If the player collides with items
function collisionHandler (player, item) {   
    
    coinsCollected += 1;
    if (coinsCollected > bestCollected)
    {
        bestCollected = coinsCollected;
        localStorage.setItem('best',bestCollected);
        game.sound.play('record');
    }
    game.sound.play('pickup');

    resetTimer();
    updateText();
    items.destroy();  

    spawnNewItem = true;

  //  item.disableBody(true, true);
      
    /*if (item.body.enable == false)
    {
        var h = map.heightInPixels-40;
        var w = map.widthInPixels-40;
        var itemX = Phaser.Math.Between(40, w);
        var itemY = Phaser.Math.Between(40, h);
        var itemID = Phaser.Math.Between(0, 118);
        item.setFrame(itemID);
        item.enableBody(true, itemX, itemY, true, true);
    }*/    
}
