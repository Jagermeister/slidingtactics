'use strict';

let GameLogic = require('../model/core.js'),
    Direction = require('../model/direction.js');

// Canvas Parameters
let canvas = null, 
    canvasWidth = null,
    canvasHeight = null,
    canvasBounds = null,
    ctx = null,
    ctxBack = null,
    ctxDebug = null,
    originX = 50,
    originY = 50;
// Mouse
let mouseX = null,
    mouseY = null;

// Main Constants
let gameInstances = [];
let gamesWidth = null,
    gamesHeight = null,
    gamesBorder = 10,
    cellSpace = null,
    isMultipleGames = false,
    gamePrimaryInput = null;

var qs = {};
location.search.substr(1).split("&").forEach(function(p) {
    let s = p.split('='); qs[s[0]] = s[1];
});

function init() {
    document.getElementById('myBody').innerHTML = `
            <table id='debugMenu' style='border-spacing: 6px;'><tr>
                <td><a href='?'>01x01=0001</a></td>
                <td><a href='?x=3&y=1'>03x01=0003</a></td>
                <td><a href='?x=4&y=2'>04x02=0008</a></td>
                <td><a href='?x=5&y=2'>05x02=0010</a></td>
                <td><a href='?x=6&y=3'>06x03=0018</a></td>
                <td><a href='?x=20&y=10'>20x10=0200</a></td>
                <td><a href='?x=28&y=15'>28x15=0420</a></td>
                <td><a href='?x=50&y=25'>50x25=1250</a></td>
                <td></td>
                <td><a id='cF'>[Fore Canvas]</a></td>
                <td><a id='cB'>[Back Canvas]</a></td>
                <td><a id='cD'>[Debu Canvas]</a></td>
                <td></td>
                <td><a id='commandNorm'>[Norm Commands]</a></td>
                <td><a id='commandFast'>[Fast Commands]</a></td>
            </tr></table>` + document.getElementById('myBody').innerHTML;
    document.getElementById('canvasContainer').innerHTML += `
        <canvas id="cnvsDebug" width="1280" height="100"
            oncontextmenu="return false;" class="cnvs"
            style="z-index: 3; top: 600px;"></canvas>`;
    ctxDebug = document.getElementById('cnvsDebug').getContext('2d');
    canvas = document.getElementById('cnvsForeground');
    canvas.tabIndex = 0;
    canvas.focus();
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    canvasBounds = canvas.getBoundingClientRect();
    ctx = canvas.getContext('2d');
    ctxBack = document.getElementById('cnvsBackground').getContext('2d');

    document.getElementById('commandNorm').onclick = commandNorm;
    document.getElementById('commandFast').onclick = commandFast;
    let hideElement = function(id) {
        document.getElementById(id).style.display = 
            document.getElementById(id).style.display == "none" ?
            "inline" : "none";
    };
    document.getElementById('cF').onclick = function() { hideElement('cnvsForeground'); };
    document.getElementById('cB').onclick = function() { hideElement('cnvsBackground'); };
    document.getElementById('cD').onclick = function() { hideElement('cnvsDebug'); };
    gamesWidth = qs.x ? qs.x : 1;
    gamesHeight = qs.y ? qs.y : 1;
    isMultipleGames = gamesWidth + gamesHeight > 2;

    ctx.font = "14px Serif";
    let cellSpaceX = (canvasWidth / gamesWidth - gamesBorder * 2) / 16,
        cellSpaceY = (canvasHeight / gamesHeight - gamesBorder * 2) / 16;
    cellSpace = Math.max(Math.min(cellSpaceX, cellSpaceY), 1);

    for(let x = 0; x < gamesWidth; x++) {
        for(let y = 0; y < gamesHeight; y++) {
            let g = new GameLogic(
                ctxBack,
                (gamesBorder + cellSpace * 16) * x + gamesBorder,
                gamesBorder + (gamesBorder + cellSpace * 16) * y,
                cellSpace,
                gamesBorder);
            gameInstances.push(g);
        }
    }
    eventsListenersAdd();
}

var fps = {
    frames: 60,
    deltas: [],
    sum: 0
};

let commands = [],
    commandDetla = 0,
    commandDelay = 25,
    devAutoCommandEnabled = !localStorage.getItem('user_is_authenticated'),
    devSelect2Text = {0: '2673', 1: '2674', 2: '2675', 3: '2676'};
function commandNorm() { commandDelay = 250; }
function commandFast() { commandDelay = 25; }

