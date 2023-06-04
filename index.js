
const sequelize = require("./database");
const {
    User,
    Category,
    Good, TrackedGood
} = require("./database/models");

const {saveCategoriesIfNotExist, getAllGoodsByCategory, parseGood, getJsDomByUrl, commitPriceChange} = require("./src/checker");
const { StatusMessages, CommandName, GoodsPageType, GoodChangesMsgFormat} = require('./src/utills');
const CommadHistory = require('./src/commandHistory');

require('dotenv').config();

const TelegramApi = require('node-telegram-bot-api');
const token = process.env.CHAT_BOT_TOKEN;
const mode = process.env.MODE ?? 'development';

const bot = new TelegramApi(token, {
    polling: true
});

const fs = require('fs');
const writeLog = require('./src/logger.js');
const http = require("http");

const cron = require('node-cron');
const moment = require("moment/moment");
const {where} = require("sequelize");
const url = require("url");
const {FORMAT} = require("sqlite3");
const axios = require("axios");



bot.setMyCommands([
    { command: CommandName.START, description: 'sdfgsdfg' },
    { command: CommandName.INFO, description: 'sdfgsfdg' },
    { command: CommandName.CHECK, description: 'check' },
    { command: CommandName.TRACK, description: 'track' },
    { command: CommandName.TRACK_LIST, description: 'track list' },
    { command: CommandName.DELETE_TRACK_ITEM, description: 'delete track' },
    // { command: '/buttons', description: 'check' },
]);

var options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: CommandName.INFO, callback_data: '1' }],
        [{ text: CommandName.CHECK, callback_data: '2' }],
        [{ text: CommandName.TRACK, callback_data: '3' }],
        [{ text: CommandName.TRACK_LIST, callback_data: '4' }],
        [{ text: CommandName.DELETE_TRACK_ITEM, callback_data: '5' }]
      ]
    })
  };



// сканировать все товары и вернуть те цена на которые изменилась
async function check()
{
    try {
        const categories = await Category.findAll();
        let changedPriceGoods = await getAllGoodsByCategory(categories[2]);
        return GoodChangesMsgFormat(changedPriceGoods);
    }
    catch(e) {
        return 'Ошибка. Попробуйте снова позже!' + e;
    }
}

const checkTrackedGoodPrice = async (bot) => {
    const users = await User.findAll({
        include: [{ model: TrackedGood, include: Good}]
    })
    for (let user of users) {
        const trackedGoods = user.tracked_goods;
        const changes = [];
        for (let trackedGood of trackedGoods) {
            const document = (await getJsDomByUrl(`${trackedGood.good.url}`, false)).window.document;
            const {good, newPrice} = await parseGood(document, GoodsPageType.SHOW, null, trackedGood.good.categoryId, trackedGood.good.url);
            await commitPriceChange(good, newPrice, changes, trackedGood.min_percent);
        }
        if(changes.length > 0) {
            const msg = GoodChangesMsgFormat(changes);
            bot.sendMessage(user.chatId, msg, {parse_mode: 'HTML'});
        }
    }
}

// сканировать все товары и вернуть те цена на которые изменилась

const initializing = async () => {
    await sequelize.authenticate();

    if(mode == 'development') {
        await sequelize.sync({ alter : { drop: false } });
        // await sequelize.sync({ force: true });
    } else {
        await sequelize.sync();
    }

    /*force: true*/
    // Good.destroy({
    //     where: {},
    //     truncate: true
    // })

    const categories = await saveCategoriesIfNotExist();
    // // console.log(categories.map(c => c.id).join(','));
    // for(let i = 4; i < categories.length; i++) {
    //     const changedPriceGoods = await getAllGoodsByCategory(categories[i]);
    // }


    // cron.schedule('* * * * *', async () => {
    //     console.log(123);
    //     await checkTrackedGoodPrice(bot);
    // });
    await checkTrackedGoodPrice(bot);
}

