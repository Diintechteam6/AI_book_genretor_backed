const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        let uri = (process.env.MONGODB_URI || '').trim();

        // Auto-fix quotes, backticks or spaces if accidentally copied
        uri = uri.replace(/^["'`\s]+|["'`\s]+$/g, '');

        // Auto-fix if user pasted "MONGODB_URI=..." inside the Value box
        if (uri.startsWith('MONGODB_URI=')) {
            uri = uri.replace(/^MONGODB_URI=/, '').trim();
            uri = uri.replace(/^["'`\s]+|["'`\s]+$/g, '');
        }

        if (!uri) {
            console.error('MONGODB_URI is not defined in environment variables!');
            return;
        }

        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error connecting to MongoDB: ${error.message}`);
    }
};

module.exports = connectDB;
