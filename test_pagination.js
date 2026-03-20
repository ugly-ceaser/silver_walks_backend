const axios = require('axios');

const baseUrl = 'http://localhost:5000/api/v1';

async function testPagination() {
    console.log('--- Testing Pagination on /nurses ---');

    try {
        // 0. Login
        console.log('0. Logging in...');
        const loginRes = await axios.post(`${baseUrl}/auth/login-nurse`, {
            identifier: '+2348030000000',
            password: 'password123'
        });
        const token = loginRes.data.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        console.log('Login successful.');

        // 1. Default pagination (should be 10 per page)
        console.log('\n1. Testing Default Pagination...');
        const res1 = await axios.get(`${baseUrl}/nurses`, config);
        console.log('Status:', res1.status);
        console.log('Meta:', JSON.stringify(res1.data.meta, null, 2));
        console.log('Data Length:', res1.data.data.length);

        // 2. Custom page and limit
        console.log('\n2. Testing Page 1, Limit 1...');
        const res2 = await axios.get(`${baseUrl}/nurses?page=1&limit=1`, config);
        console.log('Status:', res2.status);
        console.log('Meta:', JSON.stringify(res2.data.meta, null, 2));
        console.log('Data Length:', res2.data.data.length);

        // 3. Last page check
        if (res1.data.meta.pagination.totalPages > 0) {
            const lastPage = res1.data.meta.pagination.totalPages;
            console.log(`\n3. Testing Last Page (${lastPage})...`);
            const res3 = await axios.get(`${baseUrl}/nurses?page=${lastPage}&limit=10`, config);
            console.log('Status:', res3.status);
            console.log('Meta:', JSON.stringify(res3.data.meta, null, 2));
            console.log('isLastPage:', res3.data.meta.pagination.isLastPage);
        }

    } catch (error) {
        console.error('Test failed:');
        if (error.response) {
            console.error(error.response.status, JSON.stringify(error.response.data, null, 2));
        } else {
            console.error(error.message);
        }
    }
}

testPagination();
