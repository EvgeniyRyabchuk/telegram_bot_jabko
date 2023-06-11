# telegram_bot_jabko

### Описание

Бот предназначен для парсинга сайта с целью анализа цен по сравнению с предыдущим запросом на сканирование. Или автоматическим запросом через интервал времени. 

### Требования 

- Парсинг продуктов по конкретным категориям 
- Запись всех продуктов по всем категориям в бд 


//TODO: make migration file
//TODO: auto commit to github for always free hosting
//TODO: pause for avoid spawn block 
//TODO: callback_query read 
//TODO: add price changes diagram 

Heroku 

heroku login
heroku create -a jabkobot
heroku git:remote -a jabkobot
git push heroku master

heroku ps
heroku ps:scale bot=1
heroku ps:scale web=0
heroku ps:scale worker=1

heroku run bash -a jabkobot



https://crontab.guru/every-day