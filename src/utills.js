const moment = require("moment");
const {User, TrackedGood, Good} = require("../database/models");
const {getJsDomByUrl, parseGood, commitPriceChange} = require("./checker");


const CommandName = {
    START: '/start',
    SCAN_BY_CATEGORY: '/scan_by_category',
    TRACK: '/track',
    TRACK_LIST: '/track_list',
    CATEGORY_LIST: '/category_list',
    DELETE_TRACK_ITEM: '/delete_track_item',
    INFO: '/info'
}

const currenDateTimeStamp = `===== ${moment().format('DD-MM-YYYY h:mm:ss a')} =====`

const StatusMessages = {
    NO_CHANGES: `Нет изменений. \n${currenDateTimeStamp}`,
    SUCCESS_DELETED: 'Удаление прошло успешно',
    SUCCESS_CREATED: 'Запись создана',
    ERROR: 'Произошла ошибка. Попробуйте позже',
    COMMAND_NOT_FOUND: 'Комманда не найдена',
    NOT_CORRECT_DATA: 'Не верно введеные дынные. Попробуйте сново!',
    INFO_TIP: `Вы можете посмотреть список комманд с помощью команды ${CommandName.INFO}`,
    SUCCESS_ADD_TO_TRACK_LIST: 'Ок. Буду следить.',
    NOT_ALLOW_FOR_YOUR_ROLE: 'Комманда не может быть выполненна вами'
}

const CallbackPayloadSeparator = '#';

const BotCommand = [
    {
        name: CommandName.START,
        description: 'Enter start to register yourself in system',
        default_answer: `Добро пожаловать. ${StatusMessages.INFO_TIP}`,

    },
    {
        name: CommandName.SCAN_BY_CATEGORY,
        description: 'Scan all goods by category',
        default_answer: 'Выберите категорию',

    },
    {
        name: CommandName.TRACK,
        description: 'Add good to your personal track list',
        default_answer: 'Скинь мне ссылку на товар магазина Ябко',
    },
    {
        name: CommandName.TRACK_LIST,
        description: 'Show your track list',
        default_answer: CommandName.TRACK_LIST,

    },
    {
        name: CommandName.CATEGORY_LIST,
        description: 'Show category list',
        default_answer: 'Вот список категорий в магазине Ябко.\n' +
        'Вы можете нажать на соответствующию категорию и узнать от последних изменениях цен в ней (если они есть)'
    },
    {
        name: CommandName.DELETE_TRACK_ITEM,
        description: 'Delete track entry from tack list',
        default_answer: 'Введите id товара для удаления',

    },
    {
        name: CommandName.INFO,
        description: 'Show your bot capability',
        default_answer: ''
    },
];

const getDefAnswer = (text) => BotCommand.find(bc => bc.name === text).default_answer;

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

const stickerList = [
    {
        name: 'Hello',
        url: `https://tlgrm.ru/_/stickers/a93/3bb/a933bb07-c608-4603-8765-ee62fb481afc/1.webp`
    }
]

const max_msg_c_at_time = 24;
const getColoredSpan = (color, val, char = null, type = 'abs') => {
    if(type == 'abs')
        return `<b style=\"color: ${color}\">${char == '+' ? '+' : ''}${val} грн</b>`;
    if(type == 'percent')
        return `<b style=\"color: ${color}\">${char}${val}%</b>`;
}

const goodChangesMsgFormat = (changedGoods) => {
    const res = changedGoods.length > max_msg_c_at_time
        ? changedGoods.slice(0, max_msg_c_at_time) : changedGoods;

    return res.map(changedGood => {
        const {percentDiff: valPercent, absoluteDiff: valAbs, char } = changedGood.diff;
        const diffColor = changedGood.diff.percentDiff > 0 ? 'green' : 'red';

        return `<a href="${changedGood.good.url}">${changedGood.good.name}</a>
Before <s>${changedGood.oldPriceUah}</s> - 
After <b>${changedGood.newPriceUah} (${getColoredSpan(diffColor,valPercent,char,'percent')} / ${getColoredSpan(diffColor, valAbs, char, 'abs')}).</b>`
    })
}

const fromTextToMoney = (text) => {
    return parseFloat(text
        .replace('грн', '')
        .replace(' ', '')
        .replace('$', ''))
        .toFixed(2);
}

const getOptionsFromCategories = (categories) => {
    return {
        reply_markup: JSON.stringify({
            inline_keyboard: categories.map(category => (
                [{ text: category.name, callback_data: `${CommandName.SCAN_BY_CATEGORY}${CallbackPayloadSeparator}${category.id}`}]
            ))
        })
    }
}

const getExtraQuestion = (commandName, step = 0) => {
    return ExtraQuestions.find(eq => eq.command == commandName).questions[step];
}

const ExtraQuestions = [
    {
        command: CommandName.TRACK,
        questions: ['От скольки процентов скидки отслеживать товар?']
    }
]

const getInfoMsg = () => {
    const title = 'Привет, этот бот призван помочь тебе купить по самой низкой цене\n';
    const content = 'Для этого ты можешь воспользоваться таким функционалом как: \n' +
        BotCommand.map(bc => `- ${bc.name} - ${bc.description}`).join('\n');
    const footer = '\n === Приятного пользования! === \n';
    return `${title}${content}${footer}`;
}

module.exports = {
    StatusMessages,
    CommandName,
    BotCommand,
    currenDateTimeStamp,
    GoodsPageType,
    goodChangesMsgFormat,
    fromTextToMoney,
    CallbackPayloadSeparator,
    getOptionsFromCategories,
    stickerList,
    getDefAnswer,
    getExtraQuestion,
    getInfoMsg
}














/*


const test = async () => {
    await sequelize.sync();
    User.create({ name: '123'});
    const users = await User.findAll();
    console.log(users);
    console.log('db is ready');
}


const options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: CommandName.INFO, callback_data: '1' }],
        [{ text: CommandName.TRACK, callback_data: '3' }],
        [{ text: CommandName.TRACK_LIST, callback_data: '4' }],
        [{ text: CommandName.DELETE_TRACK_ITEM, callback_data: '5' }]
      ]
    })
};




 # ┌────────────── second (optional)
 # │ ┌──────────── minute
 # │ │ ┌────────── hour
 # │ │ │ ┌──────── day of month
 # │ │ │ │ ┌────── month
 # │ │ │ │ │ ┌──── day of week
 # │ │ │ │ │ │
 # │ │ │ │ │ │
 # * * * * * *


 */