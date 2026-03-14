import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.DATABASE_URL;

if (!url) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

console.log('Testing connection to:', url.split('@')[1]); // Log only the host part for safety

const sequelize = new Sequelize(url, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        },
    },
});

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    } finally {
        await sequelize.close();
    }
}

test();
