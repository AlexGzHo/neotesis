/**
 * Migration: Add pdf_content column to chats table
 * Description: This migration adds a TEXT field to store PDF content associated with each chat
 * Date: 2025-01-27
 */

const { sequelize } = require('../config/database');

async function migrate() {
    try {
        console.log('========================================');
        console.log('Migration: Add pdf_content to chats');
        console.log('========================================');

        // Check if column already exists
        const [results] = await sequelize.query(`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = 'public'
            AND TABLE_NAME = 'chats'
            AND COLUMN_NAME = 'pdf_content'
        `);

        if (results.length > 0) {
            console.log('✓ Column pdf_content already exists in chats table');
            console.log('Migration completed successfully!');
            process.exit(0);
        }

        console.log('Adding pdf_content column to chats table...');

        // Add the column
        await sequelize.query(`
            ALTER TABLE chats
            ADD COLUMN pdf_content TEXT
        `);

        console.log('✓ Column pdf_content added successfully');
        console.log('========================================');
        console.log('Migration completed successfully!');
        console.log('========================================');
        process.exit(0);
    } catch (error) {
        console.error('========================================');
        console.error('Migration failed!');
        console.error('========================================');
        console.error('Error:', error.message);
        if (error.sql) {
            console.error('SQL:', error.sql);
        }
        console.error('========================================');
        process.exit(1);
    }
}

// Run migration
migrate();
