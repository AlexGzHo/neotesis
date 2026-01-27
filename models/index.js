const User = require('./User');
const Chat = require('./Chat');
const Message = require('./Message');

// Define associations
User.hasMany(Chat, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Chat.belongsTo(User, { foreignKey: 'user_id' });

Chat.hasMany(Message, { foreignKey: 'chat_id', onDelete: 'CASCADE' });
Message.belongsTo(Chat, { foreignKey: 'chat_id' });

module.exports = {
    User,
    Chat,
    Message
};
