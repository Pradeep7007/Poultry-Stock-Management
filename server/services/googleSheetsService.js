const { google } = require('googleapis');

const appendToSheet = async (data, sheetName = 'Sheet1') => {
  try {
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      console.warn("Google Sheets credentials not found. Skipping Google Sheets integration.");
      return { success: false, message: 'Google Sheets credentials missing' };
    }

    let formattedPrivateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
      formattedPrivateKey = formattedPrivateKey.slice(1, -1);
    }
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
        private_key: formattedPrivateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const spreadsheetId = process.env.SPREADSHEET_ID;

    await googleSheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: sheetName, // Dinamically append to different sheets
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [data],
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error appending to Google Sheets:", error);
    return { success: false, message: error.message };
  }
};

module.exports = { appendToSheet };
