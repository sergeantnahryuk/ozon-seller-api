const fs = require('fs');
const path = require('path');

// Конфигурация по умолчанию
const defaultConfig = {
    rps: 5,
    orderCount: 3,
    schedule: null,
    comparisonKey: 'test-server'
};

// Загрузка конфигурации
let config = { ...defaultConfig };
try {
    const configPath = path.join(__dirname, 'monitor-config.json');
    if (fs.existsSync(configPath)) {
        config = { ...defaultConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    }
} catch (error) {
    console.error('Ошибка при загрузке конфигурации:', error);
}

// Функция сохранения конфигурации
function saveConfig() {
    const configPath = path.join(__dirname, 'monitor-config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

// Функция для очистки лога
function clearLog() {
    const logPath = path.join(__dirname, 'monitor.log');
    if (fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '');
    }
}

module.exports = {
    config,
    saveConfig,
    clearLog
}; 