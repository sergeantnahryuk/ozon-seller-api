const ozon = require('../../src/ozon-seller-api');
const monitorTimeslots = require('../../src/timeslot-monitor');
const { config, clearLog } = require('./config');

let currentMonitor = null;
let memoryHistory = [];
let monitoringSchedule = null;
const MAX_HISTORY_LENGTH = 10;

// Функция для добавления записи в историю памяти
function addToMemoryHistory(data, io) {
    const timestamp = new Date().toISOString();
    const historyItem = {
        timestamp,
        data,
        orderIds: currentMonitor ? currentMonitor.orderIds : []
    };
    
    memoryHistory.unshift(historyItem);
    if (memoryHistory.length > MAX_HISTORY_LENGTH) {
        memoryHistory.pop();
    }
    io.emit('memoryUpdate', memoryHistory);
}

// Функция для экспорта истории в markdown
function exportHistoryToMarkdown() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportPath = path.join(__dirname, `monitor-history-${timestamp}.md`);
    
    let markdown = '# История мониторинга таймслотов\n\n';
    markdown += `Дата экспорта: ${new Date().toLocaleString()}\n\n`;
    
    memoryHistory.forEach((item, index) => {
        markdown += `## Запись ${index + 1}\n`;
        markdown += `Время: ${item.timestamp}\n`;
        markdown += `ID заказов: ${item.orderIds.join(', ')}\n\n`;
        markdown += '```json\n';
        markdown += JSON.stringify(item.data, null, 2);
        markdown += '\n```\n\n';
    });
    
    fs.writeFileSync(exportPath, markdown);
    return exportPath;
}

// Функция для запуска мониторинга
async function startMonitoring(apiKey, clientId, io) {
    try {
        clearLog();
        
        // Устанавливаем API ключи
        ozon.useApi(apiKey);
        ozon.useClientId(clientId);
        
        const orders = await ozon.getSupplyOrderList({ limit: 100 });
        const randomOrders = orders.result.orders
            .sort(() => Math.random() - 0.5)
            .slice(0, config.orderCount)
            .map(order => order.order_id);

        currentMonitor = await monitorTimeslots(randomOrders, {
            rps: config.rps,
            comparisonKey: config.comparisonKey
        });

        ozon.onMemoryUpdate((data) => {
            addToMemoryHistory(data, io);
        });

        return { success: true, orderIds: randomOrders };
    } catch (error) {
        console.error('Ошибка при запуске мониторинга:', error);
        return { success: false, error: error.message };
    }
}

// Функция для остановки мониторинга
function stopMonitoring() {
    if (currentMonitor) {
        currentMonitor.stop();
        currentMonitor = null;
        if (monitoringSchedule) {
            clearInterval(monitoringSchedule);
            monitoringSchedule = null;
        }
        return true;
    }
    return false;
}

// Функция для установки расписания
function setSchedule(interval, io) {
    if (monitoringSchedule) {
        clearInterval(monitoringSchedule);
    }
    
    if (interval > 0) {
        monitoringSchedule = setInterval(async () => {
            if (currentMonitor) {
                currentMonitor.stop();
            }
            await startMonitoring(io);
        }, interval * 60 * 1000);
        return true;
    }
    return false;
}

module.exports = {
    startMonitoring,
    stopMonitoring,
    setSchedule,
    getMemoryHistory: () => memoryHistory,
    exportHistoryToMarkdown
}; 