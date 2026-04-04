// ══════════════════════════════════════════════════════════════
// Westlake Goldsmiths — Form Handler
// Google Apps Script: receives form data, logs to Sheets, creates Trello card
//
// SETUP:
// 1. Create a Google Sheet (or use existing)
// 2. Go to Extensions > Apps Script
// 3. Paste this entire file into Code.gs
// 4. Fill in the CONFIG values below
// 5. Deploy > New Deployment > Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 6. Copy the Web App URL and paste it into your index.html
//    (replace the APPS_SCRIPT_URL placeholder)
// ══════════════════════════════════════════════════════════════

// ── CONFIG — Fill these in ──
const CONFIG = {
  // Google Sheets
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',       // From the Sheet URL: docs.google.com/spreadsheets/d/THIS_PART/edit
  SHEET_NAME: 'Inquiries',                 // Tab name in the sheet

  // Trello
  TRELLO_API_KEY: 'YOUR_TRELLO_API_KEY',   // Get from: https://trello.com/app-key
  TRELLO_TOKEN: 'YOUR_TRELLO_TOKEN',       // Generate from the app-key page (click "Token" link)
  TRELLO_LIST_ID: 'YOUR_TRELLO_LIST_ID',   // The list where new cards go (see instructions below)

  // Email notification (optional — set to '' to disable)
  NOTIFY_EMAIL: 'hello@westlakegoldsmiths.com'
};

// ── HOW TO GET YOUR TRELLO LIST ID ──
// 1. Open your Trello board in a browser
// 2. Add .json to the end of the URL (e.g., https://trello.com/b/ABC123/board-name.json)
// 3. Search for the list name — the "id" field next to it is your LIST_ID
// Or: https://api.trello.com/1/boards/YOUR_BOARD_ID/lists?key=YOUR_KEY&token=YOUR_TOKEN


// ══════════════════════════════════════════════════════════════
// DO NOT EDIT BELOW THIS LINE (unless you know what you're doing)
// ══════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // Write to Google Sheet
    writeToSheet(data);

    // Create Trello card
    createTrelloCard(data);

    // Send email notification
    if (CONFIG.NOTIFY_EMAIL) {
      sendNotification(data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Handle CORS preflight
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function writeToSheet(data) {
  const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // Create sheet + headers if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'Timestamp', 'Name', 'Email', 'Phone',
      'Piece Type', 'Metal', 'Stone', 'Style',
      'Budget', 'Notes'
    ]);
    // Bold the header row
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  sheet.appendRow([
    new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
    data.name    || '',
    data.email   || '',
    data.phone   || '',
    data.piece   || '',
    data.metal   || '',
    data.stone   || '',
    data.style   || '',
    data.budget  || '',
    data.notes   || ''
  ]);
}

function createTrelloCard(data) {
  if (!CONFIG.TRELLO_API_KEY || CONFIG.TRELLO_API_KEY === 'YOUR_TRELLO_API_KEY') return;

  const cardName = `${data.piece || 'Custom Piece'} — ${data.name || 'Unknown'}`;

  const description = [
    `## Client Details`,
    `- **Name:** ${data.name || 'N/A'}`,
    `- **Email:** ${data.email || 'N/A'}`,
    `- **Phone:** ${data.phone || 'N/A'}`,
    ``,
    `## Design Brief`,
    `- **Piece:** ${data.piece || 'N/A'}`,
    `- **Metal:** ${data.metal || 'N/A'}`,
    `- **Stone:** ${data.stone || 'N/A'}`,
    `- **Budget:** ${data.budget || 'N/A'}`,
    ``,
    `## Style & Notes`,
    `${data.style || 'No style notes provided.'}`,
    ``,
    `${data.notes ? '**Additional:** ' + data.notes : ''}`,
    ``,
    `---`,
    `*Submitted via westlakegoldsmiths.com*`
  ].join('\n');

  const url = 'https://api.trello.com/1/cards';
  const params = {
    method: 'post',
    payload: {
      key: CONFIG.TRELLO_API_KEY,
      token: CONFIG.TRELLO_TOKEN,
      idList: CONFIG.TRELLO_LIST_ID,
      name: cardName,
      desc: description,
      pos: 'top'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, params);
  const code = response.getResponseCode();
  if (code !== 200) {
    console.error('Trello API error:', code, response.getContentText());
  }
}

function sendNotification(data) {
  const subject = `New Inquiry: ${data.piece || 'Custom Piece'} — ${data.name || 'Unknown Client'}`;

  const body = [
    `New design inquiry from westlakegoldsmiths.com`,
    ``,
    `CLIENT`,
    `  Name:  ${data.name || 'N/A'}`,
    `  Email: ${data.email || 'N/A'}`,
    `  Phone: ${data.phone || 'N/A'}`,
    ``,
    `DESIGN BRIEF`,
    `  Piece:  ${data.piece || 'N/A'}`,
    `  Metal:  ${data.metal || 'N/A'}`,
    `  Stone:  ${data.stone || 'N/A'}`,
    `  Budget: ${data.budget || 'N/A'}`,
    ``,
    `STYLE`,
    `  ${data.style || 'Not specified'}`,
    ``,
    `NOTES`,
    `  ${data.notes || 'None'}`,
    ``,
    `---`,
    `This inquiry was also logged in Google Sheets and Trello.`
  ].join('\n');

  MailApp.sendEmail(CONFIG.NOTIFY_EMAIL, subject, body);
}
