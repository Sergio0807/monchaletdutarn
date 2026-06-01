# Mon Chalet du Tarn — Handoff déploiement Vercel

Site vitrine one-page pour **Le Domaine du Cèdre** (parc résidentiel de loisirs / chalets CANEXEL avec terrain, entre Toulouse et Albi). Commercialisation : Christophe Digue — BAT'IMMO.

Ce dossier est **prêt à déployer sur Vercel**. Il contient le site statique final + une fonction serverless pour le formulaire de contact. Le but de ce handoff : **mettre en ligne sur Vercel** et **finaliser la gestion du formulaire** (envoi d'email réel) via Claude Code.

---

## 1. Nature des fichiers

Contrairement à un handoff classique « maquette à recoder », **ici le HTML/CSS/JS EST le site de production**. Il n'y a pas de framework à reconstruire : c'est du HTML statique + CSS + JavaScript vanilla. On peut le déployer tel quel.

La seule partie à terminer côté code est le **backend du formulaire** (`api/lead.js`), décrit en section 4.

> Note : la version créée dans l'outil de design contenait un panneau de réglages (« Tweaks » : palette, typo, densité, prix) basé sur React/Babel chargés en navigateur. Ces scripts ont été **retirés de cette version production** et les valeurs par défaut sont déjà figées dans le HTML/CSS. Ne pas les réintroduire en prod.

---

## 2. Structure du projet

```
monchaletdutarn-vercel/
├── index.html              # Le site complet (une seule page, ancres internes)
├── assets/
│   ├── styles.css          # Toute la mise en forme (variables CSS, sections, responsive)
│   ├── app.js              # Interactions : nav, menu mobile, reveal scroll, FAQ, FORMULAIRE
│   ├── sagano-hero.jpg     # Visuel hero
│   ├── sagano-*.jpg        # Photos du chalet (terrasse, intérieur, entrée, arrière)
│   ├── domaine-*.jpg       # Photos du domaine (allée, piscine)
│   ├── piscine.jpg
│   ├── schema-technique.jpg# Schéma de structure (section CANEXEL)
│   ├── christophe-digue.jpg# Photo de l'agent
│   └── batimmo-logo.png    # Logo BAT'IMMO
├── api/
│   └── lead.js             # Fonction serverless Vercel : reçoit le formulaire → envoie un email
├── vercel.json             # Config Vercel (cleanUrls, cache assets, en-têtes sécurité)
├── package.json            # type:module, Node >=18
└── .env.example            # Variables d'environnement à configurer
```

---

## 3. Déploiement Vercel

Le projet est un site statique avec un dossier `/api` → Vercel détecte automatiquement les fonctions serverless. **Aucun build n'est nécessaire** (framework preset = « Other », pas de build command).

### Option A — via le dashboard Vercel
1. Pousser ce dossier dans un repo Git (GitHub/GitLab).
2. Sur vercel.com → **Add New Project** → importer le repo.
3. Framework Preset : **Other**. Build Command : *(vide)*. Output Directory : *(vide / racine)*.
4. Ajouter les variables d'environnement (section 4).
5. **Deploy**.
6. Lier le domaine **monchaletdutarn.fr** (Project → Settings → Domains).

### Option B — via la CLI
```bash
npm i -g vercel
cd monchaletdutarn-vercel
vercel            # déploiement preview
vercel --prod     # déploiement production
```
Tester en local (avec les fonctions /api) : `vercel dev`.

---

## 4. Formulaire de contact — à finaliser

### État actuel
- **Front** (`assets/app.js`) : validation côté client (identique à la maquette), puis **POST JSON vers `/api/lead`**. En cas d'échec/indisponibilité de l'API, **repli automatique sur `mailto:`** (ouverture de la messagerie pré-remplie vers `christophe.digue@batimmo.fr`). L'écran de confirmation s'affiche dans les deux cas.
- **Back** (`api/lead.js`) : valide les champs, puis envoie un email via **Resend**. Tant que `RESEND_API_KEY` n'est pas configurée, l'API renvoie une erreur → le front bascule sur le repli `mailto:` (donc le formulaire « marche » dès le déploiement, sans config).

### Champs envoyés
`nom, prenom, ville, tel, email, projet ("Résidence principale" | "Résidence locative" | "Résidence secondaire"), message`

### Pour activer l'envoi d'email réel (recommandé : Resend)
1. Créer un compte sur https://resend.com et une **API key**.
2. Vérifier le domaine **monchaletdutarn.fr** dans Resend (DNS) pour pouvoir envoyer depuis `contact@monchaletdutarn.fr`. En test, utiliser `onboarding@resend.dev` comme `LEAD_FROM`.
3. Dans Vercel → Settings → Environment Variables, définir :
   - `RESEND_API_KEY`
   - `LEAD_TO` = `christophe.digue@batimmo.fr`
   - `LEAD_FROM` = `contact@monchaletdutarn.fr`
4. Redéployer.

### Décisions à confirmer avec le client
- **Service d'envoi** : Resend (par défaut ici) — ou Nodemailer/SMTP du fournisseur de messagerie, SendGrid, ou un service de formulaire type Formspree. Pour changer, remplacer le bloc « Envoi » dans `api/lead.js`.
- **Accusé de réception** au prospect : actuellement non envoyé. Possible d'ajouter un 2ᵉ email de confirmation au visiteur.
- **Stockage des leads** : actuellement email seul. Option : enregistrer aussi dans une base (Vercel KV/Postgres, Google Sheet, CRM).
- **Anti-spam** : un champ « honeypot » est déjà géré côté API (champ `website`). Pour l'activer, ajouter `<input name="website" tabindex="-1" autocomplete="off" hidden>` dans le formulaire. Envisager aussi un rate-limit ou un captcha (hCaptcha/Turnstile) si le spam apparaît.
- **RGPD** : le formulaire mentionne déjà le consentement au recontact. Prévoir la page **Mentions légales / Politique de confidentialité** (liens présents dans le footer mais sans cible).

---

## 5. Contenu encore à compléter (hors code)

Repères laissés dans la page (« zones modulables », notes « non contractuel ») à remplir quand validé par le client :
- Surfaces, plans et DPE du chalet (section CANEXEL).
- Commune exacte / adresse / itinéraire (section Localisation — la carte est aujourd'hui une illustration SVG stylisée, pas une vraie carte).
- Détail des parcelles disponibles et prix définitifs.
- Pages **Mentions légales** et **Politique de confidentialité**.
- Des photos haute définition supplémentaires sont disponibles côté client (séries de prises de vue du domaine et du chalet) si l'on veut enrichir la galerie.

---

## 6. Contexte design (pour rester cohérent)

- **Polices** (Google Fonts, déjà liées dans `index.html`) : `Cormorant Garamond` (titres), `Marcellus` (alt. titres), `Hanken Grotesk` (texte courant).
- **Palette** (variables CSS dans `styles.css`) :
  - Bois `--wood: #b27a47`, bois profond `--wood-deep: #8d5c30`
  - Forêt `--forest: #36412f`, `--forest-2: #455138`
  - Sauge `--sage: #788a63`
  - Fonds clairs : bandes `band-cream`, `band-sand` ; bandes sombres `band-forest`.
- **Structure des sections** (ancres) : `#top` (hero), `#domaine`, `#opportunite`, `#chalet`, `#canexel`, `#galerie`, `#prestations`, `#travaux`, `#localisation`, `#prl`, `#investir`, `#faq`, `#contact`, `#formulaire`.
- **Interactions** (`app.js`) : barre de nav qui se teinte au scroll, menu burger mobile, apparition au scroll (`.reveal` → `.in` via IntersectionObserver), accordéon FAQ.
- **Responsive** : géré en CSS (clamp + media queries). Tester mobile/tablette après déploiement.

---

## 7. Checklist de mise en ligne

- [ ] Repo Git créé et poussé
- [ ] Projet importé sur Vercel (preset « Other », pas de build)
- [ ] Variables d'environnement configurées (Resend) — ou laissées vides pour fonctionner en repli `mailto:`
- [ ] Domaine `monchaletdutarn.fr` lié + HTTPS actif
- [ ] Test du formulaire (envoi réel reçu par l'agent)
- [ ] Domaine vérifié dans Resend (sinon les emails risquent d'être en spam)
- [ ] Pages Mentions légales / Confidentialité ajoutées
- [ ] Vérif mobile + temps de chargement des images (optimiser/compresser si besoin)
```

*Site initialement conçu comme prototype HTML haute-fidélité, ici converti en build statique déployable. Crédit pied de page : Delbuc Productions.*
