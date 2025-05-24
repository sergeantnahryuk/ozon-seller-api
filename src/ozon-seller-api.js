// ozon-seller-api.js

let apiKey = null;
let clientId = null;

// Глобальный fetch для всего модуля
const fetchImpl = require('node-fetch');

const fs = require('fs');
const path = require('path');

// Путь к лог-файлу
const LOG_FILE_PATH = path.join(__dirname, 'differences.log');

// Функция логирования в файл
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE_PATH, fullMessage, 'utf8');
}

// memory for storing differences by comparison key // память для хранения отличий по ключу сравнения
let differencesMemory = {};

/**
 * Устанавливает API ключ для авторизации запросов
 * Sets the API key for request authorization
 * 
 * @param {string} key - API ключ, полученный в личном кабинете Ozon / API key from Ozon personal account
 * @throws {Error} Если ключ не передан / If key is not provided
 */
function useApi(key) {
  if (!key) throw new Error('API ключ обязателен / API key is required');
  apiKey = key;
}

/**
 * Устанавливает Client ID для авторизации запросов
 * Sets the Client ID for request authorization
 * 
 * @param {string} id - Client ID, полученный в личном кабинете Ozon / Client ID from Ozon personal account
 * @throws {Error} Если ID не передан / If ID is not provided
 */
function useClientId(id) {
  if (!id) throw new Error('Client ID обязателен / Client ID is required');
  clientId = id;
}

/**
 * Получает список заказов на поставку
 * Gets the list of supply orders
 * 
 * @param {number} [limit=100] - Максимальное количество заказов в ответе / Maximum number of orders in response
 * @param {number} [supplyOrderId=0] - ID заказа, начиная с которого нужно получить список / Order ID to start listing from
 * @param {Function} [callback] - Функция обратного вызова для обработки результата / Callback function to process the result
 * @returns {Promise<Object>} Объект с результатами запроса / Object with request results
 * @throws {Error} Если не установлены apiKey и clientId / If apiKey and clientId are not set
 */
async function getSupplyOrderList(limit = 100, supplyOrderId = 0, callback) {
  if (!apiKey || !clientId) throw new Error('apiKey и clientId должны быть заданы через useApi и useClientId / apiKey and clientId must be set using useApi and useClientId');
  if (limit > 100) {
    console.warn('Превышен максимальный лимит запросов. Установлено значение 100 / Maximum request limit exceeded. Set to 100');
    limit = 100;
  }
  const url = 'https://api-seller.ozon.ru/v2/supply-order/list';
  const body = {
    filter: { states: ["ORDER_STATE_DATA_FILLING"] },
    paging: { from_supply_order_id: supplyOrderId, limit: limit }
  };
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (callback) callback(data);
  return data;
}

/**
 * Получает таймслоты для массива ID заказов с учетом ограничения запросов в секунду
 * Gets timeslots for an array of order IDs with rate limiting
 * 
 * @param {string[]} ids - Массив ID заказов / Array of order IDs
 * @param {number} rps - Количество запросов в секунду default 5 / Requests per second default 5
 * @returns {Promise<Object[]>} Массив объектов с таймслотами / Array of objects with timeslots
 * @throws {Error} Если не установлены apiKey и clientId / If apiKey and clientId are not set
 */
async function getTimeslotsForIds(ids, rps = 5) {
  if (!apiKey || !clientId) throw new Error('apiKey и clientId должны быть заданы через useApi и useClientId / apiKey and clientId must be set using useApi and useClientId');
  const url = 'https://api-seller.ozon.ru/v1/supply-order/timeslot/get';
  const delay = 1000 / rps;
  const results = [];
  for (let i = 0; i < ids.length; i++) {
    const body = { supply_order_id: ids[i] };
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Client-Id': clientId,
        'Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    results.push(data);
    if (i < ids.length - 1) await new Promise(r => setTimeout(r, delay));
  }
  return results;
}

/**
 * Глубокое сравнение двух значений
 * @param {*} a 
 * @param {*} b 
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((el, i) => deepEqual(el, b[i]));
  }

  if (typeof a === 'object') {
    // Для таймслотов сравниваем только поля from и to
    if (a.from && a.to && b.from && b.to) {
      return a.from === b.from && a.to === b.to;
    }
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Сравнивает текущий массив с сохранённым ранее, фиксирует добавления и удаления
 * @param {Object[]} originalArray - Исходный массив объектов (первый ответ от API)
 * @param {Object[]} currentArray - Текущий массив объектов (новый ответ от API)
 * @param {string} comparisonKey - Ключ, по которому хранится оригинал
 * @param {number|string} [logId=0] - ID для логирования
 * @returns {{ added: Object[], removed: Object[] }} Отличия
 */
