const Good = require('./Good');
const Category = require('./Category');
const User = require('./User');

// {as: 'categories', foreignKey: 'categoryId'}

Good.belongsTo(Category);
Category.hasMany(Good);


module.exports = {
    Good,
    Category,
    User
}