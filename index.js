const sequelize = require("./database");
const {
    User,
    Category,
    Good, TrackedGood, History
} = require("./database/models");

const {saveCategoriesIfNotExist, getAllGoodsByCategory, parseGood, getJsDomByUrl, commitPriceChange,
    checkTrackedGoodPrice
} = require("./src/checker");
const {
    StatusMessages,
    CommandName,
    GoodsPageType,
    goodChangesMsgFormat,
    getOptionsFromCategories,
    BotCommand, stickerList, getDefAnswer, getExtraQuestion, getInfoMsg, AdminCommandName
} = require('./src/utills');
const CommandHistory = require('./src/commandHistory');

require('dotenv').config();

const TelegramApi = require('node-telegram-bot-api');
const token = process.env.CHAT_BOT_TOKEN;
const baseTargetUrl = process.env.BASE_TARGET_URL;

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
const {getGoodHistoryStatistic} = require("./src/chart");


bot.setMyCommands([...BotCommand.map(c => ({ command: c.name, description: c.description }))]);

const admin_user_id = 473591842;

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
    // });

    // await checkTrackedGoodPrice(bot);
}




async function a(url) {
    try {
        const response = await fetch(`${url}`, {
            cache: 'no-cache',
            headers: {
                'Content-Type': "text/html",
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Cookie': 'currency=UAH; sc=D80AFC0B-6285-4664-7244-DC91A3D22691; _gcl_au=1.1.784045452.1685257063; _ms=954ebda9-c107-4e9d-b0bd-3053a907a8d1; _hjSessionUser_2828866=eyJpZCI6ImFlMjg3ZDY0LWI1ZDItNTExYS1hNzdhLTJlMzYxY2YwYTdjYSIsImNyZWF0ZWQiOjE2ODUyNTcwNjMzMjYsImV4aXN0aW5nIjp0cnVlfQ==; rcusi=1; user_store_id=8; store_id=8; PHPSESSID=2ncg5v9dpn7fb88lf9uhj5mpv3; _gid=GA1.2.636623163.1686400205; ln_or=eyIzNTMwMzQwIjoiZCJ9; language=rus; _hjSession_2828866=eyJpZCI6Ijg3NDU0ZTM4LWFjOWMtNDA5OS04M2I1LWVkOWFmMTQ4MTc0NyIsImNyZWF0ZWQiOjE2ODY0NzA4MjQ3OTcsImluU2FtcGxlIjpmYWxzZX0=; _hjAbsoluteSessionInProgress=0; _ga_6XL3GWYTYK=GS1.1.1686470824.28.1.1686471633.0.0.0; _ga=GA1.2.1180345601.1685257063; biatv-cookie={%22firstVisitAt%22:1685257062%2C%22visitsCount%22:9%2C%22campaignCount%22:1%2C%22currentVisitStartedAt%22:1686470830%2C%22currentVisitLandingPage%22:%22https://jabko.ua/zaporizhzhia/rus/iphone/%22%2C%22currentVisitOpenPages%22:8%2C%22location%22:%22https://jabko.ua/rus/iphone/apple-iphone-13/apple-iphone-13-128gb-midnight%22%2C%22locationTitle%22:%22%D0%9A%D1%83%D0%BF%D0%B8%D1%82%D1%8C%20Apple%20iPhone%2013%20128GB%20(Midnight)%20%E2%80%94%20%D1%86%D0%B5%D0%BD%D1%8B%20%E2%9A%A1%2C%20%D0%BE%D1%82%D0%B7%D1%8B%D0%B2%D1%8B%20%E2%9A%A1%2C%20%D1%85%D0%B0%D1%80%D0%B0%D0%BA%D1%82%D0%B5%D1%80%D0%B8%D1%81%D1%82%D0%B8%D0%BA%D0%B8%20%E2%80%94%20%D0%AF%D0%91%D0%9A%D0%9E%22%2C%22userAgent%22:%22Mozilla/5.0%20(Windows%20NT%2010.0%3B%20Win64%3B%20x64)%20AppleWebKit/537.36%20(KHTML%2C%20like%20Gecko)%20Chrome/114.0.0.0%20Safari/537.36%22%2C%22language%22:%22ru%22%2C%22encoding%22:%22utf-8%22%2C%22screenResolution%22:%222195x1235%22%2C%22currentVisitUpdatedAt%22:1686471640%2C%22utmDataCurrent%22:{%22utm_source%22:%22google%22%2C%22utm_medium%22:%22organic%22%2C%22utm_campaign%22:%22(not%20set)%22%2C%22utm_content%22:%22(not%20set)%22%2C%22utm_term%22:%22(not%20provided)%22%2C%22beginning_at%22:1685257062}%2C%22campaignTime%22:1685257062%2C%22utmDataFirst%22:{%22utm_source%22:%22google%22%2C%22utm_medium%22:%22organic%22%2C%22utm_campaign%22:%22(not%20set)%22%2C%22utm_content%22:%22(not%20set)%22%2C%22utm_term%22:%22(not%20provided)%22%2C%22beginning_at%22:1685257062}%2C%22geoipData%22:{%22country%22:%22Ukraine%22%2C%22region%22:%22Zaporizhzhya%20Oblast%22%2C%22city%22:%22Zaporizhzhia%22%2C%22org%22:%22%22}}; bingc-activity-data={%22numberOfImpressions%22:0%2C%22activeFormSinceLastDisplayed%22:0%2C%22pageviews%22:3%2C%22callWasMade%22:0%2C%22updatedAt%22:1686472765}'
                // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            credentials: "include",

        })
        console.log(123);
    } catch(ex) {
        console.error(ex);
    }
}


const start = async () =>
{
    writeLog('Service was started');



    await initializing();

    // a('https://jabko.ua/rus/apple-watch/apple-watch-series-8/apple-watch-series-8-45mm-midnight-aluminum-case-with-midnight-sport-band');

    // return;

    // every day scan
    const priceCheckerTask = cron.schedule('0 0 * * *', async () => {
        console.log('cron job is begin');
        await checkTrackedGoodPrice(bot);
        console.log('cron job end');
    });

    const jobs = [priceCheckerTask];

    const categories = await saveCategoriesIfNotExist();
    const categoryOptions = getOptionsFromCategories(categories);

    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;
        const user = msg.from;
        // const member = await bot.getChatMember(chatId, user.id);
        const dbUser = await User.findOne({ where: { id: user.id}});

        // user must be registered in system
        if(!dbUser && text != CommandName.START) return bot.sendMessage(chatId, '/start - to register');

        try {
            switch (text) {
                case CommandName.START: {
                    CommandHistory.deleteCommandHistoryIfExist(user);
                    await bot.sendSticker(chatId, stickerList.find(s => s.name == 'Hello').url);

                    if(!dbUser) {
                        await User.create({ id: user.id, chatId, name: user.first_name });
                        return bot.sendMessage(chatId, getDefAnswer(text));
                    } else {
                        return bot.sendMessage(chatId, StatusMessages.INFO_TIP);
                    }
                }
                case CommandName.INFO: {
                    CommandHistory.deleteCommandHistoryIfExist(user);
                    return bot.sendMessage(chatId, getInfoMsg(), { parse_mode: 'HTML' });
                }
                case CommandName.TRACK: {
                    CommandHistory.deleteCommandHistoryIfExist(user);
                    CommandHistory.addOrUpdateCommandHistory(user, CommandName.TRACK);
                    const def_answer = BotCommand.find(bc => bc.name === text).default_answer;
                    return bot.sendMessage(chatId, def_answer);
                }
                case CommandName.TRACK_LIST:
                    const trackList = (await User.findOne({ where: {id: user.id}, include:
                        { model: TrackedGood, include: Good }
                    })).tracked_goods;
                    const answer = trackList.length > 0 ? trackList.map(
                        tl => `[${tl.good.id}]${tl.good.name} | Отслеживаете от ${tl.min_percent}%\n`
                    ).join('') : StatusMessages.TRACK_TIP;
                    writeLog('show track list');
                    return bot.sendMessage(chatId, answer);
                case CommandName.DELETE_TRACK_ITEM:
                    CommandHistory.deleteCommandHistoryIfExist(user);
                    CommandHistory.addOrUpdateCommandHistory(user, CommandName.DELETE_TRACK_ITEM);
                    return bot.sendMessage(chatId, getDefAnswer(text));
                case CommandName.CATEGORY_LIST: {
                    return bot.sendMessage(chatId, getDefAnswer(text), categoryOptions);
                }
                case CommandName.SCAN_BY_CATEGORY: {
                    return bot.sendMessage(chatId, getDefAnswer(text), categoryOptions);
                }

                case CommandName.STATISTIC: {
                    CommandHistory.deleteCommandHistoryIfExist(user);
                    CommandHistory.addOrUpdateCommandHistory(user, CommandName.GET_STATISTIC_PHOTO);
                    return bot.sendMessage(chatId, getDefAnswer(text));
                }


                case AdminCommandName.STOP_ALL_CORN_JOBS: {
                    if (user.id !== admin_user_id)
                        return bot.sendMessage(chatId, StatusMessages.NOT_ALLOW_FOR_YOUR_ROLE)
                    jobs.forEach(job => job.stop());
                    return bot.sendMessage(chatId, 'corn jobs stopped successfully');
                }
                case AdminCommandName.START_ALL_CORN_JOBS: {
                    if (user.id !== admin_user_id)
                        return bot.sendMessage(chatId, StatusMessages.NOT_ALLOW_FOR_YOUR_ROLE)
                    jobs.forEach(job => job.start());
                    return bot.sendMessage(chatId, 'corn jobs started successfully');
                }
                case AdminCommandName.SHOW_LOGS: {
                    if (user.id !== admin_user_id)
                        return bot.sendMessage(chatId, StatusMessages.NOT_ALLOW_FOR_YOUR_ROLE);
                    return bot.sendDocument(chatId, './log.txt', { caption: "logs"});
                }

                default: {
                    const existCommand = CommandHistory.history.find(c => c.user.id == user.id);
                    if(existCommand) {
                        switch (existCommand.command) {
                            case CommandName.TRACK: {
                                if(existCommand.step == 0)  {
                                    if(!text.includes(baseTargetUrl))
                                        return bot.sendMessage(chatId, StatusMessages.NOT_CORRECT_DATA);

                                    CommandHistory.addOrUpdateCommandHistory(user, CommandName.TRACK, 1, {url: text });
                                    return bot.sendMessage(chatId, getExtraQuestion(CommandName.TRACK, 0));
                                }
                                if(existCommand.step == 1) {
                                    existCommand.state.percent = text;
                                    const {url, percent } = existCommand.state;

                                    const minPercent = parseInt(percent);
                                    if(Number.isNaN(minPercent))
                                        return bot.sendMessage(chatId, StatusMessages.NOT_CORRECT_DATA);
                                    if(minPercent < 0 || minPercent > 100)
                                        return bot.sendMessage(chatId, StatusMessages.NOT_CORRECT_DATA);

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

                                    // обновить запись если такова уже существует в списке (в случае повторного добавления в список пользователем)
                                    if(track.min_percent != minPercent) {
                                        await TrackedGood.update({ min_percent: minPercent }, {
                                            where:  {goodId: good.id, userId: user.id }}
                                        );
                                    }

                                    CommandHistory.deleteCommandHistoryIfExist(user);
                                    return bot.sendMessage(chatId, StatusMessages.SUCCESS_ADD_TO_TRACK_LIST);
                                }
                                break;
                            }
                            case CommandName.DELETE_TRACK_ITEM: {
                                const goodId = parseInt(text);
                                await TrackedGood.destroy({where: {goodId, userId: user.id}})
                                return bot.sendMessage(chatId, StatusMessages.SUCCESS_DELETED);
                            }
                            case CommandName.GET_STATISTIC_PHOTO: {
                                const trackedGood = await TrackedGood.findOne({
                                    where: { userId: user.id, goodId: text },
                                    include: [Good]
                                });
                                if(!trackedGood) return bot.sendMessage(chatId, StatusMessages.NOT_FOUND);
                                const histories = await History.findAll({
                                    where: { goodId: trackedGood.goodId },
                                    order: [ ['createdAt', 'ASC'] ],
                                });
                                if(histories.length === 0) return bot.sendMessage(chatId, StatusMessages.EMPTY_LIST);

                                const graphicPhoto = getGoodHistoryStatistic(histories, trackedGood.good).toURL();
                                return bot.sendPhoto(chatId, graphicPhoto);
                            }
                        }
                    }
                    return bot.sendMessage(chatId, StatusMessages.COMMAND_NOT_FOUND);
                }
            }
        } catch (e) {
            writeLog(`Error ${e}`);
            return bot.sendMessage(chatId, StatusMessages.ERROR);
        }
    })

    bot.on('callback_query', async (query) =>{
        //настройки для редактирования сообщения
        const opts = {
            chat_id: query.message.chat.id,
            message_id: query.message.message_id,
        };

        const [command, payload] = query.data.split('#');

        switch (command) {
            case CommandName.SCAN_BY_CATEGORY: {
                const category = await Category.findOne({ where: { id: payload }});
                if(!category) return bot.sendMessage(StatusMessages.NOT_CORRECT_DATA);

                const changedPriceGoods = await getAllGoodsByCategory(category);
                const answer = goodChangesMsgFormat(changedPriceGoods);

                if(!Array.isArray(answer) || answer.length === 0)
                    return bot.sendMessage(opts.chat_id, StatusMessages.NO_CHANGES);

                answer.forEach((item) => {
                    // bot.answerCallbackQuery(query.id, {text: item.substring(0, 199), show_alert: true});
                    bot.sendMessage(opts.chat_id, item, {parse_mode: 'HTML'});
                });
                break;
            }
        }
    });
    bot.on("polling_error", (msg) => console.log(msg));
}

start();


console.log("end");




