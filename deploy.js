const fs = require('fs');
const path = require('path');

// Load environment variables from .env file or process.env
require('dotenv').config();

// Read the template HTML file
const templatePath = path.join(__dirname, 'index.html');
const outputPath = path.join(__dirname, 'dist', 'index.html');

// Ensure dist directory exists
const distDir = path.dirname(outputPath);
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Read the template
let htmlContent = fs.readFileSync(templatePath, 'utf8');

// Replace placeholders with environment variables
htmlContent = htmlContent.replace(/\{\{SUPABASE_URL\}\}/g, process.env.SUPABASE_URL);
htmlContent = htmlContent.replace(/\{\{SUPABASE_ANON_KEY\}\}/g, process.env.SUPABASE_ANON_KEY);
htmlContent = htmlContent.replace(/\{\{WHATSAPP_NUMBER\}\}/g, process.env.WHATSAPP_NUMBER);

// Write the final file
fs.writeFileSync(outputPath, htmlContent);

console.log('✅ Deployment file created successfully!');
console.log(`📁 Output: ${outputPath}`);
console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`🔑 Supabase Key: ${process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`📱 WhatsApp: ${process.env.WHATSAPP_NUMBER ? '✅ Set' : '❌ Missing'}`);