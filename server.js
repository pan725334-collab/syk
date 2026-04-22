const express = require('express');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

// Раздаём статические файлы из папки public
app.use(express.static(path.join(__dirname, 'public')));

// Обработка WebSocket соединений
wss.on('connection', (ws) => {
    console.log('Новый клиент подключился');
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        // Здесь можно добавить логику комнат (как в вашем оригинале)
        // Пока просто эхо для теста
        ws.send(JSON.stringify({ type: 'pong', data: data }));
    });
    ws.on('close', () => console.log('Клиент отключился'));
});

const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
