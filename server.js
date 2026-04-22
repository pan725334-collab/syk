const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Раздача статики из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Хранилище комнат
const rooms = new Map();

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws) => {
    console.log('✅ Новый клиент подключился');

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (e) {
            console.error('Ошибка парсинга JSON:', e);
            return;
        }

        const { type, roomCode, move, gameState } = data;

        if (type === 'create') {
            const code = generateRoomCode();
            rooms.set(code, { players: [ws], gameState: null });
            ws.send(JSON.stringify({ type: 'created', roomCode: code }));
            console.log(`🏠 Создана комната ${code}`);
        }
        else if (type === 'join') {
            const room = rooms.get(roomCode);
            if (room && room.players.length === 1) {
                room.players.push(ws);
                room.players.forEach((player, idx) => {
                    const color = idx === 0 ? 'white' : 'black';
                    player.send(JSON.stringify({ type: 'start', color, roomCode }));
                });
                console.log(`👥 Игрок подключился к комнате ${roomCode}`);
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Комната не найдена или занята' }));
            }
        }
        else if (type === 'move') {
            const room = rooms.get(roomCode);
            if (room) {
                const opponent = room.players.find(p => p !== ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify({ type: 'opponentMove', move, gameState }));
                }
            }
        }
        else if (type === 'gameOver') {
            const room = rooms.get(roomCode);
            if (room) {
                room.players.forEach(p => {
                    if (p !== ws && p.readyState === WebSocket.OPEN) {
                        p.send(JSON.stringify({ type: 'opponentGameOver', result: data.result }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        for (let [code, room] of rooms.entries()) {
            if (room.players.includes(ws)) {
                room.players.forEach(p => {
                    if (p !== ws && p.readyState === WebSocket.OPEN) {
                        p.send(JSON.stringify({ type: 'opponentDisconnected' }));
                    }
                });
                rooms.delete(code);
                console.log(`❌ Комната ${code} удалена`);
                break;
            }
        }
    });
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
