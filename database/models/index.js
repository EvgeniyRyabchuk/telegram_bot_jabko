const Good = require('./Good');
const Category = require('./Category');
const User = require('./User');
const History = require('./History');
const TrackedGood = require('./TrackedGood');
const Command = require('./Command');

// {as: 'categories', foreignKey: 'categoryId'}

Good.belongsTo(Category);
Category.hasMany(Good);


History.belongsTo(Good)

TrackedGood.belongsTo(User);
TrackedGood.belongsTo(Good);

Command.belongsTo(User);

module.exports = {
    Good,
    Category,
    User,
    History,
    TrackedGood
}