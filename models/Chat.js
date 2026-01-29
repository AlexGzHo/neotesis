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
    },
    pdf_pages: {
        type: DataTypes.TEXT, // Storing as JSON string
        allowNull: true,
        defaultValue: null
    },
    total_pages: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
    }
}, {
    timestamps: true,
    tableName: 'chats'
});

module.exports = Chat;
