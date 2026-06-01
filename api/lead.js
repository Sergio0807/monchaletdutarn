// api/lead.js — Fonction serverless Vercel (Node.js runtime)
// Reçoit le formulaire de demande de renseignements et envoie un email à l'agent.
//
// Service d'envoi : Resend (https://resend.com) — simple, gratuit pour de faibles volumes.
// Variables d'environnement à configurer dans Vercel (Settings → Environment Variables) :
//   RESEND_API_KEY   clé API Resend
//   LEAD_TO          destinataire (ex. christophe.digue@batimmo.fr)
//   LEAD_FROM        expéditeur vérifié chez Resend (ex. contact@monchaletdutarn.fr)
//
// Alternatives possibles (voir README) : Nodemailer/SMTP, SendGrid, ou un service
// de formulaire type Formspree. Dans ce cas, remplacer le bloc "Envoi" ci-dessous.

const ESCAPE = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  // Vercel parse déjà le JSON dans req.body quand Content-Type est application/json.
  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {};
  const { nom, prenom, ville, tel, email, projet, message, website } = body;

  // Anti-spam : champ "honeypot" optionnel (ajoutez <input name="website" hidden> côté front).
  if (website) return res.status(200).json({ ok: true }); // bot silencieusement ignoré

  // Validation minimale côté serveur
  const required = { nom, prenom, ville, tel, email, projet };
  for (const [k, v] of Object.entries(required)) {
    if (!v || !String(v).trim()) {
      return res.status(400).json({ ok: false, error: `Champ manquant : ${k}` });
    }
  }
  if (!/.+@.+\..+/.test(email)) {
    return res.status(400).json({ ok: false, error: 'Email invalide' });
  }

  const TO = process.env.LEAD_TO || 'christophe.digue@batimmo.fr';
  const FROM = process.env.LEAD_FROM || 'contact@monchaletdutarn.fr';
  const KEY = process.env.RESEND_API_KEY;

  const subject = `Demande de renseignements — Mon Chalet du Tarn (${projet})`;
  const html = `
    <h2 style="font-family:Georgia,serif;color:#36412f;margin:0 0 16px">Nouvelle demande — Le Domaine du Cèdre</h2>
    <table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0;color:#788a63"><b>Nom</b></td><td>${ESCAPE(nom)} ${ESCAPE(prenom)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#788a63"><b>Domicile</b></td><td>${ESCAPE(ville)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#788a63"><b>Téléphone</b></td><td>${ESCAPE(tel)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#788a63"><b>Email</b></td><td>${ESCAPE(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#788a63"><b>Projet</b></td><td>${ESCAPE(projet)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#788a63;vertical-align:top"><b>Message</b></td><td>${ESCAPE(message).replace(/\n/g, '<br>')}</td></tr>
    </table>`;

  // — Envoi via Resend —
  if (!KEY) {
    // Pas de clé configurée : on log et on renvoie une erreur pour déclencher le repli mailto côté client.
    console.error('[lead] RESEND_API_KEY manquante — configurez les variables d’environnement Vercel.');
    return res.status(500).json({ ok: false, error: 'Service email non configuré' });
  }

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Mon Chalet du Tarn <${FROM}>`,
        to: [TO],
        reply_to: email,
        subject,
        html,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      console.error('[lead] Resend a renvoyé une erreur :', r.status, detail);
      return res.status(502).json({ ok: false, error: 'Envoi impossible' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[lead] Exception :', err);
    return res.status(500).json({ ok: false, error: 'Erreur serveur' });
  }
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
