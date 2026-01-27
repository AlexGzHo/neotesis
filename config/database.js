const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Configuration for DB connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://neotesis:local_password@localhost:5432/neotesis_db', {
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
    dialectOptions: isProduction ? {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    } : {}
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos PostgreSQL');

        // Sync models (simple approach for now, migrations recommended for later)
        await sequelize.sync({ alter: true });
        console.log('✅ Modelos sincronizados');
    } catch (error) {
        console.error('❌ Error conectando a la base de datos:', error);
    }
};

module.exports = { sequelize, connectDB };
