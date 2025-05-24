const ozon = require('./ozon-seller-api');
const monitorTimeslots = require('./timeslot-monitor');

// Добавляем функцию мониторинга в основной объект
ozon.monitorTimeslots = monitorTimeslots;
 
module.exports = ozon; 