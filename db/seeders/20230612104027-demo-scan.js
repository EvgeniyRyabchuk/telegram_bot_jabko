'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return queryInterface.bulkInsert('scans', [{
      firstName: 'John',
      lastName: 'Doe',
      email: 'example@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
      categoryId: 1
    }]);
  },

  async down (queryInterface, Sequelize) {
    return queryInterface.bulkDelete('scans', null, {});
  }
};
