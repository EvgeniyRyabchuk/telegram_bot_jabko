
const sequelize = require("./database");
const {
    User,
    Category,
    Good, TrackedGood
} = require("./database/models");

const {saveCategoriesIfNotExist, getAllGoodsByCategory} = require("./src/checker");
const { StatusMessages } = require('./src/utills');
const CommadHistory = require('./src/commandHistory');

require('dotenv').config();

const test = async () => {
    await sequelize.sync();
    User.create({ name: '123'});
    const users = await User.findAll();
    console.log(users);
    console.log('db is ready');
}
const TelegramApi = require('node-telegram-bot-api');
const token = process.env.CHAT_BOT_TOKEN;
const mode = process.env.MODE ?? 'development';

const bot = new TelegramApi(token, {
    polling: true
});
const max_msg_c_at_time = 24;
const fs = require('fs');
const writeLog = require('./src/logger.js');
const http = require("http");

const cron = require('node-cron');
const moment = require("moment/moment");
const {where} = require("sequelize");



bot.setMyCommands([
    { command: '/start', description: 'sdfgsdfg' },
    { command: '/info', description: 'sdfgsfdg' },
    { command: '/check', description: 'check' },
    { command: '/track', description: 'track' },
    // { command: '/buttons', description: 'check' },
]);

var options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: '/info', callback_data: '1' }],
        [{ text: '/check', callback_data: '2' }]
        [{ text: '/track', callback_data: '3' }]
      ]
    })
  };

// сканировать все товары и вернуть те цена на которые изменилась
async function check()
{
    try {
        const categories = await Category.findAll();
        let changedPriceGoods = await getAllGoodsByCategory(categories[2]);

        if(changedPriceGoods.length === 0)
            return "Цены остались на месте";

        changedPriceGoods = changedPriceGoods.length > max_msg_c_at_time
            ? changedPriceGoods.slice(0, max_msg_c_at_time) : changedPriceGoods;

        return changedPriceGoods.map(changedGood => {
            return `<a href="${changedGood.good.url}">${changedGood.good.name}</a>
Before <s>${changedGood.oldPriceUah}</s> -
After <b>${changedGood.newPriceUah}</b>.`});
    }
    catch(e) {
        return 'Ошибка. Попробуйте снова позже!' + e;
    }
}


// сканировать все товары и вернуть те цена на которые изменилась
async function track()
{
    try {


    }
    catch(e) {
        return 'Ошибка. Попробуйте снова позже!' + e;
    }
}

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

    // cron.schedule('* * * * * *', () => {
    //     console.log('running a task every minute');
    // });
}


//TODO: command as enums

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
            // writeLog(`Send commmand ${text} from ${msg.chat.id} user ${user.id}`);

            if (text == '/start') {
                CommadHistory.deleteCommandHistoryIfExist(user);
                await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/a93/3bb/a933bb07-c608-4603-8765-ee62fb481afc/1.webp');
                const userExist = await User.findOne({ where: { id: user.id}});
                if(!userExist) {
                    User.create({ id: user.id, chatId, name: user.first_name });
                } else {
                    return bot.sendMessage(chatId, `Вы можете посмотреть список комманд с помощью команды /info`);
                }
                return bot.sendMessage(chatId, `Добро пожаловать. И ты написал ${text}`);
            }
            else if (text == '/info') {
                CommadHistory.deleteCommandHistoryIfExist(user);
                return bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name} ${msg.from.lasth_name}`);
            }
            else if(text == '/check') {
                CommadHistory.deleteCommandHistoryIfExist(user);
                const answer = await check();
                writeLog(answer);
                if(!Array.isArray(answer))
                    return bot.sendMessage(chatId, StatusMessages.NO_CHANGES);

                answer.forEach((item) => {
                    bot.sendMessage(chatId, item, {parse_mode: 'HTML'});
                });

                return;
            } else if(text == '/track') {
                CommadHistory.deleteCommandHistoryIfExist(user);
                const answer = await track();
                writeLog(answer);
                CommadHistory.addOrUpdateCommandHistory(user, '/track');

                return bot.sendMessage(chatId, "Скинь мне ссылку на товар магазина Ябко");

            } else {

                // dialog
                const existCommand = CommadHistory.history.find(c => c.user.id == user.id);
                if(existCommand) {
                    switch (existCommand.command) {
                        case '/track':
                            //TODO: validate link
                            if(existCommand.step == 0)  {
                                CommadHistory.addOrUpdateCommandHistory(user, '/track', 1, {link: text });
                                return bot.sendMessage(chatId, "От скольки процентов отслеживать");
                            }
                            if(existCommand.step == 1) {
                                existCommand.state.percent = text;

                                //TODO: find product by name
                                // TrackedGood.create({ })

                                CommadHistory.deleteCommandHistoryIfExist(user);
                                return bot.sendMessage(chatId, "Ок. Буду следить.");
                            }
                            break;
                    }
                }

                let answer = 'command not found';
                //установка кнопок
                return bot.sendMessage(chatId, answer, options);
               // return bot.sendMessage(chatId, answer);
            }
        } catch (e) {
            writeLog(`Error ${e}`);
        }


        // return bot.sendMessage(chatId, 'Я тебя не понимаю');

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




