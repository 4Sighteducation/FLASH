export async function captureFeedbackScreenshot(): Promise<string> {
  // Web builds don't support react-native-view-shot in the same way as native.
  // Return an empty string so callers can gracefully skip screenshot upload.
  return '';
}


