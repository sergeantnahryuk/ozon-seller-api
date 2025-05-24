const ozon = require('./ozon-seller-api');

// Установка API ключей
const API_KEY = 'your-test-api-key';
const CLIENT_ID = 'your-test-client-id';

// Массив ID для тестирования
const testIds = [
  52680953,
  52679582,
  52675152,
  52674967,
  52493801,
  52492926,
  52485119,
  52243937,
  52242095,
  52241298
];

// Функция для красивого вывода в консоль
function logResult(title, data) {
  console.log('\n' + '='.repeat(50));
  console.log(`📋 ${title}`);
  console.log('='.repeat(50));
  console.log(JSON.stringify(data, null, 2));
  console.log('='.repeat(50) + '\n');
}

// Основная функция тестирования
async function testApiCalls() {
  try {
    // Инициализация API
    ozon.useApi(API_KEY);
    ozon.useClientId(CLIENT_ID);
    console.log('✅ API инициализирован');

    // Тест 1: Получение таймслотов для массива ID
    console.log('\n🔄 Тест 1: Получение таймслотов для массива ID');
    const results = await ozon.getTimeslotsForIds(testIds, 12);
    logResult('Результаты получения таймслотов:', results);

    // Тест 2: Получение таймслотов для одного ID
    console.log('\n🔄 Тест 2: Получение таймслотов для одного ID');
    const singleResult = await ozon.getTimeslotsByDateRange(testIds[0]);
    logResult('Результат получения таймслотов для одного ID:', singleResult);

    // Тест 3: Получение таймслотов с фильтрацией по датам
    console.log('\n🔄 Тест 3: Получение таймслотов с фильтрацией по датам');
    const dateRangeResult = await ozon.getTimeslotsByDateRange(
      testIds[0],
      '2024-01-01T00:00:00Z',
      '2024-12-31T23:59:59Z'
    );
    logResult('Результат получения таймслотов с фильтрацией по датам:', dateRangeResult);

    // Тест 4: Получение списка заказов
    console.log('\n🔄 Тест 4: Получение списка заказов');
    const orderList = await ozon.getSupplyOrderList(10);
    logResult('Результат получения списка заказов:', orderList);

    // Тест 5: Сравнение таймслотов
    console.log('\n🔄 Тест 5: Сравнение таймслотов');
    const comparison = ozon.compareTimeslotObjects(
      { timeslots: singleResult.timeslots },
      { timeslots: dateRangeResult.timeslots },
      'test-comparison',
      1
    );
    logResult('Результат сравнения таймслотов:', comparison);

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);
  }
}

// Запуск тестов
testApiCalls(); 