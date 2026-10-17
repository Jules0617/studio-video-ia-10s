# 🎬 Studio Vidéo IA 10s — Générateur Gratuit & Illimité (Open-Source Multi-GPU)

Application web complète (Mobile & PC) permettant de générer des vidéos par IA de **5s, 10s, 15s et 20s** à partir d'un **prompt texte (Text-to-Video)** ou d'une **image (Image-to-Video)**, 100 % gratuitement et sans carte bancaire grâce aux clusters **ZeroGPU Hugging Face**.

## 🚀 Déployer gratuitement sur Vercel en 1 clic (depuis votre Téléphone)

Cliquez sur le bouton ci-dessous depuis votre téléphone pour déployer instantanément votre site sur votre compte Vercel :

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Jules0617/studio-video-ia-10s)

---

## ✨ Fonctionnalités incluses

1. **🎬 Texte → Vidéo (5s, 10s, 15s, 20s) avec Auto-Failover Multi-GPU :**
   - Si un serveur GPU gratuit est occupé, l'application bascule automatiquement sur les serveurs miroirs disponibles :
     - `FrameAI4687/Omni-Video-Factory` (Multi-scènes 10s à 20s)
     - `vamo455/Omni-videos-custom-auto_prompt_high-quality` (Miroir HQ 10s à 20s)
     - `Lightricks/ltx-video-distilled` (Moteur DiT ultra-rapide)
     - `TIGER-Lab/T2V-Turbo-V2` (Rendu Turbo)
     - `zai-org/CogVideoX-5B-Space` (Qualité Cinéma HD)
2. **🖼️ Image → Vidéo (I2V) :**
   - Importez une photo depuis votre téléphone (ou générez une image IA en 1 clic à partir de votre prompt) et animez-la avec **Wan 2.2 FP8 Faster**, **Wan 2.1 Fast**, **Lightricks LTX-2.3 HD**, **Tencent HunyuanVideo 1.5** ou **Omni-Video I2V 10s**.
3. **⚡ Studio 8 Serveurs GPU en Direct :**
   - Accès direct intégré aux 8 Spaces GPU officiels sans quitter votre site.
4. **🎞️ Galerie Locale Mobile :**
   - Sauvegarde automatique de vos vidéos générées dans le navigateur (`localStorage`) avec téléchargement direct en `.mp4`.
5. **🔑 Support Token Hugging Face Gratuit :**
   - Permet d'enregistrer un token `hf_...` gratuit pour débloquer les quotas ZeroGPU sur 4G/5G.