function update(delta) {
    for(let i = 0; i < gameInstances.length; i++) {
        gameInstances[i].update(delta);
    }

    commandDetla += delta;
    if (commandDetla > commandDelay && devAutoCommandEnabled) {
        commandDetla = 0;
        let roll = Math.random();
        let c = null;
        if (roll < 0.85 && commands.length) {
            c = Direction.ALL[Math.floor(Math.random() * Direction.ALL.length)];
            commands.push(Direction.unicode[c]);
            for(let i = 0; i < gameInstances.length; i++) {
                gameInstances[i].onDirection(c);
            }
        } else {
            c = Math.floor(Math.random() * 4);
            commands.push(devSelect2Text[c]);
            for(let i = 0; i < gameInstances.length; i++) {
                gameInstances[i].onDevSelect(c);
            }
        }

        if (commands.length > 20) {
            commands.shift();
        }
    }

    fps.deltas.unshift(delta);
    if (fps.deltas.length > fps.frames) {
        fps.deltas.pop();
    }
    fps.sum = fps.deltas.reduce(function(a, b) { return a + b; });
}

let fpsTextDelta = null,
    fpsTextSum = null;
function display() {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctxDebug.clearRect(0, 0, 1050, 100);
    for(let i = 0; i < gameInstances.length; i++) {
        gameInstances[i].display(ctx);
    }

    if (commands.length) {
        ctxDebug.font = "48px sans-serif";
        for(let i = 0, l = commands.length; i < l; i++) {
            let c = commands[i];
            ctxDebug.fillStyle = i == l - 1 ? 'red' : 'black';
            ctxDebug.fillText(String.fromCharCode(parseInt(c, 16)), gamesBorder + 48 * (l - i), 80);
        }
    }

    let deltaText = fps.deltas[0], sumText = fps.sum;
    if (deltaText != fpsTextDelta || sumText != fpsTextSum) {
        ctxDebug.clearRect(1050, 0, 1400, 100);        
        fpsTextDelta = deltaText;
        fpsTextSum = sumText;
        let fpsText = fpsTextDelta.toFixed(2).toString() + "ms " + (1000/(fpsTextSum/fps.frames)).toFixed(0) + "fps";
        ctxDebug.font = "24px sans-serif";
        ctxDebug.strokeStyle = "red";
        ctxDebug.strokeText(fpsText, 1100, 50);
    }
}

function eventsListenersAdd() {
    let LEFT_MOUSE_CLICK = 0;
    canvas.addEventListener("mousedown", function(event) {
        if (event.button === LEFT_MOUSE_CLICK) {
            for(let i = 0; i < gameInstances.length; i++) {
                gameInstances[i].onMouse1Down(mouseX, mouseY);
            }
        }
    });

    canvas.addEventListener("mousemove", function(event) {
        mouseX = event.layerX;
        mouseY = event.layerY;
        if (isMultipleGames) {
            //console.log(mouseX, mouseY);
        }
    });

    canvas.addEventListener("mouseup", function(event) {
        if (event.button === LEFT_MOUSE_CLICK) {
            for(let i = 0; i < gameInstances.length; i++) {
                gameInstances[i].onMouse1Up(mouseX, mouseY);
            }
        }
    });

    canvas.addEventListener("keydown", function(event) {
        let direction = null;
        let devSelect = null;

        if (event.key === "ArrowLeft") {
            direction = Direction.W;
        } else if (event.key === "ArrowUp") {
            direction = Direction.N;
        } else if (event.key === "ArrowRight") {
            direction = Direction.E;
        } else if (event.key === "ArrowDown") {
            direction = Direction.S;
        } else if (event.key === "1") {
            devSelect = 0;
        } else if (event.key === "2") {
            devSelect = 1;
        } else if (event.key === "3") {
            devSelect = 2;
        } else if (event.key === "4") {
            devSelect = 3;
        } else if (event.key == "p") {
            devAutoCommandEnabled = !devAutoCommandEnabled;
        }

        if (direction) {
            for(let i = 0; i < gameInstances.length; i++) {
                gameInstances[i].onDirection(direction);
            }
        }

        if (devSelect !== null) {
            for(let i = 0; i < gameInstances.length; i++) {
                gameInstances[i].onDevSelect(devSelect);
            }
        }
    });
}

window.onload = function() {
    init();
    var mainloop_updateLast = performance.now();
    (function mainLoop(nowTime) {
        update(nowTime - mainloop_updateLast);
        display();
        mainloop_updateLast = nowTime;
        requestAnimationFrame(mainLoop);
    })(performance.now());
};