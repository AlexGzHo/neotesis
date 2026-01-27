const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserQuota = sequelize.define('UserQuota', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    chat_requests_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    chat_tokens_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    quota_reset_date: {
        type: DataTypes.DATE
    }
}, {
    timestamps: true,
    tableName: 'user_quotas'
});

module.exports = UserQuota;
