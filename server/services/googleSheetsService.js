const { google } = require('googleapis');

const appendToSheet = async (data, gid = 0) => {
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

    const rowData = {
      values: data.map(val => {
        if (val === null || val === undefined) val = '';
        if (typeof val === 'number') {
          return { userEnteredValue: { numberValue: val } };
        } else {
          return { userEnteredValue: { stringValue: String(val) } };
        }
      })
    };

    await googleSheets.spreadsheets.batchUpdate({
      auth,
      spreadsheetId,
      resource: {
        requests: [
          {
            appendCells: {
              sheetId: Number(gid),
              rows: [rowData],
              fields: 'userEnteredValue'
            }
          }
        ]
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error appending to Google Sheets:", error);
    return { success: false, message: error.message };
  }
};

const updateInSheet = async (oldData, newData, gid = 0) => {
  try {
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      return { success: false, message: 'Google Sheets credentials missing' };
    }

    let formattedPrivateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
      formattedPrivateKey = formattedPrivateKey.slice(1, -1);
    }
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL, private_key: formattedPrivateKey },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Get sheet name
    const sheetMetadata = await googleSheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetMetadata.data.sheets.find(s => s.properties.sheetId === Number(gid));
    if (!sheet) return { success: false, message: "Sheet not found" };
    const sheetName = sheet.properties.title;

    // Get all rows
    const response = await googleSheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const rows = response.data.values || [];
    
    let rowIndexToUpdate = -1;
    for (let i = 0; i < rows.length; i++) {
      // Match by Name (0) and Date (1). If these match, we assume it's the right row.
      if (rows[i] && rows[i][0] === String(oldData[0]) && rows[i][1] === String(oldData[1])) {
        // Double check a third parameter just to be sure (like MedicineName or EggsProduced)
        if (rows[i][2] === String(oldData[2]) || rows[i][3] === String(oldData[3])) {
          rowIndexToUpdate = i;
          break;
        } else if (!oldData[3]) { // If it's a short array, just match 0 and 1
          rowIndexToUpdate = i;
          break;
        }
      }
    }

    if (rowIndexToUpdate === -1) {
      return { success: false, message: "Matching row not found in Google Sheets" };
    }

    // Update row
    const rangeToUpdate = `${sheetName}!A${rowIndexToUpdate + 1}`;
    await googleSheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeToUpdate,
      valueInputOption: 'USER_ENTERED',
      resource: { values: [newData] }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating sheet:", error);
    return { success: false, message: error.message };
  }
};

const deleteFromSheet = async (oldData, gid = 0) => {
  try {
    if (!process.env.GOOGLE_SHEETS_CLIENT_EMAIL || !process.env.GOOGLE_SHEETS_PRIVATE_KEY) {
      return { success: false, message: 'Google Sheets credentials missing' };
    }

    let formattedPrivateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
      formattedPrivateKey = formattedPrivateKey.slice(1, -1);
    }
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: { client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL, private_key: formattedPrivateKey },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });
    const spreadsheetId = process.env.SPREADSHEET_ID;

    // Get sheet name
    const sheetMetadata = await googleSheets.spreadsheets.get({ spreadsheetId });
    const sheet = sheetMetadata.data.sheets.find(s => s.properties.sheetId === Number(gid));
    if (!sheet) return { success: false, message: "Sheet not found" };
    const sheetName = sheet.properties.title;

    // Get all rows
    const response = await googleSheets.spreadsheets.values.get({ spreadsheetId, range: sheetName });
    const rows = response.data.values || [];
    
    let rowIndexToDelete = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === String(oldData[0]) && rows[i][1] === String(oldData[1])) {
        if (rows[i][2] === String(oldData[2]) || rows[i][3] === String(oldData[3])) {
          rowIndexToDelete = i;
          break;
        } else if (!oldData[3]) {
          rowIndexToDelete = i;
          break;
        }
      }
    }

    if (rowIndexToDelete === -1) {
      return { success: false, message: "Matching row not found in Google Sheets" };
    }

    // Delete row using deleteDimension
    await googleSheets.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: Number(gid),
                dimension: "ROWS",
                startIndex: rowIndexToDelete,
                endIndex: rowIndexToDelete + 1
              }
            }
          }
        ]
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting from sheet:", error);
    return { success: false, message: error.message };
  }
};

module.exports = { appendToSheet, updateInSheet, deleteFromSheet };
