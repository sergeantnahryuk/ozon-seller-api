const assert = require('assert');
const ozon = require('./ozon-seller-api');

// Исходные данные
const obj1 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj2 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' },
    { from: '2019-08-25T14:15:22Z', to: '2019-08-25T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj3 = {
  timeslots: [
    { from: '2019-08-27T14:15:22Z', to: '2019-08-27T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// Дополнительные тестовые объекты
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

const obj5 = {
  timeslots: [], // Пустой массив таймслотов
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj6 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [] // Пустой массив timezone
};

const obj7 = {
  timeslots: null, // null вместо массива
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

const obj8 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: null // null вместо массива
};

const obj9 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z' }
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ],
  extraField: 'value' // Дополнительное поле
};

const obj10 = {
  timeslots: [
    { from: '2019-08-24T14:15:22Z', to: '2019-08-24T14:15:22Z', extraField: 'value' } // Дополнительное поле в таймслоте
  ],
  timezone: [
    { iana_name: 'string', offset: 'string' }
  ]
};

// === TESTS ===

ozon.resetMemory(); // Очищаем состояние перед тестами

// TEST 1: Проверяем первое добавление таймслота
// Ожидаемый результат: должен добавиться один новый таймслот с датой 2019-08-25
console.log('✅ TEST 1: Первое добавление с ключом');
let result = ozon.compareTimeslotObjects(obj1, obj2, 'testKey', 42);
assert.strictEqual(result.added.length, 1);
assert.strictEqual(result.added[0].from, '2019-08-25T14:15:22Z');

// TEST 2: Проверяем повторное добавление тех же таймслотов
// Ожидаемый результат: не должно быть новых добавлений
console.log('✅ TEST 2: Повторное добавление без изменений');
result = ozon.compareTimeslotObjects(null, obj2, 'testKey', 42);
assert.strictEqual(result.added.length, 0);

// TEST 3: Проверяем замену всех таймслотов на новые
// Ожидаемый результат: должен добавиться один новый таймслот с датой 2019-08-27
console.log('✅ TEST 3: Добавление нового и удаление старого');
result = ozon.compareTimeslotObjects(null, obj3, 'testKey', 42);
assert.strictEqual(result.added.length, 1);
assert.strictEqual(result.added[0].from, '2019-08-27T14:15:22Z');

// TEST 4: Проверяем возврат к предыдущим таймслотам
// Ожидаемый результат: должны добавиться два таймслота
console.log('✅ TEST 4: Возврат к старым');
result = ozon.compareTimeslotObjects(null, obj2, 'testKey', 42);
assert.strictEqual(result.added.length, 2);

// TEST 5: Проверяем обработку пустого массива таймслотов
// Ожидаемый результат: должен вернуть один удаленный таймслот
console.log('✅ TEST 5: Пустой массив таймслотов');
result = ozon.compareTimeslotObjects(obj1, obj5, 'testKey', 42);
assert.strictEqual(result.removed.length, 1);

// TEST 6: Проверяем обработку пустого массива timezone
// Ожидаемый результат: не должно быть изменений
console.log('✅ TEST 6: Пустой массив timezone');
result = ozon.compareTimeslotObjects(obj1, obj6, 'testKey', 42);
assert.strictEqual(result.added.length, 0);

// TEST 7: Проверяем обработку null вместо массива таймслотов
// Ожидаемый результат: должен вернуть один удаленный таймслот
console.log('✅ TEST 7: Null вместо массива таймслотов');
result = ozon.compareTimeslotObjects(obj1, obj7, 'testKey', 42);
assert.strictEqual(result.removed.length, 1);

// TEST 8: Проверяем обработку null вместо массива timezone
// Ожидаемый результат: не должно быть изменений
console.log('✅ TEST 8: Null вместо массива timezone');
result = ozon.compareTimeslotObjects(obj1, obj8, 'testKey', 42);
assert.strictEqual(result.added.length, 0);

// TEST 9: Проверяем обработку дополнительного поля в корне объекта
// Ожидаемый результат: не должно быть изменений
console.log('✅ TEST 9: Дополнительное поле в корне объекта');
result = ozon.compareTimeslotObjects(obj1, obj9, 'testKey', 42);
assert.strictEqual(result.added.length, 0);

// TEST 10: Проверяем обработку дополнительного поля в таймслоте
// Ожидаемый результат: не должно быть изменений
console.log('✅ TEST 10: Дополнительное поле в таймслоте');
result = ozon.compareTimeslotObjects(obj1, obj10, 'testKey', 42);
assert.strictEqual(result.added.length, 0);

// TEST 11: Проверяем множественные изменения таймслотов
// Ожидаемый результат: должны добавиться два новых таймслота
console.log('✅ TEST 11: Множественные изменения');
result = ozon.compareTimeslotObjects(obj1, obj4, 'testKey', 42);
assert.strictEqual(result.added.length, 2);

console.log('✅ Все тесты прошли успешно!');

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
