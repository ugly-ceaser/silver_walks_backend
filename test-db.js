const { Client } = require('pg');

const testConnection = async () => {
    const client = new Client({
        connectionString: 'postgresql://silverwalks_db_user:sCYJlwJdd4mpBnZWqCk0hP4CwFuyf69G@dpg-d5om7t94tr6s738hnekg-a.oregon-postgres.render.com/silverwalks_db?sslmode=require',
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected successfully!');
        const res = await client.query('SELECT NOW()');
        console.log('Time:', res.rows[0].now);
    } catch (err) {
        console.error('Connection error:', err);
    } finally {
        await client.end();
    }
};

testConnection();
