const { Sequelize } = require('sequelize');
require('dotenv').config();

(async () => {
    const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false });
    try {
        const [results] = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(results.map(r => r.table_name));
    } catch (error) {
        console.error(error.message);
    } finally {
        await sequelize.close();
    }
})();
