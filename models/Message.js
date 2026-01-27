const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    chat_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('user', 'assistant', 'system'),
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    }
}, {
    timestamps: true,
    tableName: 'messages'
});

module.exports = Message;
