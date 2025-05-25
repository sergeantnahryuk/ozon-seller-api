const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const ozonApi = require('../../src/ozon-seller-api');
const monitorTimeslots = require('../../src/timeslot-monitor');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Настройка статических файлов
app.use(express.static(path.join(__dirname, 'public')));

// Глобальные переменные для хранения состояния
let isMonitoring = false;
let currentMonitor = null;
let config = {
    rps: 5,
    orderCount: 1,
    schedule: 0
};

// Функция для получения списка заказов и их таймслотов
async function getOrdersAndTimeslots(apiKey, clientId) {
    try {
        ozonApi.useApi(apiKey);
        ozonApi.useClientId(clientId);
        
        // Получаем список заказов
        const orders = await ozonApi.getSupplyOrderList(config.orderCount);
        console.log(orders);
        if (!orders || !orders.result || !orders.result.orders) {
            throw new Error('Не удалось получить список заказов');
        }
        
        const orderIds = orders.result.orders.map(order => order.order_id);
        
        // Получаем таймслоты для этих заказов
        const timeslots = await ozonApi.getTimeslotsForIds(orderIds, config.rps);
        
        return {
            type: 'success',
            count: timeslots.reduce((acc, curr) => acc + (curr.timeslots?.length || 0), 0),
            data: timeslots
        };
    } catch (error) {
        return {
            type: 'error',
            message: error.message
        };
    }
}

// Обработка WebSocket соединений
io.on('connection', (socket) => {
    console.log('Client connected');

    // Отправка текущего статуса при подключении
    socket.emit('monitoringStatus', { active: isMonitoring });

    // Обработка запуска мониторинга
    socket.on('startMonitoring', async ({ apiKey, clientId }) => {
        if (isMonitoring) {
            socket.emit('error', { message: 'Мониторинг уже запущен' });
            return;
        }

        try {
            ozonApi.useApi(apiKey);
            ozonApi.useClientId(clientId);
            
            // Получаем список заказов
            //console.log(config.orderCount);
            const orders = await ozonApi.getSupplyOrderList(config.orderCount);
            //console.log(orders);
            if (!orders || !orders.supply_order_id) {
                throw new Error('Не удалось получить список заказов');
            }
            console.log(config.orderCount);
            const orderIds = orders.supply_order_id;

            isMonitoring = true;
            io.emit('monitoringStatus', { active: true });

            // Подписываемся на обновления памяти
            const unsubscribe = ozonApi.onMemoryUpdate((data) => {
                io.emit('timeslotUpdate', {
                    type: 'success',
                    timestamp: data.timestamp,
                    added: data.added,
                    removed: data.removed,
                    count: (data.added?.length || 0) + (data.removed?.length || 0)
                });
            });

            // Запускаем мониторинг таймслотов
            currentMonitor = await monitorTimeslots(orderIds, {
                rps: config.rps,
                comparisonKey: 'web-monitor',
                from: '2025-05-24T14:15:22Z', to: '2025-08-21T21:15:22Z'
            });

            // Если установлен интервал, используем его
            if (config.schedule > 0) {
                setInterval(async () => {
                    const result = await getOrdersAndTimeslots(apiKey, clientId);
                    io.emit('timeslotUpdate', result);
                }, config.schedule * 60 * (1000 / config.rps));
            }

            // Сохраняем функцию отписки для очистки при остановке
            currentMonitor.unsubscribe = unsubscribe;
        } catch (error) {
            socket.emit('error', { message: error.message });
            isMonitoring = false;
            io.emit('monitoringStatus', { active: false });
        }
    });

    // Обработка остановки мониторинга
    socket.on('stopMonitoring', () => {
        if (currentMonitor) {
            // Отписываемся от обновлений памяти
            if (currentMonitor.unsubscribe) {
                currentMonitor.unsubscribe();
            }
            currentMonitor.stop();
            currentMonitor = null;
        }
        isMonitoring = false;
        io.emit('monitoringStatus', { active: false });
    });

    // Обработка обновления конфигурации
    socket.on('updateConfig', (newConfig) => {
        config = { ...config, ...newConfig };
        
        // Если мониторинг активен, перезапускаем его с новыми настройками
        if (isMonitoring && currentMonitor) {
            currentMonitor.stop();
            currentMonitor = null;
            
            // Перезапускаем мониторинг с новыми настройками
            socket.emit('startMonitoring', { apiKey, clientId });
        }
    });

    // Обработка отключения клиента
    socket.on('disconnect', () => {
        console.log('Client disconnected');
        if (currentMonitor) {
            currentMonitor.stop();
            currentMonitor = null;
        }
        isMonitoring = false;
    });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 