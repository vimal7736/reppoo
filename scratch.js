const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testEndpoint(url) {
  try {
    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n193\n%%EOF', 'utf-8');
    const form = new FormData();
    form.append('document', pdfBuffer, { filename: 'test.pdf' });
    const res = await axios.post(url, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Token md_WoUrWaaM4uSEUGrKXgATJ-FaGtz6dlK6GK4iygOAX8I` // from .env.local
      },
      validateStatus: () => true
    });
    console.log(`${url}: ${res.status}`);
  } catch (err) {
    console.log(`${url}: ${err.message}`);
  }
}

async function main() {
  await testEndpoint('https://api.mindee.net/v1/products/mindee/invoices/v4/predict');
}
main();
