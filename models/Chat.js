const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Chat = sequelize.define('Chat', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    title: {
        type: DataTypes.STRING,
        defaultValue: 'Nuevo Chat'
    },
    pdf_content: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    }
}, {
    timestamps: true,
    tableName: 'chats'
});

module.exports = Chat;