const start = async () =>
{
    writeLog('Service was started 123');

    await initializing();

    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;
        const user = msg.from;
        // const member = await bot.getChatMember(chatId, user.id);

        try {
            switch (text) {
                case CommandName.START: {
                    CommadHistory.deleteCommandHistoryIfExist(user);
                    await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/a93/3bb/a933bb07-c608-4603-8765-ee62fb481afc/1.webp');
                    const userExist = await User.findOne({ where: { id: user.id}});
                    if(!userExist) {
                        await User.create({ id: user.id, chatId, name: user.first_name });
                    } else {
                        return bot.sendMessage(chatId, `Вы можете посмотреть список комманд с помощью команды /info`);
                    }
                    return bot.sendMessage(chatId, `Добро пожаловать. И ты написал ${text}`);
                }
                case CommandName.INFO: {
                    CommadHistory.deleteCommandHistoryIfExist(user);
                    return bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name} ${msg.from.lasth_name}`);
                }
                case CommandName.CHECK: {
                    CommadHistory.deleteCommandHistoryIfExist(user);
                    const answer = await check();
                    writeLog(answer);
                    if(!Array.isArray(answer))
                        return bot.sendMessage(chatId, StatusMessages.NO_CHANGES);

                    answer.forEach((item) => {
                        bot.sendMessage(chatId, item, {parse_mode: 'HTML'});
                    });
                    return;
                }
                case CommandName.TRACK: {
                    CommadHistory.deleteCommandHistoryIfExist(user);
                    CommadHistory.addOrUpdateCommandHistory(user, CommandName.TRACK);
                    return bot.sendMessage(chatId, "Скинь мне ссылку на товар магазина Ябко");
                }
                case CommandName.TRACK_LIST:
                    const trackList = (await User.findOne({ where: {id: user.id}, include:
                        { model: TrackedGood, include: Good }
                    })).tracked_goods;
                    const answer = trackList.length > 0 ? trackList.map(
                        tl => `[${tl.good.id}]${tl.good.name} | Отслеживаете от ${tl.min_percent}%\n`
                    ).join('') : 'Список пуст. /track - комманда для добавления в этот список';
                    writeLog('show track list');
                    return bot.sendMessage(chatId, answer);

                case CommandName.DELETE_TRACK_ITEM:
                    CommadHistory.deleteCommandHistoryIfExist(user);
                    CommadHistory.addOrUpdateCommandHistory(user, CommandName.DELETE_TRACK_ITEM);
                    return bot.sendMessage(chatId, "Введите id товара для удаления");

                default: {
                    const existCommand = CommadHistory.history.find(c => c.user.id == user.id);
                    if(existCommand) {
                        switch (existCommand.command) {
                            case CommandName.TRACK: {
                                //TODO: validate link
                                if(existCommand.step == 0)  {
                                    CommadHistory.addOrUpdateCommandHistory(user, CommandName.TRACK, 1, {url: text });
                                    return bot.sendMessage(chatId, "От скольки процентов скидки отслеживать товар?");
                                }
                                if(existCommand.step == 1) {
                                    existCommand.state.percent = text;
                                    const {url, percent } = existCommand.state;

                                    const minPercent = parseInt(percent);
                                    if(Number.isNaN(minPercent))
                                        return bot.sendMessage(chatId, StatusMessages.UNCORRECT_DATA);
                                    if(minPercent < 0 || minPercent > 100)
                                        return bot.sendMessage(chatId, StatusMessages.UNCORRECT_DATA);

                                    const response = await axios.get('https://api.privatbank.ua/p24api/pubinfo?json&exchange&coursid=5');
                                    const currencyBuy = response.data[1].buy;

                                    let good = await Good.findOne({ where: { url } });
                                    if(!good) {
                                        const document = (await getJsDomByUrl(`${url}`, false)).window.document;
                                        //TODO: define category
                                        good = (await parseGood(document, GoodsPageType.SHOW, currencyBuy, null, url)).good;
                                    }

                                    const [track, created] = await TrackedGood.findOrCreate({
                                        where: {goodId: good.id, userId: user.id },
                                        defaults: { goodId: good.id, userId: user.id, min_percent: minPercent}
                                    });

                                    // обновить запись если такова уже существует в списке
                                    if(track.min_percent != minPercent) {
                                        await TrackedGood.update({ min_percent: minPercent }, {
                                            where:  {goodId: good.id, userId: user.id }}
                                        );
                                    }

                                    //TODO: check if user exist
                                    // await TrackedGood.create({ goodId: good.id, userId: user.id});

                                    CommadHistory.deleteCommandHistoryIfExist(user);

                                    return bot.sendMessage(chatId, "Ок. Буду следить.");
                                }
                                break;
                            }
                            case CommandName.DELETE_TRACK_ITEM:
                                const goodId = parseInt(text);
                                await TrackedGood.destroy({ where: { goodId, userId: user.id }})
                                return bot.sendMessage(chatId, StatusMessages.SUCCESS_DELETED);
                        }
                    }
                    return bot.sendMessage(chatId, StatusMessages.COMMAND_NOT_FOUND, options);
                }
            }
        } catch (e) {
            writeLog(`Error ${e}`);
            return bot.sendMessage(chatId, StatusMessages.ERROR);
        }
    })

    bot.on('callback_query', (query) =>{
        console.log(query.data);
        //настройки для редактирования сообщения
        const opts = {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
        };

        if (query.data === 'push') {
            const answer = push();
            console.log(answer)
            bot.answerCallbackQuery(query.id, {text: answer, show_alert: true});
        }
        if (query.data === 'pull'){
            const answer = pull();
            console.log(answer)
            bot.answerCallbackQuery(query.id, {text: answer, show_alert: true});
        }

        switch (query.data) {
            case '1':
                return bot.sendMessage(opts.chat_id, '1');
                break;
            case '2':
                return bot.sendMessage(opts.chat_id, '2');
                break;
        }

    });
    bot.on("polling_error", (msg) => console.log(msg));
}

start();


console.log("end");




