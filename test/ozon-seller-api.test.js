const assert = require('assert');
const ozon = require('./ozon-seller-api');

// Сохраняем оригинальный fetchImpl
const nodeFetch = require('node-fetch');
let originalFetchImpl = nodeFetch;

describe('getTimeslotsForIds', function() {
  // Увеличиваем таймаут для всех тестов
  this.timeout(10000);

  const mockApiKey = 'test-api-key-key';
  const mockClientId = 'test-client-id';
  const mockIds = [
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
  const mockRps = 2;

  let mockFetchCalls = [];

  beforeEach(() => {
    // Сбрасываем учетные данные API перед каждым тестом
    ozon.useApi(mockApiKey);
    ozon.useClientId(mockClientId);
    
    // Сбрасываем массив вызовов
    mockFetchCalls = [];

    // Подменяем fetchImpl
    ozon.setFetchImpl(async (url, options) => {
      mockFetchCalls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          timeslots: [
            { from: '2024-01-01T10:00:00Z', to: '2024-01-01T12:00:00Z' }
          ]
        })
      };
    });
  });

  afterEach(() => {
    // Возвращаем оригинальный fetchImpl
    ozon.setFetchImpl(originalFetchImpl);
    mockFetchCalls = [];
  });

  it('должен выбросить ошибку, если apiKey и clientId не установлены', async () => {
    // Ожидаем ошибку при установке пустого apiKey
    assert.throws(() => {
      ozon.useApi('');
    }, /API ключ обязателен/);
    // Ожидаем ошибку при установке пустого clientId
    assert.throws(() => {
      ozon.useClientId('');
    }, /Client ID обязателен/);
  });

  it('должен делать корректные API-вызовы для каждого ID', async () => {
    const results = await ozon.getTimeslotsForIds(mockIds, mockRps);

    // Проверяем количество вызовов
    assert.strictEqual(mockFetchCalls.length, mockIds.length);

    // Проверяем параметры каждого вызова
    mockIds.forEach((id, index) => {
      const call = mockFetchCalls[index];
      assert.strictEqual(call.url, 'https://api-seller.ozon.ru/v1/supply-order/timeslot/get');
      assert.strictEqual(call.options.method, 'POST');
      assert.deepStrictEqual(call.options.headers, {
        'Client-Id': mockClientId,
        'Api-Key': mockApiKey,
        'Content-Type': 'application/json',
      });
      assert.deepStrictEqual(
        JSON.parse(call.options.body),
        { supply_order_id: id }
      );
    });

    // Проверяем результаты
    assert(Array.isArray(results));
    assert.strictEqual(results.length, mockIds.length);
    assert.deepStrictEqual(results[0].timeslots, [
      { from: '2024-01-01T10:00:00Z', to: '2024-01-01T12:00:00Z' }
    ]);
  });

  it('должен корректно обрабатывать ошибки API', async () => {
    // Подменяем fetchImpl для возврата ошибки
    ozon.setFetchImpl(async () => ({
      ok: true,
      json: async () => ({
        code: 8,
        message: 'You have reached request rate limit per second'
      })
    }));

    const results = await ozon.getTimeslotsForIds(mockIds, mockRps);

    // Проверяем результаты
    assert(Array.isArray(results));
    assert.strictEqual(results.length, mockIds.length);
    assert.deepStrictEqual(results[0], {
      code: 8,
      message: 'You have reached request rate limit per second'
    });
  });

  it('должен соблюдать ограничение по количеству запросов в секунду', async () => {
    const startTime = Date.now();
    await ozon.getTimeslotsForIds(mockIds, mockRps);
    const endTime = Date.now();

    // Вычисляем ожидаемое минимальное время на основе RPS
    const expectedMinTime = (mockIds.length - 1) * (1000 / mockRps);

    // Проверяем, что общее затраченное время не меньше ожидаемого минимального времени
    assert(endTime - startTime >= expectedMinTime);
  });

  it('должен корректно обрабатывать пустой массив ID', async () => {
    const results = await ozon.getTimeslotsForIds([], mockRps);
    assert(Array.isArray(results));
    assert.strictEqual(results.length, 0);
    assert.strictEqual(mockFetchCalls.length, 0);
  });
}); 