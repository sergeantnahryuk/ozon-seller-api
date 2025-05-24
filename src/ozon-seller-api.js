/**
 * Ozon Seller API Client
 * Модуль для работы с API Ozon Seller, включая управление таймслотами и заказами
 * @module ozon-seller-api
 */

// Импорты
const fetchImpl = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Константы
const LOG_FILE_PATH = path.join(__dirname, 'differences.log');
const DEFAULT_COMPARISON_KEY = 'default';
const DEFAULT_LOG_ID = 0;
const API_BASE_URL = 'https://api-seller.ozon.ru';
const MAX_REQUESTS_PER_SECOND = 5;
const MAX_ORDERS_PER_REQUEST = 100;

// Глобальные переменные
let apiKey = null;
let clientId = null;
let differencesMemory = {};

/**
 * Форматирует дату в локальный формат
 * @param {Date} date - Дата для форматирования
 * @returns {string} Отформатированная дата в формате "ДД.ММ.ГГГГ ЧЧ:ММ:СС"
 */
const formatDate = (date) => {
  return `${date.toLocaleDateString('ru-RU')} ${date.toLocaleTimeString('ru-RU')}`;
};

/**
 * Записывает сообщение в лог-файл с временной меткой
 * @param {string} message - Сообщение для записи
 */
const logToFile = (message) => {
  const timestamp = new Date().toISOString();
  const fullMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE_PATH, fullMessage, 'utf8');
};

/**
 * Логирует изменение таймслота (добавление или удаление)
 * @param {string} type - Тип изменения ('➕ Added' или '➖ Removed')
 * @param {string} comparisonKey - Ключ сравнения
 * @param {string} timestamp - Временная метка
 * @param {number|string} logId - ID для логирования
 * @param {Object} timeslot - Объект таймслота
 */
const logTimeslotChange = (type, comparisonKey, timestamp, logId, timeslot) => {
  const fromDate = new Date(timeslot.from);
  const toDate = new Date(timeslot.to);
  const logMessage = `[LOG][${comparisonKey}] (${timestamp}) ID=${logId} ${type} timeslots: С ${formatDate(fromDate)} по ${formatDate(toDate)}`;
  logToFile(logMessage);
};

/**
 * Выполняет глубокое сравнение двух значений
 * @param {*} a - Первое значение для сравнения
 * @param {*} b - Второе значение для сравнения
 * @returns {boolean} true если значения равны, false в противном случае
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
    
    // Для объектов с timeslots сравниваем только массив timeslots
    if (a.timeslots !== undefined || b.timeslots !== undefined) {
      return deepEqual(a.timeslots || [], b.timeslots || []);
    }
    
    // Для остальных объектов сравниваем все поля
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Сравнивает текущий массив таймслотов с сохраненным ранее состоянием
 * @param {Object} currentObj - Текущий объект с таймслотами
 * @param {string} [comparisonKey=DEFAULT_COMPARISON_KEY] - Ключ для хранения состояния
 * @param {number|string} [logId=DEFAULT_LOG_ID] - ID для логирования
 * @returns {{ added: Object[], removed: Object[] }} Объект с добавленными и удаленными таймслотами
 * @throws {Error} Если currentObj не передан или содержит ошибку API
 */
function compareTimeslotObjects(currentObj, comparisonKey = DEFAULT_COMPARISON_KEY, logId = DEFAULT_LOG_ID) {
  // Валидация входных данных
  if (!currentObj) {
    throw new Error('currentObj обязателен / currentObj is required');
  }
  
  if (currentObj.code) {
    throw new Error(`Ответ апи содержит код ошибки ${currentObj.code}: ${currentObj.message}`);
  }

  // Получение текущего массива таймслотов
  const currentArray = currentObj.timeslots || [];

  // Инициализация или получение сохраненного состояния
  let compareWith;
  if (!differencesMemory[comparisonKey]) {
    compareWith = [];
    differencesMemory[comparisonKey] = {
      original: currentArray,
      history: [],
      latest: currentArray
    };
    console.log(`[INIT] Сохраняем оригинальный массив для ключа "${comparisonKey}"`);
  } else {
    compareWith = differencesMemory[comparisonKey].latest || [];
    console.log(`[INIT] Загружен последний сохранённый массив для ключа "${comparisonKey}"`);
  }

  // Сравнение массивов
  const added = currentArray.filter(obj => !compareWith.some(saved => deepEqual(saved, obj)));
  const removed = compareWith.filter(obj => !currentArray.some(current => deepEqual(current, obj)));

  // Если есть изменения, логируем их
  if (added.length || removed.length) {
    const timestamp = new Date().toISOString();
    const logEntry = { id: logId, timestamp, added, removed };
    
    differencesMemory[comparisonKey].history.push(logEntry);
    differencesMemory[comparisonKey].latest = currentArray;

    console.log(`[LOG][${comparisonKey}] (${timestamp}) ID=${logId}`);
    
    // Логирование добавленных таймслотов
    added.forEach(timeslot => logTimeslotChange('➕ Added', comparisonKey, timestamp, logId, timeslot));
    
    // Логирование удаленных таймслотов
    removed.forEach(timeslot => logTimeslotChange('➖ Removed', comparisonKey, timestamp, logId, timeslot));
  }

  return { added, removed };
}

