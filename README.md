# Ozon Seller API Client

Клиент для работы с API Ozon Seller, предоставляющий функциональность для управления таймслотами и заказами.

## Функциональность

### Управление таймслотами
- Сравнение и отслеживание изменений в таймслотах
- Логирование изменений в файл
- Поддержка различных форматов дат и временных зон
- Обработка граничных случаев и ошибок
- Непрерывный мониторинг таймслотов

### Управление заказами
- Получение списка заказов на поставку
- Получение таймслотов для массива ID заказов
- Получение таймслотов по диапазону дат
- Фильтрация заказов по статусу
- Пагинация результатов

## Установка

```bash
npm install ozon-seller-api-extended
```

## Использование

### Инициализация

```javascript
const ozon = require('ozon-seller-api-extended');

// Настройка API
ozon.useApi('your-api-key');
ozon.useClientId('your-client-id');
```

### Работа с таймслотами

```javascript
// Сравнение таймслотов
const result = ozon.compareTimeslotObjects({
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'Europe/Moscow', offset: '+03:00' }
  ]
}, 'uniqueKey', 42);

// Получение таймслотов для массива ID
const timeslots = await ozon.getTimeslotsForIds(['order-id-1', 'order-id-2'], 5); // 5 запросов в секунду

// Получение таймслотов по диапазону дат
const timeslotsByDate = await ozon.getTimeslotsByDateRange(
  'order-id',
  '2024-01-01T00:00:00Z',
  '2024-01-31T23:59:59Z'
);
```

### Работа с заказами

```javascript
// Получение списка заказов
const orders = await ozon.getSupplyOrderList(100, 0); // limit=100, offset=0

// Получение списка заказов с колбэком
ozon.getSupplyOrderList(100, 0, (data) => {
  console.log('Список заказов:', data);
});
```

### Мониторинг таймслотов

```javascript
// Мониторинг одного заказа
const monitor = await ozon.monitorTimeslots('12345');

// Мониторинг нескольких заказов
const monitor = await ozon.monitorTimeslots(['12345', '67890']);

// Мониторинг с настройками
const monitor = await ozon.monitorTimeslots('12345', {
  from: '2024-01-01T00:00:00Z',
  to: '2024-01-31T23:59:59Z',
  rps: 3,
  comparisonKey: 'my-monitor'
});

// Остановка мониторинга
monitor.stop();
```

## Тестирование

Проект включает три типа тестов:

### 1. Модульные тесты (`npm test`)
- Тестирование основных функций API
- Проверка обработки ошибок
- Проверка ограничений по RPS
- Использует моки для имитации API запросов

### 2. Тесты API вызовов (`npm run test:api`)
- Тестирование реальных вызовов API
- Проверка получения таймслотов
- Проверка фильтрации по датам
- Требует действительные API ключи

### 3. Тесты сравнения объектов (`npm run test:deep`)
- Тестирование функции глубокого сравнения
- Проверка обработки различных типов данных
- Проверка граничных случаев
- Тесты производительности и стресс-тесты

Запуск тестов:
```bash
# Запуск всех тестов
npm run test:all

# Запуск отдельных тестов
npm test           # модульные тесты
npm run test:api   # тесты API
npm run test:deep  # тесты сравнения
```

## Логирование

Все изменения таймслотов логируются в файл `differences.log` в формате:
```
[2024-02-20T12:34:56.789Z] [LOG][testKey] (2024-02-20T12:34:56.789Z) ID=42 ➕ Added timeslots: С 24.08.2019 14:15:22 по 24.08.2019 14:15:22
```

## Обработка ошибок

Библиотека обрабатывает следующие типы ошибок:
- Ошибки API (коды ошибок)
- Сетевые ошибки
- Ошибки валидации данных
- Таймауты
- Ошибки формата даты
- Ошибки временных зон

Примеры обработки ошибок:
```javascript
try {
  const result = await ozon.getTimeslotsForIds(['invalid-id']);
  if (result.code) {
    throw new Error(`API Error: ${result.message}`);
  }
} catch (error) {
  console.error('Ошибка запроса:', error.message);
}
```

## Производительность

- Оптимизированная работа с большими наборами данных
- Эффективное управление памятью
- Поддержка конкурентных запросов
- Ограничение времени выполнения операций
- Контроль количества запросов в секунду (RPS)

## Безопасность

- Безопасное хранение API ключей
- Валидация входных данных
- Защита от переполнения памяти
- Обработка некорректных данных
- Проверка форматов дат и временных зон

## Зависимости

- node-fetch: ^2.6.7

## Лицензия

MIT

## Ссылки

- **GitHub:** [https://github.com/sergeantnahryuk/ozon-seller-api](https://github.com/sergeantnahryuk/ozon-seller-api)
- **npm:** [https://www.npmjs.com/package/ozon-seller-api-extended](https://www.npmjs.com/package/ozon-seller-api-extended)

