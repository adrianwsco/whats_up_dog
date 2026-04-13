// ============================================================
// What's Up Dog? Daily Reporter — Google Apps Script Proxy
// Netlify Serverless Function
//
// Forwards requests from the browser to the Google Apps Script
// web app. Running server-side means we can follow Google's
// redirect and read the response — something the browser
// can't do with no-cors.
//
// Environment variable required:
//   DRIVE_SCRIPT_URL — set this in Netlify > Site > Environment variables
//   Value: your deployed Apps Script web app URL
// ============================================================

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const scriptUrl = process.env.DRIVE_SCRIPT_URL;
  if (!scriptUrl) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'DRIVE_SCRIPT_URL environment variable not set in Netlify.' }),
    };
  }

  try {
    const response = await fetch(scriptUrl, {
      method:   'POST',
      headers:  { 'Content-Type': 'application/json' },
      redirect: 'follow',   // server-side can follow Google's redirect; browser cannot
      body:     event.body,
    });

    const text = await response.text();

    // Apps Script always returns JSON — parse it, fall back gracefully if not
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: true, message: text };
    }

    return {
      statusCode: 200,
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
