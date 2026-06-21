const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const db = require('./firebaseConfig.js');

// বটস ও অটোমেশন
require('./userBot.js');
require('./adminBot.js');
require('./facebookAutomation.js');

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
