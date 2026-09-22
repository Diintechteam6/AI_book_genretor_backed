const axios = require('axios');
const BookRecord = require('../models/BookRecord');

const generateBook = async (req, res) => {
    try {
        const { topic, bookType, audience } = req.body;

        if (!topic || !bookType) {
            return res.status(400).json({ success: false, message: 'Topic and bookType are required' });
        }

        const prompt = `You are an expert ${bookType} author writing for a ${audience || 'general'} audience. 
Write a comprehensive but concise mini-book about: "${topic}".
Structure the output using Markdown. Include:
1. A catchy Title
2. A brief Introduction
3. 3-4 structured Chapters with headings
4. A brief Conclusion

Do not include any extra chatty text before or after the markdown content.`;

        // Using OpenAI API
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: `You are an expert ${bookType} author.` },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 3000
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const generatedContent = response.data.choices[0].message.content;

        // Save to Database
        const record = await BookRecord.create({
            topic,
            bookType,
            targetAudience: audience || 'General',
            generatedContent
        });

        res.status(200).json({
            success: true,
            data: {
                id: record._id,
                content: generatedContent
            }
        });

    } catch (error) {
        console.error('Error generating book:', error?.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate book', 
            error: error?.response?.data?.error?.message || error.message 
        });
    }
};

module.exports = { generateBook };
