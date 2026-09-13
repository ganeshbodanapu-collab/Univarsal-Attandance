import https from 'https';

const botToken = "8792675954:AAHATYnGtuGFV83kS1z_iPeVjkETk07DeoY";
const webhookUrl = "https://gkphikhsgysoqjradbaz.supabase.co/functions/v1/telegram-webhook";

const url = `https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Set Webhook Response:', data);
  });
}).on('error', (err) => {
  console.error('Error setting webhook:', err.message);
});