/**
 * Устанавливает API ключ для авторизации запросов
 * @param {string} key - API ключ, полученный в личном кабинете Ozon
 * @throws {Error} Если ключ не передан
 */
function useApi(key) {
  if (!key) throw new Error('API ключ обязателен / API key is required');
  apiKey = key;
}

/**
 * Устанавливает Client ID для авторизации запросов
 * @param {string} id - Client ID, полученный в личном кабинете Ozon
 * @throws {Error} Если ID не передан
 */
function useClientId(id) {
  if (!id) throw new Error('Client ID обязателен / Client ID is required');
  clientId = id;
}

/**
 * Получает список заказов на поставку
 * @param {number} [limit=100] - Максимальное количество заказов в ответе
 * @param {number} [supplyOrderId=0] - ID заказа, начиная с которого нужно получить список
 * @param {Function} [callback] - Функция обратного вызова для обработки результата
 * @returns {Promise<Object>} Объект с результатами запроса
 * @throws {Error} Если не установлены apiKey и clientId
 */
async function getSupplyOrderList(limit = MAX_ORDERS_PER_REQUEST, supplyOrderId = 0, callback) {
  if (!apiKey || !clientId) {
    throw new Error('apiKey и clientId должны быть заданы через useApi и useClientId');
  }
  
  if (limit > MAX_ORDERS_PER_REQUEST) {
    console.warn('Превышен максимальный лимит запросов. Установлено значение 100');
    limit = MAX_ORDERS_PER_REQUEST;
  }

  const url = `${API_BASE_URL}/v2/supply-order/list`;
  const body = {
    filter: { states: ["ORDER_STATE_DATA_FILLING"] },
    paging: { from_supply_order_id: supplyOrderId, limit }
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
 * @param {string[]} ids - Массив ID заказов
 * @param {number} [rps=MAX_REQUESTS_PER_SECOND] - Количество запросов в секунду
 * @returns {Promise<Object[]>} Массив объектов с таймслотами
 * @throws {Error} Если не установлены apiKey и clientId
 */
async function getTimeslotsForIds(ids, rps = MAX_REQUESTS_PER_SECOND) {
  if (!apiKey || !clientId) {
    throw new Error('apiKey и clientId должны быть заданы через useApi и useClientId');
  }

  const url = `${API_BASE_URL}/v1/supply-order/timeslot/get`;
  const delay = 1000 / rps;
  const results = [];

  for (const id of ids) {
    const body = { supply_order_id: id };
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
    
    if (id !== ids[ids.length - 1]) {
      await new Promise(r => setTimeout(r, delay));
    }
  }

  return results;
}

/**
 * Получает FBO таймслоты для указанного заказа в заданном диапазоне дат
 * @param {string} id - ID заказа
 * @param {string} [from] - Начальная дата в формате ISO (например, '2024-01-01T00:00:00Z')
 * @param {string} [to] - Конечная дата в формате ISO (например, '2024-01-31T23:59:59Z')
 * @param {Function} [callback] - Функция обратного вызова для обработки результата
 * @returns {Promise<Object>} Объект с таймслотами и информацией о временной зоне
 * @throws {Error} Если не установлены apiKey и clientId или не указан ID заказа
 */
async function getTimeslotsByDateRange(id, from, to, callback) {
  if (!apiKey || !clientId) {
    throw new Error('apiKey и clientId должны быть заданы через useApi и useClientId');
  }
  
  if (!id) {
    throw new Error('supply_order_id обязателен');
  }

  const url = `${API_BASE_URL}/v1/supply-order/timeslot/get`;
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Client-Id': clientId,
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ supply_order_id: id }),
  });

  const data = await res.json();

  // Если нет параметров дат, возвращаем все таймслоты
  if (!from && !to) {
    if (callback) callback(data);
    return data;
  }

  // Фильтруем таймслоты по диапазону дат
  if (data.timeslots && data.timezone?.length > 0) {
    const timezone = data.timezone[0];
    const offset = timezone.offset;
    
    const fromDate = from ? new Date(from + offset) : null;
    const toDate = to ? new Date(to + offset) : null;

    data.timeslots = data.timeslots.filter(timeslot => {
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

/**
 * Сбрасывает память для хранения отличий
 */
function resetMemory() {
  differencesMemory = {};
  logToFile('Память для хранения отличий сброшена / Memory for storing differences reset');
}

// Экспорт функций
module.exports = {
  useApi,
  useClientId,
  getSupplyOrderList,
  getTimeslotsForIds,
  compareTimeslotObjects,
  getTimeslotsByDateRange,
  resetMemory
}; 