const assert = require('assert');
const ozon = require('../src/ozon-seller-api');

/**
 * Тестовые данные
 * Каждый объект представляет собой возможное состояние таймслотов
 * и используется для проверки различных сценариев работы функции compareTimeslotObjects
 */

// Базовый объект с одним таймслотом
const obj1 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Объект с двумя таймслотами
const obj2 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' },
    { from: '2019-08-25T14:15:22Z', to: '2019-08-25T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Объект с одним таймслотом, отличным от предыдущих
const obj3 = {
  timeslots: [
    { from: '2019-08-27T14:15:22Z', to: '2019-08-27T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Объект с тремя таймслотами
const obj4 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' },
    { from: '2019-08-25T14:15:22Z', to: '2019-08-25T14:15:22Z' },
    { from: '2019-08-26T14:15:22Z', to: '2019-08-26T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Объект с пустым массивом таймслотов
const obj5 = {
  timeslots: [],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Объект с пустым массивом timezone
const obj6 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: []
};

// Объект с null вместо массива таймслотов
const obj7 = {
  timeslots: null,
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Объект с null вместо массива timezone
const obj8 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: null
};

// Объект с дополнительным полем в корне
const obj9 = {
  timeslots: [
    { from: '2019-08-29T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ],
  extraField: 'value'
};

// Объект с дополнительным полем в таймслоте
const obj10 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z', extraField: 'value' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Дополнительные тестовые объекты для расширенного тестирования
const obj12 = {
  timeslots: [
    { from: 'invalid-date', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj13 = {
  timeslots: [
    { from: '2019-08-24T14:15:22+03:00', to: '2019-08-24T14:15:22+03:00' }
  ],
  timezone: [
    { iana_name: 'Europe/Moscow', offset: '+03:00' }
  ]
};

const obj14 = {
  timeslots: [
    { from: '1970-01-01T00:00:00Z', to: '1970-01-01T00:00:00Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj15 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2025-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj16 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'Europe/Moscow', offset: '+03:00' },
    { iana_name: 'Europe/London', offset: '+01:00' }
  ]
};

const obj17 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z' } // отсутствует поле to
  ],
  timezone: [
    { iana_name: 'string' } // отсутствует поле offset
  ]
};

const obj18 = {
  timeslots: Array(1000).fill().map((_, i) => ({
    from: new Date(2019, 7, 24 + i).toISOString(),
    to: new Date(2019, 7, 24 + i).toISOString()
  })),
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj19 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: '±00:00' }
  ]
};

// === TESTS ===
async function runTests() {
  ozon.resetMemory(); // Очищаем состояние перед тестами

  /**
   * TEST 1: Первое добавление таймслотов
   * Проверяет, что при первом вызове функции с новым ключом
   * все таймслоты из входного объекта добавляются в результат
   */
  console.log('✅ TEST 1: Первое добавление с ключом');
  let result = ozon.compareTimeslotObjects(obj2, 'testKey', 42);
  console.log('result', result);
  assert.strictEqual(result.added.length, 2);
  assert.strictEqual(result.added[0].from, '2019-08-24T14:15:22Z');
  assert.strictEqual(result.added[1].from, '2019-08-25T14:15:22Z');

  /**
   * TEST 2: Повторное добавление тех же таймслотов
   * Проверяет, что при повторном вызове с теми же таймслотами
   * не происходит новых добавлений
   */
  console.log('✅ TEST 2: Повторное добавление без изменений');
  result = ozon.compareTimeslotObjects(obj2, 'testKey', 42);
  assert.strictEqual(result.added.length, 0);

  /**
   * TEST 3: Замена таймслотов
   * Проверяет, что при передаче новых таймслотов
   * старые удаляются, а новые добавляются
   */
  console.log('✅ TEST 3: Добавление нового и удаление старого');
  result = ozon.compareTimeslotObjects(obj3, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);
  assert.strictEqual(result.added[0].from, '2019-08-27T14:15:22Z');

  /**
   * TEST 4: Возврат к предыдущим таймслотам
   * Проверяет, что при возврате к предыдущим таймслотам
   * они корректно добавляются в результат
   */
  console.log('✅ TEST 4: Возврат к старым');
  result = ozon.compareTimeslotObjects(obj2, 'testKey', 42);
  assert.strictEqual(result.added.length, 2);
  assert.strictEqual(result.added[0].from, '2019-08-24T14:15:22Z');
  assert.strictEqual(result.added[1].from, '2019-08-25T14:15:22Z');

  /**
   * TEST 5: Пустой массив таймслотов
   * Проверяет, что при передаче пустого массива таймслотов
   * все существующие таймслоты удаляются
   */
  console.log('✅ TEST 5: Пустой массив таймслотов');
  result = ozon.compareTimeslotObjects(obj5, 'testKey', 42);
  assert.strictEqual(result.removed.length, 2);
  assert.strictEqual(result.removed[0].from, '2019-08-24T14:15:22Z');
  assert.strictEqual(result.removed[1].from, '2019-08-25T14:15:22Z');

  /**
   * TEST 6: Пустой массив timezone
   * Проверяет, что пустой массив timezone не влияет на сравнение таймслотов
   */
  console.log('✅ TEST 6: Пустой массив timezone');
  result = ozon.compareTimeslotObjects(obj6, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);
  assert.strictEqual(result.added[0].from, '2019-08-24T14:15:22Z');

  /**
   * TEST 7: Null вместо массива таймслотов
   * Проверяет, что null вместо массива таймслотов обрабатывается как пустой массив
   */
  console.log('✅ TEST 7: Null вместо массива таймслотов');
  result = ozon.compareTimeslotObjects(obj7, 'testKey', 42);
  assert.strictEqual(result.removed.length, 1);

  /**
   * TEST 8: Null вместо массива timezone
   * Проверяет, что null вместо массива timezone не влияет на сравнение таймслотов
   */
  console.log('✅ TEST 8: Null вместо массива timezone');
  result = ozon.compareTimeslotObjects(obj8, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);
  assert.strictEqual(result.added[0].from, '2019-08-24T14:15:22Z');

  /**
   * TEST 9: Дополнительное поле в корне объекта
   * Проверяет, что дополнительные поля в корне объекта не влияют на сравнение таймслотов
   */
  console.log('✅ TEST 9: Дополнительное поле в корне объекта');
  result = ozon.compareTimeslotObjects(obj9, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);
  assert.strictEqual(result.added[0].from, '2019-08-29T14:15:22Z');

  /**
   * TEST 10: Дополнительное поле в таймслоте
   * Проверяет, что дополнительные поля в таймслотах не влияют на сравнение
   */
  console.log('✅ TEST 10: Дополнительное поле в таймслоте');
  result = ozon.compareTimeslotObjects(obj10, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);
  assert.strictEqual(result.added[0].from, '2019-08-24T14:15:22Z');

  // Дополнительные тесты
  console.log('✅ TEST 12: Некорректный формат даты');
  result = ozon.compareTimeslotObjects(obj12, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);

  console.log('✅ TEST 13: Разные временные зоны');
  result = ozon.compareTimeslotObjects(obj13, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);

  console.log('✅ TEST 14: Исторические даты');
  result = ozon.compareTimeslotObjects(obj14, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);

  console.log('✅ TEST 15: Длительный период');
  result = ozon.compareTimeslotObjects(obj15, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);

  console.log('✅ TEST 16: Множественные timezone');
  result = ozon.compareTimeslotObjects(obj16, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);

  console.log('✅ TEST 17: Частично заполненные объекты');
  result = ozon.compareTimeslotObjects(obj17, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);

  console.log('✅ TEST 18: Большое количество таймслотов');
  result = ozon.compareTimeslotObjects(obj18, 'testKey', 42);
  assert.strictEqual(result.added.length, 1000);

  console.log('✅ TEST 19: Специальные символы в timezone');
  result = ozon.compareTimeslotObjects(obj19, 'testKey', 42);
  assert.strictEqual(result.added.length, 1);

  // Тесты производительности и стресс-тесты
  console.log('\n=== Тесты производительности и стресс-тесты ===\n');

  // TEST 20: Проверка производительности
  console.log('✅ TEST 20: Проверка производительности');
  const startTime = process.hrtime();
  result = ozon.compareTimeslotObjects(obj18, 'perfTest', 42);
  const endTime = process.hrtime(startTime);
  const executionTime = (endTime[0] * 1000 + endTime[1] / 1000000).toFixed(2);
  console.log(`Время выполнения: ${executionTime}ms`);
  assert(executionTime < 1000, 'Время выполнения превышает 1 секунду');

  // TEST 21: Проверка утечек памяти
  console.log('✅ TEST 21: Проверка утечек памяти');
  const initialMemory = process.memoryUsage().heapUsed;
  for (let i = 0; i < 100; i++) {
    ozon.compareTimeslotObjects(obj18, `memoryTest${i}`, 42);
  }
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryUsed = ((finalMemory - initialMemory) / 1024 / 1024).toFixed(2);
  console.log(`Использовано памяти: ${memoryUsed}MB`);
  assert(memoryUsed < 100, 'Использование памяти превышает 100MB');

  // TEST 22: Проверка конкурентных вызовов
  console.log('✅ TEST 22: Проверка конкурентных вызовов');
  const concurrentCalls = 10;
  const promises = Array(concurrentCalls).fill().map((_, i) => 
    ozon.compareTimeslotObjects(obj18, `concurrentTest${i}`, 42)
  );
  const results = await Promise.all(promises);
  assert(results.length === concurrentCalls, 'Не все конкурентные вызовы завершились');

  // TEST 23: Проверка обработки ошибок API
  console.log('✅ TEST 23: Проверка обработки ошибок API');
  const errorObj = {
    code: 'ERROR_CODE',
    message: 'Test error message'
  };
  try {
    ozon.compareTimeslotObjects(errorObj, 'errorTest', 42);
    assert.fail('Должно было выбросить ошибку');
  } catch (error) {
    assert(error.message.includes('ERROR_CODE'), 'Неверное сообщение об ошибке');
  }



  // TEST 25: Проверка обработки таймаутов
  console.log('✅ TEST 25: Проверка обработки таймаутов');
  const timeoutObj = {
    timeslots: Array(10000).fill().map((_, i) => ({
      from: new Date(2019, 7, 24 + i).toISOString(),
      to: new Date(2019, 7, 24 + i).toISOString()
    })),
    timezone: [
      { iana_name: 'string', offset: 'string' }
    ]
  };
  const timeoutStart = process.hrtime();
  try {
    ozon.compareTimeslotObjects(timeoutObj, 'timeoutTest', 42);
    const timeoutEnd = process.hrtime(timeoutStart);
    const timeoutExecution = (timeoutEnd[0] * 1000 + timeoutEnd[1] / 1000000).toFixed(2);
    console.log(`Время выполнения с большим набором данных: ${timeoutExecution}ms`);
    assert(timeoutExecution < 5000, 'Время выполнения превышает 5 секунд');
  } catch (error) {
    assert.fail('Не должно было выбросить ошибку при таймауте');
  }

  console.log('\n✅ Все тесты производительности и стресс-тесты прошли успешно!');
}

// Запускаем тесты
runTests().catch(error => {
  console.error('❌ Ошибка при выполнении тестов:', error);
  process.exit(1);
});

/* 
Ожидаемый лог при успешном выполнении всех тестов:

✅ TEST 1: Первое добавление с ключом
✅ TEST 2: Повторное добавление без изменений
✅ TEST 3: Добавление нового и удаление старого
✅ TEST 4: Возврат к старым
✅ TEST 5: Пустой массив таймслотов
✅ TEST 6: Пустой массив timezone
✅ TEST 7: Null вместо массива таймслотов
✅ TEST 8: Null вместо массива timezone
✅ TEST 9: Дополнительное поле в корне объекта
*/
