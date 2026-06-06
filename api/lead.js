// api/lead.js — Serverless Vercel : formulaire de demande de renseignements
// Variables d'env Vercel (Settings → Environment Variables) :
//   RESEND_API_KEY       Clé API Resend
//   CONTACT_FROM_EMAIL   Expéditeur vérifié chez Resend (ex. contact@monchaletdutarn.fr)

const RECIPIENTS = ['christophe.digue@batimmo.fr', 'serge@rouanet.fr'];

const PROJET_LABELS = {
  'Résidence principale': 'Résidence principale (RP)',
  'Résidence locative':   'Résidence locative (RL)',
  'Résidence secondaire': 'Résidence secondaire (RS)',
};

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const { nom, prenom, ville, tel, email, projet, message, website } = body;

  // Honeypot anti-spam
  if (website) return res.status(200).json({ ok: true });

  // Validation serveur
  const required = [
    [!String(nom   || '').trim(), 'Le nom est requis'],
    [!String(prenom|| '').trim(), 'Le prénom est requis'],
    [!String(tel   || '').trim(), 'Le téléphone est requis'],
    [!String(email || '').trim(), 'L\'adresse email est requise'],
    [!String(message|| '').trim(),'Le message est requis'],
    [!projet,                     'Le type de projet est requis'],
  ];
  for (const [fail, msg] of required) {
    if (fail) return res.status(400).json({ ok: false, error: msg });
  }
  if (!/.+@.+\..+/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Adresse email invalide' });
  }

  const FROM = process.env.CONTACT_FROM_EMAIL || 'contact@monchaletdutarn.fr';
  const KEY  = process.env.RESEND_API_KEY;

  if (!KEY) {
    console.error('[contact] RESEND_API_KEY manquante — configurez les variables Vercel.');
    return res.status(500).json({ ok: false, error: 'Service email non configuré' });
  }

  const projetLabel = PROJET_LABELS[projet] || esc(projet);
  const subject = `Nouvelle demande — Mon Chalet du Tarn · ${projetLabel}`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Mon Chalet du Tarn <${FROM}>`,
        to: RECIPIENTS,
        reply_to: email,
        subject,
        html: buildEmail({ nom, prenom, ville, tel, email, projet: projetLabel, message }),
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('[contact] Resend erreur :', r.status, detail);
      return res.status(502).json({ ok: false, error: 'Envoi impossible, veuillez réessayer.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[contact] Exception :', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur, veuillez réessayer.' });
  }
}

function buildEmail({ nom, prenom, ville, tel, email, projet, message }) {
  const msgHtml = esc(message).replace(/\n/g, '<br>');
  const villeRow = ville ? `
            <tr>
              <td style="padding:11px 16px 11px 0;width:32%;border-bottom:1px solid #f0ece3;vertical-align:top;">
                <span style="font-size:11px;color:#b0c09a;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;">Domicile</span>
              </td>
              <td style="padding:11px 0;border-bottom:1px solid #f0ece3;">
                <span style="font-size:15px;color:#1e2a1a;">${esc(ville)}</span>
              </td>
            </tr>` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nouvelle demande — Mon Chalet du Tarn</title>
</head>
<body style="margin:0;padding:0;background:#f2efe7;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f2efe7;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
           style="max-width:580px;background:#ffffff;border-radius:8px;overflow:hidden;
                  box-shadow:0 4px 32px rgba(0,0,0,0.10);">

      <!-- En-tête -->
      <tr>
        <td style="background:#2e3a27;padding:28px 40px 24px;text-align:center;">
          <p style="margin:0 0 6px;color:#d8c39e;font-size:10px;letter-spacing:0.26em;
                    text-transform:uppercase;font-weight:700;">
            Le Domaine du Cèdre · Tarn
          </p>
          <p style="margin:0;color:#ffffff;font-family:Georgia,'Times New Roman',serif;
                    font-size:21px;font-weight:400;letter-spacing:0.01em;">
            Mon Chalet du Tarn
          </p>
        </td>
      </tr>

      <!-- Bandeau titre -->
      <tr>
        <td style="background:#b27a47;padding:14px 40px;">
          <p style="margin:0;color:#ffffff;font-size:11px;letter-spacing:0.2em;
                    text-transform:uppercase;font-weight:700;">
            Nouvelle demande de renseignements
          </p>
        </td>
      </tr>

      <!-- Corps -->
      <tr>
        <td style="padding:32px 40px 0;">

          <!-- Coordonnées -->
          <p style="margin:0 0 14px;font-size:11px;color:#9aaa85;letter-spacing:0.15em;
                    text-transform:uppercase;font-weight:700;">
            Coordonnées du prospect
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                 style="border-collapse:collapse;border-top:1px solid #f0ece3;">
            <tr>
              <td style="padding:11px 16px 11px 0;width:32%;border-bottom:1px solid #f0ece3;vertical-align:top;">
                <span style="font-size:11px;color:#b0c09a;text-transform:uppercase;
                             letter-spacing:0.1em;font-weight:700;">Nom</span>
              </td>
              <td style="padding:11px 0;border-bottom:1px solid #f0ece3;">
                <span style="font-size:15px;color:#1e2a1a;font-weight:600;">
                  ${esc(nom)} ${esc(prenom)}
                </span>
              </td>
            </tr>
            ${villeRow}
            <tr>
              <td style="padding:11px 16px 11px 0;border-bottom:1px solid #f0ece3;vertical-align:top;">
                <span style="font-size:11px;color:#b0c09a;text-transform:uppercase;
                             letter-spacing:0.1em;font-weight:700;">Téléphone</span>
              </td>
              <td style="padding:11px 0;border-bottom:1px solid #f0ece3;">
                <a href="tel:${esc(tel)}" style="font-size:15px;color:#b27a47;
                                                  font-weight:600;text-decoration:none;">
                  ${esc(tel)}
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding:11px 16px 11px 0;vertical-align:top;">
                <span style="font-size:11px;color:#b0c09a;text-transform:uppercase;
                             letter-spacing:0.1em;font-weight:700;">Email</span>
              </td>
              <td style="padding:11px 0;">
                <a href="mailto:${esc(email)}" style="font-size:15px;color:#b27a47;
                                                       text-decoration:none;">
                  ${esc(email)}
                </a>
              </td>
            </tr>
          </table>

          <!-- Projet -->
          <p style="margin:28px 0 14px;font-size:11px;color:#9aaa85;letter-spacing:0.15em;
                    text-transform:uppercase;font-weight:700;">
            Détail du projet
          </p>

          <!-- Badge type de projet -->
          <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:18px;">
            <tr>
              <td style="background:#2e3a27;border-radius:4px;padding:8px 18px;">
                <span style="color:#d8c39e;font-size:11px;font-weight:700;
                             letter-spacing:0.16em;text-transform:uppercase;">
                  ${projet}
                </span>
              </td>
            </tr>
          </table>

          <!-- Message -->
          <div style="background:#f8f6f1;border-left:3px solid #b27a47;
                      padding:18px 22px;border-radius:0 4px 4px 0;margin-bottom:32px;">
            <p style="margin:0;font-size:15px;color:#2c3528;line-height:1.8;">
              ${msgHtml}
            </p>
          </div>

        </td>
      </tr>

      <!-- Pied de page -->
      <tr>
        <td style="background:#f8f6f1;padding:20px 40px;border-top:1px solid #ede9e0;">
          <p style="margin:0;font-size:11px;color:#b0c09a;text-align:center;line-height:1.7;">
            Mon Chalet du Tarn — Le Domaine du Cèdre · Tarn<br>
            <a href="https://monchaletdutarn.fr" style="color:#b27a47;text-decoration:none;">
              monchaletdutarn.fr
            </a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}
