import https from 'https';

const botToken = "8792675954:AAHATYnGtuGFV83kS1z_iPeVjkETk07DeoY";
const chatId = "1092499824";

const requestId = `REQ-${Date.now()}-TEST`;
const messageText = `🔔 <b>UNIVERSAL ATTENDANCE</b>\n<b>LOGIN ACCESS REQUEST</b>\n\n<b>User ID:</b>\n<code>test_user_button</code>\n\n<b>Request Type:</b>\nLogin Access Request\n\n<b>Platform:</b>\nANDROID\n\n<b>Date & Time:</b>\n13/09/2026, 11:54:00 AM IST\n\n<b>Request ID:</b>\n<code>${requestId}</code>\n\n<b>Status:</b>\nPending`;

const payload = JSON.stringify({
  chat_id: chatId,
  text: messageText,
  parse_mode: 'HTML',
  reply_markup: {
    inline_keyboard: [
      [
        { text: '✅ APPROVE', callback_data: `approve:${requestId}` },
        { text: '❌ REJECT', callback_data: `reject:${requestId}` }
      ]
    ]
  }
});

const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

const req = https.request(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Telegram API Status:', res.statusCode);
    console.log('Telegram API Response:', data);
  });
});

req.on('error', err => console.error('Error:', err.message));
req.write(payload);
req.end();
