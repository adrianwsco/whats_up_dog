// ============================================================
// What's Up Dog? Daily Reporter — OpenAI Whisper Proxy
// Netlify Serverless Function
//
// Receives an audio file as base64 JSON from the browser,
// reconstructs it as multipart/form-data, and forwards it
// to OpenAI's Whisper transcription API.
// The OpenAI key lives in Netlify's environment variables.
//
// Environment variable required:
//   OPENAI_API_KEY  — set this in Netlify > Site > Environment variables
// ============================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'OPENAI_API_KEY environment variable not set in Netlify.' }),
    };
  }

  try {
    const { audioBase64, mimeType, fileName } = JSON.parse(event.body);

    // Reconstruct the audio file as a Buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    // Build multipart/form-data manually — no npm dependencies needed
    const boundary = '----WUDWhisperBoundary' + Date.now();
    const CRLF     = '\r\n';

    const filePart = Buffer.concat([
      Buffer.from(
        `--${boundary}${CRLF}` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"${CRLF}` +
        `Content-Type: ${mimeType}${CRLF}${CRLF}`
      ),
      audioBuffer,
    ]);

    const modelPart = Buffer.from(
      `${CRLF}--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
      `whisper-1${CRLF}` +
      `--${boundary}--${CRLF}`
    );

    const body = Buffer.concat([filePart, modelPart]);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });

    const data = await response.json();

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
