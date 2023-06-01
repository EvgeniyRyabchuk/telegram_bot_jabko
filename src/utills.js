const moment = require("moment");

const currenDateTimeStamp = `===== ${moment().format('DD-MM-YYYY h:mm:ss a')} =====`

const StatusMessages = {
   NO_CHANGES: `Нет изменений. \n${currenDateTimeStamp}`
}

module.exports = {
    StatusMessages,
    currenDateTimeStamp
}