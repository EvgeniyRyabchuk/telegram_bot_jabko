const moment = require("moment");

const currenDateTimeStamp = `===== ${moment().format('DD-MM-YYYY h:mm:ss a')} =====`

const StatusMessages = {
   NO_CHANGES: `Нет изменений. \n${currenDateTimeStamp}`,
    SUCCESS_DELETED: 'Удаление прошло успешно',
    SUCCESS_CREATED: 'Запись создана',
    ERROR: 'Произошла ошибка. Попробуйте позже',
    COMMAND_NOT_FOUND: 'Комманда не найдена',
    UNCORRECT_DATA: 'Не верно введеные дынные. Попробуйте сново!'
}

const CommandName = {
    TRACK: '/track',
    START: '/start',
    CHECK: '/check',
    INFO: '/info',
    TRACK_LIST: '/track_list',
    DELETE_TRACK_ITEM: '/delete_track_item'
}


const GoodsPageType = {
    LIST: {
        NameSelector: '.slide-title > span',
        UrlSelector: '.product_link',
        PriceUah: '.price-cur > .uah > span',
    },
    SHOW: {
        NameSelector: '.product-info__title',
        UrlSelector: '.container-crumbs > ul > li:nth-last-child(1) > a',
        PriceUah: '.price-new__uah',
        PriceUsd: '.price-new__usd'
    }
}

const max_msg_c_at_time = 24;
const getColoredSpan = (color, val, char = null, type = 'abs') => {
    if(type == 'abs')
        return `<b style=\"color: ${color}\">${char == '+' ? '+' : ''}${val} грн</b>`;
    if(type == 'percent')
        return `<b style=\"color: ${color}\">${char}${val}%</b>`;
}


const goodChangesMsgFormat = (goods) => {
    const res = goods.length > max_msg_c_at_time
        ? goods.slice(0, max_msg_c_at_time) : goods;

    return res.map(changedGood => {
        const {percentDiff: valPercent, absoluteDiff: valAbs, char } = changedGood.diff;
        const diffColor = changedGood.diff.percentDiff > 0 ? 'green' : 'red';

        return `<a href="${changedGood.good.url}">${changedGood.good.name}</a>
Before <s>${changedGood.oldPriceUah}</s> - 
After <b>${changedGood.newPriceUah} (${getColoredSpan(diffColor,valPercent,char,'percent')} / ${getColoredSpan(diffColor, valAbs, char, 'abs')}).</b>`
    }).join('\n')
}

const fromTextToMoney = (text) => {
    return parseFloat(text
        .replace('грн', '')
        .replace(' ', '')
        .replace('$', ''))
        .toFixed(2);
}


module.exports = {
    StatusMessages,
    currenDateTimeStamp,
    CommandName,
    GoodsPageType,
    GoodChangesMsgFormat: goodChangesMsgFormat,
    fromTextToMoney
}














/*


const test = async () => {
    await sequelize.sync();
    User.create({ name: '123'});
    const users = await User.findAll();
    console.log(users);
    console.log('db is ready');
}

 */