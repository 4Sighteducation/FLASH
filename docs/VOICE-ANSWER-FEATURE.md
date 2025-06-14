# Voice Answer Feature Documentation

## Overview
The Voice Answer feature allows students to speak their answers to flashcards instead of just reading them. This feature uses OpenAI's Whisper API for speech-to-text transcription and GPT-4 for intelligent answer analysis.

## Features
- 🎤 Voice recording with visual feedback
- 🔊 Real-time audio level visualization
- ⏱️ 60-second maximum recording duration
- 📝 Automatic transcription using OpenAI Whisper
- 🤖 AI-powered answer analysis with GPT-4
- 📊 Confidence scoring (0-100%)
- ✅ Key points coverage analysis
- 💡 Constructive feedback and suggestions

## Supported Card Types
The voice answer feature is available for:
- Short Answer cards
- Essay cards
- Acronym cards

## User Flow
1. User sees a supported card type
2. Taps the "Voice Answer" button
3. Recording modal appears with visual feedback
4. User speaks their answer (max 60 seconds)
5. Stops recording (or auto-stops at time limit)
6. System transcribes the audio using Whisper
7. AI analyzes the answer against the correct answer
8. User sees transcription and AI feedback
9. User can accept or reject the AI assessment
10. Card flips to show the correct answer

## Technical Architecture

### Frontend Components

#### VoiceRecorder Component
- Handles audio recording using expo-av
- Shows recording animation and audio level meter
- Manages recording duration and auto-stop
- Location: `src/components/VoiceRecorder.tsx`

#### VoiceAnswerModal Component
- Orchestrates the entire voice answer flow
- Manages state transitions (recording → transcribing → analyzing → results)
- Displays transcription and AI feedback
- Location: `src/components/VoiceAnswerModal.tsx`

#### FlashcardCard Updates
- Added voice answer button for eligible card types
- Integrated VoiceAnswerModal
- Location: `src/components/FlashcardCard.tsx`

### Services

#### WhisperService
- Handles audio file upload to backend
- Manages transcription requests
- Location: `src/services/whisperService.ts`

#### AIAnalyzerService
- Compares spoken answers with correct answers
- Provides intelligent feedback and scoring
- Includes fallback for offline analysis
- Location: `src/services/aiAnalyzerService.ts`

#### AudioService
- Manages audio permissions
- Handles recording configuration
- Provides audio utilities
- Location: `src/services/audioService.ts`

### Backend API Endpoints

#### /api/transcribe-audio
- Accepts base64 encoded audio
- Uses OpenAI Whisper API for transcription
- Returns transcribed text
- Location: `api/transcribe-audio.js`

#### /api/analyze-answer
- Compares spoken answer with correct answer
- Uses GPT-4 for intelligent analysis
- Returns structured feedback with confidence score
- Location: `api/analyze-answer.js`

## Configuration

### Environment Variables
The backend requires:
```
OPENAI_API_KEY=your-openai-api-key
```

### Audio Recording Settings
- Format: M4A (iOS/Android compatible)
- Sample Rate: 44.1 kHz
- Channels: Mono
- Bit Rate: 128 kbps

## Error Handling
- Microphone permission denied
- Network failures during upload
- API errors (rate limits, etc.)
- Recording failures
- Timeout handling

## Performance Considerations
- Audio files are compressed before upload
- Temporary recordings are cleaned up after use
- Maximum file size: 25MB (Whisper API limit)
- Optimistic UI updates for better UX

## Future Enhancements
- Multi-language support
- Offline recording with batch upload
- Voice-to-voice feedback
- Custom pronunciation analysis
- Integration with spaced repetition algorithm

## Testing the Feature
1. Ensure microphone permissions are granted
2. Create or find a Short Answer, Essay, or Acronym card
3. Tap the "Voice Answer" button
4. Speak your answer clearly
5. Review the transcription and AI feedback
6. Confirm if the assessment is accurate

## Troubleshooting

### Common Issues
1. **No audio recorded**: Check microphone permissions
2. **Transcription fails**: Verify internet connection and API key
3. **Poor transcription quality**: Speak clearly in a quiet environment
4. **Analysis seems wrong**: The AI considers conceptual accuracy, not exact wording

### Debug Mode
Enable console logging to see:
- Recording status updates
- API request/response details
- Audio file information
- Error details 