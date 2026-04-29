const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port: PORT });

let players = {};
let bullets = [];

// Safe send
function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
    }
}

wss.on('connection', (ws) => {
    const id = Math.random().toString(36).slice(2);

    players[id] = {
        x: 100,
        y: 100,
        angle: 0,
        health: 100
    };

    console.log("Player connected:", id);

    send(ws, { type: "init", id });

    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);

            // Movement update
            if (data.type === "update" && players[id]) {
                players[id].x = data.x;
                players[id].y = data.y;
                players[id].angle = data.angle;
            }

            // Shooting
            if (data.type === "shoot" && players[id]) {
                bullets.push({
                    x: players[id].x,
                    y: players[id].y,
                    angle: players[id].angle,
                    owner: id
                });
            }

        } catch (err) {
            console.log("Bad data");
        }
    });

    ws.on('close', () => {
        delete players[id];
        console.log("Player disconnected:", id);
    });
});

// Game loop (20 FPS)
setInterval(() => {

    // Move bullets
    bullets.forEach(b => {
        b.x += Math.cos(b.angle) * 8;
        b.y += Math.sin(b.angle) * 8;

        // HIT DETECTION
        for (let id in players) {
            const p = players[id];

            const dx = p.x - b.x;
            const dy = p.y - b.y;

            const distance = Math.sqrt(dx*dx + dy*dy);

            if (distance < 20 && b.owner !== id) {
                p.health -= 10;
                b.hit = true;
            }
        }
    });

    // Remove bullets that hit
    bullets = bullets.filter(b => !b.hit);

    // Send state to all players
    const state = JSON.stringify({
        type: "state",
        players,
        bullets
    });

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(state);
        }
    });

}, 50);

console.log("Server running on port", PORT);
