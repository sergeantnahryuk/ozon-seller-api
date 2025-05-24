# Ozon Seller API

API клиент для работы с API продавца Ozon / API client for working with Ozon Seller API

## Установка / Installation

```bash
npm install ozon-seller-api-extended
```

## Использование / Usage

```javascript
const ozon = require('ozon-seller-api-extended');

// Установка API ключа и Client ID / Set API key and Client ID
ozon.useApi('your-api-key');
ozon.useClientId('your-client-id');

// Получение списка заказов на поставку / Get supply order list
const orders = await ozon.getSupplyOrderList();
// Также можно использовать колбэк для обработки результатов / You can also use a callback to process results
ozon.getSupplyOrderList((err, orders) => {
    if (err) {
        console.error('Ошибка получения списка заказов:', err);
        return;
    }
    console.log('Список заказов:', orders);
});

// Получение таймслотов для заказов / Get timeslots for orders
const timeslots = await ozon.getTimeslotsForIds(['order-id-1', 'order-id-2']);

// Получение таймслотов по диапазону дат / Get timeslots by date range
const timeslotsByDate = await ozon.getTimeslotsByDateRange('order-id', '2024-01-01T00:00:00Z', '2024-01-31T23:59:59Z');

// Мониторинг таймслотов / Timeslot monitoring
const monitor = await ozon.monitorTimeslots('order-id', {
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-31T23:59:59Z',
    rps: 5,
    comparisonKey: 'my-monitor'
});

// Остановка мониторинга / Stop monitoring
monitor.stop();
```

## Обработка ошибок / Error Handling

### Примеры обработки ошибок / Error Handling Examples

```javascript
// 1. Ошибка отсутствия API ключа / Missing API key error
try {
    ozon.useApi(''); // Пустой ключ
} catch (error) {
    console.error('Ошибка API ключа:', error.message);
    // Вывод: "Ошибка API ключа: API ключ обязателен"
}

// 2. Ошибка отсутствия Client ID / Missing Client ID error
try {
    ozon.useClientId(''); // Пустой Client ID
} catch (error) {
    console.error('Ошибка Client ID:', error.message);
    // Вывод: "Ошибка Client ID: Client ID обязателен"
}

// 3. Ошибка API запроса / API request error
try {
    const result = await ozon.getTimeslotsForIds(['invalid-id']);
    if (result.code) {
        throw new Error(`API Error: ${result.message}`);
    }
} catch (error) {
    console.error('Ошибка запроса:', error.message);
    // Вывод: "Ошибка запроса: API Error: You have reached request rate limit per second"
}

// 4. Ошибка мониторинга / Monitoring error
try {
    const monitor = await ozon.monitorTimeslots('invalid-id');
    // ... использование монитора
} catch (error) {
    console.error('Ошибка мониторинга:', error.message);
    // Вывод: "Ошибка мониторинга: API Error: Invalid supply order ID"
}

// 5. Ошибка сравнения таймслотов / Timeslot comparison error
try {
    ozon.compareTimeslotObjects(null, null, 'test-key');
} catch (error) {
    console.error('Ошибка сравнения:', error.message);
    // Вывод: "Ошибка сравнения: currentObj обязателен"
}
```

## Тестирование / Testing

Пакет включает в себя набор тестов, которые можно запустить после установки:

```bash
# Запуск модульных тестов / Run unit tests
npm test

# Запуск тестов API вызовов / Run API call tests
npm run test:api

# Запуск тестов сравнения объектов / Run deep comparison tests
npm run test:deep

# Запуск всех тестов / Run all tests
npm run test:all
```

### Важные замечания / Important Notes

1. **API Тесты** (`npm run test:api`)
   - Требуют действительные API ключи Ozon
   - Выполняют реальные запросы к API Ozon
   - Создают файл `differences.log` в директории проекта
   - Рекомендуется использовать тестовые API ключи

2. **Модульные тесты** (`npm test`)
   - Не требуют API ключей
   - Используют моки для имитации API запросов
   - Безопасны для запуска в любой среде

3. **Тесты сравнения** (`npm run test:deep`)
   - Тестируют только логику сравнения объектов
   - Не требуют API ключей
   - Не делают внешних запросов

### Описание тестов / Test Description

1. **Модульные тесты** (`npm test`)
   - Тестирование основных функций API
   - Проверка обработки ошибок
   - Проверка ограничений по RPS

2. **Тесты API вызовов** (`npm run test:api`)
   - Тестирование реальных вызовов API
   - Проверка получения таймслотов
   - Проверка фильтрации по датам
   - Проверка сравнения таймслотов

3. **Тесты сравнения объектов** (`npm run test:deep`)
   - Тестирование функции глубокого сравнения
   - Проверка обработки различных типов данных
   - Проверка граничных случаев

## Мониторинг таймслотов / Timeslot Monitoring

Модуль предоставляет возможность непрерывного мониторинга таймслотов для одного или нескольких заказов. Мониторинг выполняется последовательно, без фиксированных интервалов

### Параметры / Parameters

- `ids` - ID заказа или массив ID заказов для мониторинга
- `options` - Объект с настройками:
  - `from` - Начальная дата в формате ISO (опционально)
  - `to` - Конечная дата в формате ISO (опционально)
  - `rps` - Количество запросов в секунду (по умолчанию: 5)
  - `comparisonKey` - Ключ для сравнения в памяти (по умолчанию: 'default')

### Примеры / Examples

```javascript
// Мониторинг одного заказа / Monitor single order
const monitor = await ozon.monitorTimeslots('12345');

// Мониторинг нескольких заказов / Monitor multiple orders
const monitor = await ozon.monitorTimeslots(['12345', '67890']);

// Мониторинг с диапазоном дат / Monitor with date range
const monitor = await ozon.monitorTimeslots('12345', {
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-31T23:59:59Z'
});

// Мониторинг с пользовательскими настройками / Monitor with custom settings
const monitor = await ozon.monitorTimeslots(['12345', '67890'], {
    rps: 3,
    comparisonKey: 'my-monitor',
    from: '2024-01-01T00:00:00Z',
    to: '2024-01-31T23:59:59Z'
});

// Остановка мониторинга / Stop monitoring
monitor.stop();
```

## Логирование / Logging

Все изменения в таймслотах автоматически логируются в файл `differences.log`. Лог содержит информацию о добавленных и удаленных таймслотах с временными метками.

## Лицензия / License

MIT

## Ссылки / Links

- **GitHub:** [https://github.com/sergeantnahryuk/ozon-seller-api](https://github.com/sergeantnahryuk/ozon-seller-api)
- **npm:** [https://www.npmjs.com/package/ozon-seller-api-extended](https://www.npmjs.com/package/ozon-seller-api-extended)
