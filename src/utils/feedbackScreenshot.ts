import { captureScreen } from 'react-native-view-shot';
import * as ImageManipulator from 'expo-image-manipulator';

export async function captureFeedbackScreenshot(): Promise<string> {
  // Capture the current UI buffer as a temp file.
  const uri = await captureScreen({
    format: 'jpg',
    quality: 0.9,
    result: 'tmpfile',
  });

  // Compress to keep uploads/emails snappy.
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
  );

  return manipulated.uri;
}


