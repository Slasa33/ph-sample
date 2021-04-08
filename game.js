var config = {
    type: Phaser.AUTO,
    width: Math.min(window.innerWidth, window.outerWidth),
    height: Math.min(window.innerHeight, window.outerHeight),
    backgroundColor: '#007A00',
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

var map;
var coinsCollected = 0;
var bestCollected = localStorage.getItem(1);
var text;
var player;
var items;
var bombs;
var explosion;
var gameOver = false;
var move_ctl = false;
var left,right,up,down;
var exp;
var themeConfig;


var isCollision;

function preload ()
{
    this.load.spritesheet('robot', 'assets/lego.png',
        { frameWidth: 37, frameHeight: 48 } ); 

    this.load.spritesheet('items', 'assets/items.png', { frameWidth: 32, frameHeight: 32 } );
    this.load.image('tiles', 'assets/map_tiles.png');
    this.load.tilemapTiledJSON('json_map', 'assets/json_map.json');
    this.load.spritesheet('bomb','assets/bomb.png',{ frameWidth: 32, frameHeight:32});
    this.load.spritesheet('explosion','assets/explosion.png',{ frameWidth: 32, frameHeight:32});
    this.load.audio('explosion_sound', 'assets/sounds/explosion.ogg');
    this.load.audio('pickup_sound', 'assets/sounds/pickup.ogg');
    this.load.audio('theme', 'assets/sounds/theme.mp3')

    this.load.image('explo', 'assets/explosion00.png');

    this.load.spritesheet('kaboom','assets/explode.png', {
        frameWidth: 128,
        frameHeight: 128
    });
    
}

function resize (width, height)
{
//     if (width === undefined) { width = game.config.width; }
//     if (height === undefined) { height = game.config.height; }
//     //console.log('W: ' +  width + ', H: ' + height); 
//     if (width < backgroundLayer.width || height < backgroundLayer.height) {
// 		map.scene.cameras.main.zoom = 0.5;
// 		map.scene.cameras.main.setPosition(-width/2, -height/2);
//   } else {
// 		map.scene.cameras.main.zoom = 1;
// 		map.scene.cameras.main.setPosition(0,0);
// 	}
//     //backgroundLayer.setSize(width, height);
//     map.scene.cameras.resize(width/map.scene.cameras.main.zoom, height/map.scene.cameras.main.zoom);
// 	if (game.renderer.type === Phaser.WEBGL){	
// 		game.renderer.resize(width, height);
// 	}
//     updateText();

}		
function create ()
{
    isCollision = 0;
    map = this.make.tilemap({ key: 'json_map' });
    //F: 'map_tiles' - name of the tilesets in json_map.json
    //F: 'tiles' - name of the image in load.images()
    var tiles = map.addTilesetImage('map_tiles','tiles');

    backgroundLayer = map.createDynamicLayer('background', tiles, 0, 0);
    collisionLayer = map.createDynamicLayer('collision', tiles, 0, 0)//.setVisible(false);
    collisionLayer.setCollisionByExclusion([ -1 ]);
    items = this.physics.add.sprite(400, 150, 'items', 0);
    items.setBounce(0.1);
    
    player = this.physics.add.sprite(400, 400, 'robot');
    player.setBounce(0.1);

    bombs = this.physics.add.group();
    this.physics.add.overlap(player, bombs, collisionBomb, null, this);

    explosion = this.physics.add.group();

    
    this.physics.add.collider(player, collisionLayer);
    this.physics.add.overlap(player, backgroundLayer);
    this.physics.add.collider(bombs, collisionLayer);
    
    //F:set collision range 
    backgroundLayer.setCollisionBetween(1, 25);    
       
    //F:Checks to see if the player overlaps with any of the items, 
    //f:if he does call the collisionHandler function
    this.physics.add.overlap(player, items, collisionHandler.bind(this));

    this.anims.create({
        key: 'explode',
        frames: this.anims.generateFrameNumbers( 'kaboom', {
            start: 0,
            end: 15
        }),
        frameRate: 16,
        repeat: 0,
        hideOnComplete: true
    });

    exp = this.add.group({
        defaultKey: 'kaboom',
        maxSize: 30
    });

    
    this.cameras.main.startFollow(player);   

 
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


    this.theme = this.sound.add("theme");

    themeConfig = {
        mute: false,
        volume: 1,
        rate: 1,
        detune: 0,
        seek: 0,
        loop: true,
        delay: 0
    }
    this.theme.play(themeConfig);


    
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


}

function pointer_move(pointer) {
		var dx=dy=0;
		//var min_pointer=20; // virtual joystick
		var min_pointer = (player.body.width + player.body.height) / 4 ; // following pointer by player
		if (move_ctl) {
			reset_move();
			// virtual joystick
 			dx =  (pointer.x - pointer.downX); 
			dy = (pointer.y - pointer.downY);
			
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

}


function updateText ()
{
	text.setPosition(game.canvas.width/2 / map.scene.cameras.main.zoom, text.height);
    text.setText(
        'Coins collected: ' + coinsCollected + '    Best result: ' + bestCollected
    );
    text.setColor('white');
}


// If the player collides with items
function collisionHandler(player, item) {   
    this.sound.play("pickup_sound");
    coinsCollected += 1;
    if (coinsCollected > bestCollected) 
    { bestCollected = coinsCollected; 
    }
    updateText();
    //items.destroy();  
    item.disableBody(true, true);
      
    if (item.body.enable == false)
    {
        var h = map.heightInPixels-40;
        var w = map.widthInPixels-40;
        var itemX = Phaser.Math.Between(40, w);
        var itemY = Phaser.Math.Between(40, h);
        var itemID = Phaser.Math.Between(0, 118);
        item.setFrame(itemID);
        item.enableBody(true, itemX, itemY, true, true);
    }

    //this.sound.play("pickup_sound");

    var x = (player.x < 200) ? Phaser.Math.Between(200, 400) : Phaser.Math.Between(50, 199);
    var y = (player.y < 200) ? Phaser.Math.Between(200, 400) : Phaser.Math.Between(50, 199);

    var bomb = bombs.create(x, y, 'bomb');
    bomb.setBounce(1);
    bomb.setCollideWorldBounds(true);
    bomb.setVelocity(Phaser.Math.Between(-100,-50), 20);
}

function collisionBomb(player, bomb)
{
    bomb.disableBody(true, true);
    this.sound.play("explosion_sound");

    var ex = exp.get().setActive(true);
    ex.setOrigin(0.5,0.5);
    ex.x = player.x;
    ex.y = player.y;
    ex.play('explode');


    this.add.text(player.x-600,player.y-300, 'GAME OVER',{fontSize: '200px', fill: '#000'});
    this.add.text(player.x-650,player.y-100, 'REFRESH TO TRY AGAIN',{fontSize: '100px', fill: '#000'});
    player.disableBody(false, false);

    this.time.addEvent({
        delay: 1000,
        callback: ()=>{
            this.scene.pause();

        }
    })



    //this.scene.pause();
    localStorage.setItem(1, bestCollected);
    this.theme.stop(themeConfig);

}

