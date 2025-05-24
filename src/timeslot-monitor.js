const ozon = require('./ozon-seller-api');

/**
 * Непрерывно отслеживает таймслоты для указанных ID заказов
 * @param {string|string[]} ids - Один ID или массив ID для мониторинга
 * @param {Object} options - Параметры конфигурации
 * @param {string} [options.from] - Начальная дата в формате ISO (например, '2024-01-01T00:00:00Z')
 * @param {string} [options.to] - Конечная дата в формате ISO (например, '2024-01-31T23:59:59Z')
 * @param {number} [options.rps=5] - Количество запросов в секунду для getTimeslotsForIds
 * @param {string} [options.comparisonKey='default'] - Ключ для сравнения в памяти
 * @returns {Object} - Объект с методом stop() для остановки мониторинга
 */
async function monitorTimeslots(ids, options = {}) {
    const {
        from,
        to,
        rps = 5,
        comparisonKey = 'default'
    } = options;

    // Преобразуем один ID в массив
    const idArray = Array.isArray(ids) ? ids : [ids];
    let isMonitoring = true;

    // Функция для выполнения одной проверки
    async function performCheck() {
        try {
            let data;
            
            if (from || to) {
                // Если указан диапазон дат, используем getTimeslotsByDateRange
                const results = await Promise.all(
                    idArray.map(id => ozon.getTimeslotsByDateRange(id, from, to))
                );
                data = { timeslots: results.flatMap(r => r.timeslots || []) };
            } else {
                // Иначе используем getTimeslotsForIds
                const results = await ozon.getTimeslotsForIds(idArray, rps);
                data = { timeslots: results.flatMap(r => r.timeslots || []) };
            }

            // Сравниваем и логируем изменения
            ozon.compareTimeslotObjects(null, data, comparisonKey, idArray.join('-'));
        } catch (error) {
            console.error('Ошибка при проверке таймслотов:', error);
        }
    }

    // Функция для последовательного выполнения проверок
    async function runMonitoring() {
        while (isMonitoring) {
            await performCheck();
        }
    }

    // Запускаем мониторинг
    runMonitoring();

    // Возвращаем объект с методом stop
    return {
        stop: () => {
            isMonitoring = false;
        }
    };
}

module.exports = monitorTimeslots; 