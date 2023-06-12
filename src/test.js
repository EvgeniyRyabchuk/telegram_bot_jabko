const { Category, Scan, sequelize}  = require('../db/models');
const a = require('../db/models');

console.log(Scan)



async function start() {
    await sequelize.authenticate();
    await sequelize.sync();
    // await Category.create({ name: 'sdfhgsfdh', url: 'sdfghsfdh'});
    await Scan.create({ firstName: '123', lastName: '123', email: '123', categoryId: 1})

}


start();