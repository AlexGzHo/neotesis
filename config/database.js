const { Sequelize } = require('sequelize');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// Configuration for DB connection
// Construct URL dynamically if not provided
const dbUrl = process.env.DATABASE_URL ||
    `postgres://${process.env.DB_USER || 'neotesis'}:${process.env.DB_PASSWORD || 'local_password'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'neotesis_db'}`;


const useSSL = process.env.DB_SSL === 'true' || (isProduction && process.env.DB_SSL !== 'false');

const sequelize = new Sequelize(dbUrl, {
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
    dialectOptions: useSSL ? {
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
