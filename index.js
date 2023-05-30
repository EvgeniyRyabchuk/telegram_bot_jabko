
const sequelize = require("./database");
const {
    User,
    Category,
    Good
} = require("./database/models");

const {
    saveCategoriesIfNotExist,
    getAllGoodsByCategory
} = require("./src/checker");

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
const bot = new TelegramApi(token, {
    polling: true
});

const fs = require('fs');
const writeLog = require('./src/logger.js');
const http = require("http");

const cron = require('node-cron');



bot.setMyCommands([
    { command: '/start', description: 'sdfgsdfg' }, 
    { command: '/info', description: 'sdfgsfdg' },
    { command: '/check', description: 'check' },
    // { command: '/buttons', description: 'check' },
]);

var options = {
    reply_markup: JSON.stringify({
      inline_keyboard: [
        [{ text: '/info', callback_data: '1' }],
        [{ text: '/check', callback_data: '2' }]
      ]
    })
  };

async function check()
{
    try {
        const categories = await Category.findAll();
        const changedPriceGoods = await getAllGoodsByCategory(categories[2]);
        if(changedPriceGoods.length === 0)
            return "Цены остались на месте";
        return changedPriceGoods.map(changedGood => {
            return `<a href="${changedGood.good.url}"> ${changedGood.good.name}</a>
Before <s>${changedGood.oldPriceUah}</s> -
After <b>${changedGood.newPriceUah}</b>.`}).join('\n-------------------------\n');
    }
    catch(e) {
        return 'Ошибка. Попробуйте снова позже!' + e;
    }
}

const initializing = async () => {
    await sequelize.authenticate();
    await sequelize.sync({ alter : { drop: false } });
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

    cron.schedule('* * * * * *', () => {
        console.log('running a task every minute');
    });
}

const start = async () =>
{
    writeLog('Service was started 123');

    await initializing();


    bot.on('message', async msg => {
        const text = msg.text;
        const chatId = msg.chat.id;
        const user = await bot.getMe();

        try {
            writeLog(`Send commmand ${text} from ${msg.chat.id} user ${user.id}`);

            if (text == '/start') {
                await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/a93/3bb/a933bb07-c608-4603-8765-ee62fb481afc/1.webp');
                return bot.sendMessage(chatId, `Добро пожаловать. И ты написал ${text}`);
            }
            else if (text == '/info')
                return bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name} ${msg.from.lasth_name}`);
            else if(text == '/check') {
                const answer = await check();
                writeLog(answer);
                return bot.sendMessage(chatId, answer, {parse_mode: 'HTML'});
            } else {
                let answer = 'command not found';
                //установка кнопок
                return bot.sendMessage(chatId, answer, options);
               // return bot.sendMessage(chatId, answer);
            }
        } catch (e) {
            writeLog(`Error ${e}`);
        }


        return bot.sendMessage(chatId, 'Я тебя не понимаю');

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




