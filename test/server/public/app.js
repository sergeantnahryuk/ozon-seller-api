let socket;
let chart;
let isMonitoring = false;
let history = [];

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
    initializeChart();
    loadConfig();
});

// Инициализация WebSocket соединения
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateStatus(false);
    });

    socket.on('monitoringStatus', (status) => {
        updateStatus(status.active);
    });

    socket.on('timeslotUpdate', (data) => {
        addToHistory(data);
        updateChart(data);
    });

    socket.on('error', (error) => {
        console.error('Server error:', error);
        addToHistory({ type: 'error', message: error.message });
    });
}

// Инициализация графика
function initializeChart() {
    const ctx = document.getElementById('changesChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Количество таймслотов',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Запуск мониторинга
function startMonitoring() {
    const apiKey = document.getElementById('apiKey').value;
    const clientId = document.getElementById('clientId').value;

    if (!apiKey || !clientId) {
        alert('Пожалуйста, введите API Key и Client ID');
        return;
    }

    socket.emit('startMonitoring', { apiKey, clientId });
}

// Остановка мониторинга
function stopMonitoring() {
    socket.emit('stopMonitoring');
}

// Сохранение конфигурации
function saveConfig() {
    const config = {
        rps: parseInt(document.getElementById('rps').value),
        orderCount: parseInt(document.getElementById('orderCount').value),
        schedule: parseInt(document.getElementById('schedule').value)
    };

    localStorage.setItem('monitoringConfig', JSON.stringify(config));
    socket.emit('updateConfig', config);
}

// Загрузка сохраненной конфигурации
function loadConfig() {
    const savedConfig = localStorage.getItem('monitoringConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        document.getElementById('rps').value = config.rps;
        document.getElementById('orderCount').value = config.orderCount;
        document.getElementById('schedule').value = config.schedule;
    }
}

// Обновление статуса мониторинга
function updateStatus(active) {
    const statusElement = document.getElementById('status');
    isMonitoring = active;
    
    if (active) {
        statusElement.textContent = 'Статус: Активен';
        statusElement.className = 'status active';
    } else {
        statusElement.textContent = 'Статус: Неактивен';
        statusElement.className = 'status inactive';
    }
}

// Добавление записи в историю
function addToHistory(data) {
    const historyElement = document.getElementById('history');
    const item = document.createElement('div');
    item.className = 'history-item';

    const timestamp = new Date().toLocaleTimeString();
    const timestampElement = document.createElement('div');
    timestampElement.className = 'timestamp';
    timestampElement.textContent = timestamp;

    const detailsElement = document.createElement('div');
    detailsElement.className = 'details';

    if (data.type === 'error') {
        detailsElement.className += ' error';
        detailsElement.textContent = `Ошибка: ${data.message}`;
    } else {
        detailsElement.className += ' success';
        detailsElement.textContent = `Найдено ${data.count} таймслотов`;
    }

    item.appendChild(timestampElement);
    item.appendChild(detailsElement);
    historyElement.insertBefore(item, historyElement.firstChild);

    // Сохраняем в историю для экспорта
    history.unshift({
        timestamp,
        ...data
    });
}

// Обновление графика
function updateChart(data) {
    if (data.type === 'error') return;

    const timestamp = new Date().toLocaleTimeString();
    chart.data.labels.push(timestamp);
    chart.data.datasets[0].data.push(data.count);

    // Ограничиваем количество точек на графике
    if (chart.data.labels.length > 20) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update();
}

// Экспорт истории
function exportHistory() {
    const csv = [
        ['Время', 'Тип', 'Количество таймслотов', 'Сообщение'],
        ...history.map(item => [
            item.timestamp,
            item.type || 'success',
            item.count || '',
            item.message || ''
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `timeslot-history-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
} 