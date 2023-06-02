const moment = require("moment");

const currenDateTimeStamp = `===== ${moment().format('DD-MM-YYYY h:mm:ss a')} =====`

const StatusMessages = {
   NO_CHANGES: `Нет изменений. \n${currenDateTimeStamp}`
}

const CommandName = {
    TRACK: '/track',
    START: '/start',
    CHECK: '/check',
    INFO: '/info'
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

const GoodChangesMsgFormat = (goods) => {
    //TODO: persent
    const res = goods.length > max_msg_c_at_time
        ? goods.slice(0, max_msg_c_at_time) : goods;

    return res.map(changedGood => {
        return `<a href="${changedGood.good.url}">${changedGood.good.name}</a>
Before <s>${changedGood.oldPriceUah}</s> -
After <b>${changedGood.newPriceUah}</b>.`}).join('\n');
}

module.exports = {
    StatusMessages,
    currenDateTimeStamp,
    CommandName,
    GoodsPageType,
    GoodChangesMsgFormat
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