const ozon = require('./ozon-seller-api.js');

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
    let lastCheckTime = 0;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;
    const MIN_CHECK_INTERVAL = 1000; // Минимальный интервал между проверками в мс

    // Функция для выполнения одной проверки
    async function performCheck() {
        try {
            const now = Date.now();
            // Проверяем, прошло ли достаточно времени с последней проверки
            if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
                return;
            }

            let data;
            
            if (from || to) {
                console.log("from",from,"to",to);
                // Если указан диапазон дат, используем getTimeslotsByDateRange
                const results = await Promise.all(
                    idArray.map(id => ozon.getTimeslotsByDateRange(id, from, to))
                );
                console.log('getTimeslotsByDateRange',results);
                data = { timeslots: results.flatMap(r => r.timeslots || []) };
                
            } else {
                // Иначе используем getTimeslotsForIds
                const results = await ozon.getTimeslotsForIds(idArray, rps);
                data = { timeslots: results.flatMap(r => r.timeslots || []) };
            }

            // Сбрасываем счетчик ошибок при успешной проверке
            consecutiveErrors = 0;

            // Сравниваем и логируем изменения только если есть таймслоты
            if (data.timeslots && data.timeslots.length > 0) {
                console.log('Отправляем данные в compareTimeslotObjects:', {
                    comparisonKey,
                    logId: idArray.join('-'),
                    timeslotsCount: data.timeslots.length,
                    timeslots: data.timeslots.map(ts => ({
                        from: new Date(ts.from).toLocaleString(),
                        to: new Date(ts.to).toLocaleString()
                    }))
                });
                ozon.compareTimeslotObjects(data, comparisonKey, idArray.join('-'));
            } else {
                console.log('Нет таймслотов для сравнения');
            }

            lastCheckTime = now;
        } catch (error) {
            console.error('Ошибка при проверке таймслотов:', error);
            consecutiveErrors++;
            
            // Если слишком много ошибок подряд, останавливаем мониторинг
            if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                console.error('Слишком много ошибок подряд, останавливаем мониторинг');
                isMonitoring = false;
            }
        }
    }

    // Функция для последовательного выполнения проверок
    async function runMonitoring() {
        while (isMonitoring) {
            await performCheck();
            // Добавляем задержку между проверками
            await new Promise(resolve => setTimeout(resolve, 10000 / rps));
        }
    }

    // Запускаем мониторинг
    runMonitoring();

    // Возвращаем объект с методами управления
    return {
        stop: () => {
            isMonitoring = false;
            // Очищаем память при остановке
            ozon.resetMemory();
        }
    };
}

module.exports = monitorTimeslots; 