function compareTimeslotObjects(originalObj, currentObj, comparisonKey = 'default', logId = 0) {
  if (!currentObj) throw new Error('currentObj обязателен /  currentObj are required');
  if (currentObj.code) throw new Error(`Ответ апи содержит код ошибки ${currentObj.code}: ${currentObj.message} / API response contains error code ${currentObj.code}: ${currentObj.message}`);
  let originalArray;
  let compareWith;
  const currentArray = currentObj.timeslots;
  if(originalObj) originalArray = originalObj.timeslots;

  // Если ключа ещё нет — инициализируем память с оригинальным массивом
  if (!differencesMemory[comparisonKey]) {
    compareWith = originalArray || [];
    differencesMemory[comparisonKey] = {
      original: originalArray || [],
      history: [],
      current: currentArray || [] // Добавляем текущее состояние
    };
    console.log(`[INIT] Сохраняем оригинальный массив для ключа "${comparisonKey}"`);
  } else {
    compareWith = differencesMemory[comparisonKey].current || [];
    console.log(`[INIT] Загружен последний сохранённый массив для ключа "${comparisonKey}"`);
  }

  const current = currentArray || [];

  // Если передан originalObj, сравниваем с ним, иначе с текущим состоянием
  //const compareWith = originalObj ? savedOriginal : differencesMemory[comparisonKey].current;

  // Сравниваем с выбранным состоянием
  const added = current.filter(obj =>
    !compareWith.some(saved => deepEqual(saved, obj))
  );

  const removed = compareWith.filter(obj =>
    !current.some(current => deepEqual(current, obj))
  );

  const timestamp = new Date().toISOString();

  if (added.length || removed.length) {
    const logEntry = {
      id: logId,
      timestamp,
      added,
      removed,
    };

    differencesMemory[comparisonKey].history.push(logEntry);
    // Обновляем текущее состояние
    differencesMemory[comparisonKey].current = current;
    console.log('\n' + '='.repeat(50));
    console.log('📊 Memory State');
    console.log('='.repeat(50));
    console.log(`🔑 Key: ${comparisonKey}`);
    console.log('\n📜 Original State:');
    console.log(JSON.stringify(differencesMemory[comparisonKey].original, null, 2));
    console.log('\n🔄 Current State:');
    console.log(JSON.stringify(differencesMemory[comparisonKey].current, null, 2));
    console.log('\n📚 History:');
    console.log(JSON.stringify(differencesMemory[comparisonKey].history, null, 2));
    console.log('='.repeat(50) + '\n');

    console.log(`[LOG][${comparisonKey}] (${timestamp}) ID=${logId}`);
    
    if (added.length) {
        
        added.forEach((timeslot) => {
          let addedLog = `[LOG][${comparisonKey}] (${timestamp}) ID=${logId} ➕ Added timeslots:`;
            const fromDate = new Date(timeslot.from);
            const toDate = new Date(timeslot.to);
            const formattedFrom = `${fromDate.toLocaleDateString('ru-RU')} ${fromDate.toLocaleTimeString('ru-RU')}`;
            const formattedTo = `${toDate.toLocaleDateString('ru-RU')} ${toDate.toLocaleTimeString('ru-RU')}`;
            addedLog += ` С ${formattedFrom} по ${formattedTo}`;
            logToFile(addedLog);
        });
        
    }
    
    if (removed.length) {
        removed.forEach((timeslot) => {
          
        let removedLog = `[LOG][${comparisonKey}] (${timestamp}) ID=${logId} ➖ Removed timeslots:`;
            const fromDate = new Date(timeslot.from);
            const toDate = new Date(timeslot.to);
            const formattedFrom = `${fromDate.toLocaleDateString('ru-RU')} ${fromDate.toLocaleTimeString('ru-RU')}`;
            const formattedTo = `${toDate.toLocaleDateString('ru-RU')} ${toDate.toLocaleTimeString('ru-RU')}`;
            removedLog += ` С ${formattedFrom} по ${formattedTo}`;
            logToFile(removedLog);
        });
    }
  }

  return { added, removed };
}

function resetMemory() {
  differencesMemory = {};
  logToFile('Память для хранения отличий сброшена / Memory for storing differences reset');
}

/**
 * Получает FBO таймслоты для указанного заказа в заданном диапазоне дат
 * Gets FBO timeslots for specified order within date range
 * 
 * @param {string} id - ID заказа / Order ID
 * @param {string} [from] - Начальная дата в формате ISO (например, '2024-01-01T00:00:00Z') / Start date in ISO format (e.g., '2024-01-01T00:00:00Z')
 * @param {string} [to] - Конечная дата в формате ISO (например, '2024-01-31T23:59:59Z') / End date in ISO format (e.g., '2024-01-31T23:59:59Z')
 * @returns {Promise<Object>} Объект с таймслотами и информацией о временной зоне / Object with timeslots and timezone information
 * @throws {Error} Если не установлены apiKey и clientId / If apiKey and clientId are not set
 * @throws {Error} Если не указан ID заказа / If order ID is not provided
 */
async function getTimeslotsByDateRange(id, from, to, callback) {
  if (!apiKey || !clientId) throw new Error('apiKey и clientId должны быть заданы через useApi и useClientId / apiKey and clientId must be set using useApi and useClientId');
  if (!id) throw new Error('supply_order_id обязателен / supply_order_id is required');

  const body = { supply_order_id: id };
  const res = await fetchImpl('https://api-seller.ozon.ru/v1/supply-order/timeslot/get', {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  // Если нет параметров дат, возвращаем все таймслоты
  if (!from && !to) {
    return data;
  }

  // Фильтруем таймслоты по диапазону дат с учетом временной зоны
  if (data.timeslots && data.timezone && data.timezone.length > 0) {
    const timezone = data.timezone[0];
    const offset = timezone.offset;
    
    // Преобразуем входные даты с учетом временной зоны
    const fromDate = from ? new Date(from + offset) : null;
    const toDate = to ? new Date(to + offset) : null;

    data.timeslots = data.timeslots.filter(timeslot => {
      // Преобразуем даты таймслотов с учетом временной зоны
      const slotFrom = new Date(timeslot.from + offset);
      const slotTo = new Date(timeslot.to + offset);

      if (fromDate && slotTo < fromDate) return false;
      if (toDate && slotFrom > toDate) return false;
      return true;
    });
  }
  
  if (callback) callback(data);
  return data;
}

// Универсальный экспорт
const ozon = {
  useApi,
  useClientId,
  getSupplyOrderList,
  getTimeslotsForIds,
  compareTimeslotObjects,
  getTimeslotsByDateRange,
  resetMemory
};

module.exports = ozon; 