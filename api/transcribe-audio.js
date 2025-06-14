const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: 'Server configuration error',
        message: 'OpenAI API key not configured'
      });
    }

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { audio, fileName } = req.body;

    // Validate required fields
    if (!audio || !fileName) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['audio', 'fileName']
      });
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    
    // Create a temporary file
    const tempDir = '/tmp';
    const tempFilePath = path.join(tempDir, fileName);
    
    // Write the buffer to a temporary file
    fs.writeFileSync(tempFilePath, audioBuffer);

    try {
      // Create a ReadStream from the file
      const audioFile = fs.createReadStream(tempFilePath);

      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'en', // You can make this configurable
        response_format: 'text',
      });

      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);

      return res.status(200).json({ 
        success: true,
        text: transcription
      });
    } catch (whisperError) {
      // Clean up the temporary file in case of error
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
      throw whisperError;
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message 
    });
  }
}; 