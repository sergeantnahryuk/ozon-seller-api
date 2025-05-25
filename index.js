const ozon = require('./src/ozon-seller-api');
const monitorTimeslots = require('./src/timeslot-monitor');

// Добавляем функцию мониторинга в основной объект
ozon.monitorTimeslots = monitorTimeslots;
 
module.exports = ozon; 