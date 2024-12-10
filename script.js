var stage = new createjs.Stage(document.getElementById("canvas"));
stage.enableMouseMove = true;
var scaler = new createjs.Container();
stage.addChild(scaler);
var gasp, grunt, numnum, jingle;
var state = 0;
var STATE_IDLE = 0, STATE_SHOCK = 1, STATE_FOCUS = 2, STATE_POUNCE = 3, STATE_MISSED = 4, STATE_CAUGHT = 5, STATE_CELEBRATE = 6;
var LASER_Y_MIN = 550;
var JUMP_HEIGHT_MAX = 300;
var JUMP_HEIGHT_MIN = 5;
var POUNCE_RANGE = 500;
var POUNCE_CHANCE_INIT = 0.001;
var pounce_chance = 0.001;
var dance_frame = 0;
var jump_height = 0;
var timer_curr = 0;
var timer_max = 0;
var frame_curr = 0;
var frame_max = 0;
var pos_from = { x: 0, y: 0 };
var pos_to = { x: 0, y: 0 };
var char = new createjs.Container();
var shadow = new createjs.Shape();
var bmp_bg = new createjs.Bitmap("https://lab.gskinner.com/content/alex.garneau/laserpointer/background.png");
var bmp_title = new createjs.Bitmap("https://lab.gskinner.com/content/alex.garneau/laserpointer/HappyAnni.png");
var bmps = [];
var charEyes = new createjs.Shape();
var eyeSpacing = 18;
var eyeSize = 10;
var charSprite;
var laserSize = 30;
var laser = new createjs.Shape();
createjs.Sound.alternateExtensions = ["mp3"];

var queue = new createjs.LoadQueue(false, "https://lab.gskinner.com/content/alex.garneau/laserpointer/", true);
queue.loadManifest([
  {id: "crouch", src: "crouch.png"},
  {id: "pounce", src: "pounce.png"},
  {id: "nom_down", src: "nom_down.png"},
  {id: "nom_up", src: "nom_up.png"},
  {id: "invoked", src: "invoked.png"},
  {id: "dance_left", src: "dance_left.png"},
  {id: "dance_mid", src: "dance_mid.png"},
  {id: "dance_right", src: "dance_right.png"},
]);
queue.on("complete", init);

var audioQueue = new createjs.LoadQueue(true, "https://lab.gskinner.com/content/alex.garneau/laserpointer/", true);
audioQueue.installPlugin(createjs.Sound);
audioQueue.loadManifest([
  {id:"gasp", src:"Gasp.mp3"},
  {id:"grunt", src:"Grunt.mp3"},
  {id:"numnum", src:"Numnum.mp3"},
  {id:"jingle", src:"BonetrousleClip.mp3"}
], false);

function init(event) {
   
    audioQueue.load();
  
    bmp_title.y = 50;
    bmp_title.x = stage.canvas.width;
    shadow.graphics.beginRadialGradientFill(["rgba(0,0,0,0.5)", "rgba(0, 0, 0, 0)"], [0, 1], 0, 0, 0, 0, 0, 100);
    shadow.graphics.drawCircle(0, 0, 100);
    shadow.y = -30;
    shadow.scaleY = 0.3;
    char.addChild(shadow);
    bmps[0] = new createjs.Bitmap(queue.getResult("crouch"));
    bmps[1] = new createjs.Bitmap(queue.getResult("pounce"));
    bmps[2] = new createjs.Bitmap(queue.getResult("nom_down"));
    bmps[3] = new createjs.Bitmap(queue.getResult("nom_up"));
    bmps[4] = new createjs.Bitmap(queue.getResult("invoked"));
    bmps[5] = new createjs.Bitmap(queue.getResult("dance_left"));
    bmps[6] = new createjs.Bitmap(queue.getResult("dance_mid"));
    bmps[7] = new createjs.Bitmap(queue.getResult("dance_right"));
    var bmp;
    for (var i = bmps.length - 1; i >= 0; i--) {
        bmp = bmps[i];
        bmp.alpha = 0;
        bmp.x = -150;
        bmp.y = -300;
        char.addChild(bmp);
    }
    scaler.addChild(char);
    char.x = 200;
    char.y = 700;
    charEyes.alpha = 0;
    char.addChild(charEyes);
    setFrame("CROUCH");
    scaler.addChild(bmp_bg, bmp_title, char);
    laser.graphics.beginRadialGradientFill(["rgba(255,155,155,1)", "rgba(255,40,40,0.6)", "rgba(255,0,0,0)"], [0, 0.4, 1], 0, 0, 0, 0, 0, laserSize);
    laser.graphics.drawCircle(0, 0, laserSize);
    scaler.addChild(laser);
    laser.scaleY = 0.5;
    laser.x = 1050;
    laser.y = 700;
    createjs.Ticker.framerate = 30;
    createjs.Ticker.addEventListener("tick", update);
}
init();

