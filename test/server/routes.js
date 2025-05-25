const express = require('express');
const router = express.Router();
const { config, saveConfig } = require('./config');
const monitor = require('./monitor');

// Запуск мониторинга
router.post('/start-monitoring', async (req, res) => {
    const { apiKey, clientId, rps, orderCount } = req.body;
    
    // Обновляем конфигурацию
    config.rps = rps;
    config.orderCount = orderCount;
    
    const result = await monitor.startMonitoring(apiKey, clientId, req.app.get('io'));
    if (result.success) {
        res.json({ 
            success: true, 
            message: 'Мониторинг запущен',
            orderIds: result.orderIds
        });
    } else {
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при запуске мониторинга',
            error: result.error 
        });
    }
});

// Остановка мониторинга
router.post('/stop-monitoring', (req, res) => {
    const success = monitor.stopMonitoring();
    res.json({ 
        success, 
        message: success ? 'Мониторинг остановлен' : 'Мониторинг не был запущен' 
    });
});

// Получение истории
router.get('/memory-history', (req, res) => {
    res.json(monitor.getMemoryHistory());
});

// Обновление конфигурации
router.post('/config', (req, res) => {
    const newConfig = req.body;
    Object.assign(config, newConfig);
    saveConfig();
    res.json({ success: true, config });
});

// Получение конфигурации
router.get('/config', (req, res) => {
    res.json(config);
});

// Установка расписания
router.post('/schedule', (req, res) => {
    const { interval } = req.body;
    const success = monitor.setSchedule(interval, req.app.get('io'));
    res.json({ 
        success: true, 
        message: success ? 
            `Мониторинг запланирован каждые ${interval} минут` : 
            'Расписание мониторинга отключено' 
    });
});

// Экспорт истории
router.post('/export', (req, res) => {
    try {
        const exportPath = monitor.exportHistoryToMarkdown();
        res.json({ 
            success: true, 
            message: 'История экспортирована',
            path: exportPath
        });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка при экспорте истории',
            error: error.message 
        });
    }
});

module.exports = router; 