function update() {
    laser.x = this.stage.mouseX;
    laser.y = Math.max(this.stage.mouseY, LASER_Y_MIN);
    var dx = this.laser.x - this.char.x;
    var dy = this.laser.y - this.char.y;
    timer_curr -= createjs.Ticker.interval;
    switch (state) {
        case STATE_IDLE:
            // Just hang out. If the mouse gets close enough, jump to shock state.
            if (Math.sqrt(dx * dx + dy * dy) < POUNCE_RANGE) {
                char.scaleX = (laser.x < char.x) ? -1 : 1;
                timer_max = 200;
                timer_curr = timer_max;
                createjs.Sound.play("gasp");
                state = STATE_SHOCK;
            }
            break;
        case STATE_SHOCK:
            // Animate a few frames, then jump to focus state.
            char.scaleY = 1 - Math.sin(Math.PI * (timer_curr / timer_max)) * 0.2;
            if (timer_curr / timer_max < 0.5) {
                charEyes.alpha = 1;
                renderEyes(Math.atan2(dy, dx));
            }
            if (timer_curr <= 0) {
                setFrame("CROUCH");
                state = STATE_FOCUS;
            }
            break;
        case STATE_FOCUS:
            // Each pass has a chance to pounce. As time goes by, the chance increases.
            renderEyes(Math.atan2(dy, dx));
            char.scaleX = (laser.x < char.x) ? -1 : 1;
            if (Math.random() < pounce_chance) {
                pos_from.x = this.char.x;
                pos_from.y = this.char.y;
                pos_to.x = this.laser.x;
                pos_to.y = this.laser.y;
                pounce_chance = POUNCE_CHANCE_INIT;
                jump_height = Math.random() * (JUMP_HEIGHT_MIN + (JUMP_HEIGHT_MAX - JUMP_HEIGHT_MIN));
                timer_max = 100 + jump_height * 2;
                timer_curr = timer_max;
                charEyes.alpha = 0;
                createjs.Sound.play("grunt");
                setFrame("LEAP");
                state = STATE_POUNCE;
            }
            else {
                pounce_chance += 0.001;
            }
            // If the mouse gets away from the target, return to idle.
            if (Math.sqrt(dx * dx + dy * dy) >= POUNCE_RANGE) {
                setFrame("CROUCH");
                charEyes.alpha = 0;
                state = STATE_IDLE;
            }
            break;
        case STATE_POUNCE:
            // Pounce lerps from the current position to the target position (the mouse).
            char.x = pos_from.x + (pos_to.x - pos_from.x) * (1 - (timer_curr / timer_max));
            char.y = pos_from.y + (pos_to.y - pos_from.y) * (1 - (timer_curr / timer_max));
            bmps[1].y = -300 - Math.sin(Math.PI * (timer_curr / timer_max)) * jump_height;
            // After some animation time, either determine if it's caught or missed depending on mouse proximity.
            if (timer_curr <= 0) {
                bmps[1].y = -300;
                setFrame("EAT_DOWN");
                if (Math.sqrt(dx * dx + dy * dy) < 50) {
                    timer_max = 2000;
                    timer_curr = timer_max;
                    frame_max = 4;
                    laser.alpha = 0;
                    createjs.Sound.play("numnum");
                    state = STATE_CAUGHT;
                }
                else {
                    timer_max = 1000;
                    timer_curr = timer_max;
                    state = STATE_MISSED;
                }
            }
            break;
        case STATE_MISSED:
            // Missed it. Animate, then return to focus state.
            if (timer_curr < Math.floor(timer_max / 2)) {
                setFrame("EAT_UP");
                charEyes.alpha = 1;
            }
            if (timer_curr <= 0) {
                setFrame("CROUCH");
                charEyes.alpha = 1;
                renderEyes(Math.atan2(dy, dx));
                state = STATE_FOCUS;
            }
            break;
        case STATE_CAUGHT:
            // Caught it! Animate, then celebrate!      
            if (timer_curr / timer_max > 0.5) {
                frame_curr++;
                if (frame_curr >= frame_max) {
                    frame_curr = 0;
                    dance_frame = (dance_frame + 1) % 2;
                    setFrame(dance_frame == 0 ? "EAT_UP" : "EAT_DOWN");
                }
            }
            else {
                setFrame("PROP_UP");
            }
            if (timer_curr <= 0) {
                timer_max = 6000;
                timer_curr = timer_max;
                frame_max = 5;
                createjs.Sound.play("jingle");
                setFrame("DANCE_MID");
                state = STATE_CELEBRATE;
            }
            break;
        case STATE_CELEBRATE:
            // Do a dance, then return to idle.
            frame_curr++;
            if (frame_curr >= frame_max) {
                frame_curr = 0;
                dance_frame = (dance_frame + 1) % 4;
                if (dance_frame == 0) {
                    setFrame("DANCE_LEFT");
                }
                else if (dance_frame == 2) {
                    setFrame("DANCE_RIGHT");
                }
                else {
                    setFrame("DANCE_MID");
                }
            }
            var startPos = -bmp_title.getBounds().width;
            bmp_title.x = startPos + (stage.canvas.width - startPos) * (timer_curr / timer_max);
            if (timer_curr <= 0) {
                laser.alpha = 1;
                setFrame("CROUCH");
                state = STATE_IDLE;
            }
            break;
    }
    stage.update();
}
function renderEyes(angle) {
    var g = charEyes.graphics;
    g.clear();
    g.beginFill("#FFFFFF");
    g.drawCircle(eyeSpacing, 0, eyeSize);
    g.drawCircle(-eyeSpacing, 0, eyeSize);
    g.beginFill("#000000");
    g.drawCircle(eyeSpacing + (Math.cos(angle) * eyeSize / 4) * char.scaleX, (Math.sin(angle) * eyeSize / 4), eyeSize / 2);
    g.drawCircle(-eyeSpacing + (Math.cos(angle) * eyeSize / 4) * char.scaleX, (Math.sin(angle) * eyeSize / 4), eyeSize / 2);
    g.beginFill("#FFFFFF");
    g.drawCircle(eyeSpacing + (Math.cos(angle) * eyeSize / 4) * char.scaleX + (eyeSize / 4), (Math.sin(angle) * eyeSize / 4) - (eyeSize / 4), eyeSize / 6);
    g.drawCircle(-eyeSpacing + (Math.cos(angle) * eyeSize / 4) * char.scaleX + (eyeSize / 4), (Math.sin(angle) * eyeSize / 4) - (eyeSize / 4), eyeSize / 6);
}
function setFrame(id) {
    charSprite && (charSprite.alpha = 0);
    switch (id) {
        case "CROUCH":
            charSprite = bmps[0];
            charEyes.x = 17;
            charEyes.y = -154;
            eyeSpacing = 18;
            eyeSize = 10;
            break;
        case "LEAP":
            charSprite = bmps[1];
            break;
        case "EAT_DOWN":
            charSprite = bmps[2];
            break;
        case "EAT_UP":
            charSprite = bmps[3];
            charEyes.x = 30;
            charEyes.y = -60;
            break;
        case "PROP_UP":
            charSprite = bmps[4];
            break;
        case "DANCE_LEFT":
            charSprite = bmps[5];
            break;
        case "DANCE_MID":
            charSprite = bmps[6];
            break;
        case "DANCE_RIGHT":
            charSprite = bmps[7];
            break;
    }
    charSprite && (charSprite.alpha = 1);
}