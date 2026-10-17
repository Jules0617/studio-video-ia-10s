export const config = {
  runtime: "edge"
};

const EAS_HOST = "https://alibaba-pai-easyanimate.hf.space";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

// Encyclopédie visuelle bilingue (Anglais + Chinois) pour les personnages, mangas, animes et sujets célèbres
const CHARACTER_VISUAL_PRESETS = [
  {
    match: /\b(naruto|shippuden|uzumaki|rasengan|konoha)\b/i,
    isAnime: true,
    en: "Japanese 2D anime style, Naruto Uzumaki from Naruto Shippuden, a young male ninja with spiky bright yellow blonde hair, wearing a black headband and an orange and black ninja jacket, running forward in a ninja battle and holding a glowing blue energy ball Rasengan in his hand, 2D anime animation, vibrant colors, dynamic continuous action",
    zh: "火影忍者疾风传漩涡鸣人，金色刺猬头少年忍者，戴着木叶护额，穿着橙黑相间的忍者服，手中凝聚蓝色螺旋丸能量球向前奔跑战斗，日本热血动漫风格，连续流畅动作"
  },
  {
    match: /\b(sasuke|uchiha|sharingan|chidori)\b/i,
    isAnime: true,
    en: "Japanese 2D anime style, Sasuke Uchiha from Naruto Shippuden, a young ninja with spiky black hair and glowing red Sharingan eyes, wearing dark ninja clothes, running forward with crackling blue lightning Chidori electricity in his hand, vibrant 2D anime animation, dynamic continuous action",
    zh: "火影忍者疾风传宇智波佐助，黑色刺猬头少年忍者，红色写轮眼，手中闪烁蓝色千鸟雷电光芒向前高速奔跑战斗，日本热血动漫风格，连续流畅动作"
  },
  {
    match: /\b(goku|dragon\s*ball|saiyan|kamehameha|vegeta)\b/i,
    isAnime: true,
    en: "Japanese 2D anime style, Son Goku Super Saiyan from Dragon Ball Z, muscular martial artist with spiky glowing golden hair and golden energy aura, wearing an orange and blue martial arts gi uniform, unleashing a glowing blue Kamehameha energy beam in battle, vibrant 2D anime animation, dynamic continuous action",
    zh: "七龙珠Z孙悟空超级赛亚人，金色刺猬头和耀眼金色气场，身穿橙蓝武道服，双手凝聚并发射蓝色龟派气功波能量，日本热血动漫风格，连续流畅动作"
  },
  {
    match: /\b(luffy|one\s*piece|zoro|mugiwara)\b/i,
    isAnime: true,
    en: "Japanese 2D anime style, Monkey D. Luffy from One Piece, cheerful young pirate wearing his iconic straw hat and an open red vest with blue shorts, leaping and throwing a powerful punch on the deck of a pirate ship over blue ocean waves, vibrant 2D anime animation, dynamic continuous action",
    zh: "海贼王蒙奇·D·路飞，头戴标志性草帽，身穿红色背心和蓝色短裤的少年海盗，在海盗船甲板上跃起连续挥拳战斗，日本热血动漫风格，连续流畅动作"
  },
  {
    match: /\b(gojo|satoru|jujutsu|kaisen|sukuna)\b/i,
    isAnime: true,
    en: "Japanese 2D anime style, Satoru Gojo from Jujutsu Kaisen, tall sorcerer with spiky white hair and glowing bright blue eyes, wearing a high-collar dark jacket, unleashing glowing red and purple cursed energy spheres in his hands, vibrant 2D anime animation, dynamic continuous action",
    zh: "咒术回战五条悟，白色刺猬头，发光的明亮蓝色六眼，身穿深色高领咒术高专制服，双手释放耀眼的红紫咒力能量球，日本热血动漫风格，连续流畅动作"
  },
  {
    match: /\b(tanjiro|demon\s*slayer|kimetsu|nezuko)\b/i,
    isAnime: true,
    en: "Japanese 2D anime style, Tanjiro Kamado from Demon Slayer, young swordsman with burgundy hair and forehead scar, wearing a green and black checkered haori coat, swinging a katana sword surrounded by swirling water and fire flames in a dark forest, vibrant 2D anime animation, dynamic continuous action",
    zh: "鬼灭之刃灶门炭治郎，身穿绿黑格纹羽织的少年剑士，在森林中连续挥舞缠绕烈焰与水流的日轮刀战斗，日本热血动漫风格，连续流畅动作"
  },
  {
    match: /\b(spider-?man|spiderman|peter\s*parker)\b/i,
    isAnime: false,
    en: "Cinematic movie shot of Spider-Man wearing his iconic red and blue webbed superhero suit and mask with white eye lenses, swinging continuously on spider webs between tall glass skyscrapers in New York City at sunset, dynamic camera tracking shot",
    zh: "漫威蜘蛛侠身穿标志性红蓝网纹战衣和面具，在夕阳下的纽约摩天大楼之间连续荡蛛丝高速飞跃，电影级特效画面，镜头高速跟随，动作连续流畅"
  },
  {
    match: /\b(batman|gotham|dark\s*knight)\b/i,
    isAnime: false,
    en: "Cinematic movie shot of Batman in his dark armored batsuit, cowl helmet and flowing black cape, running and leaping across a rainy neon-lit rooftop in Gotham City at night with lightning in the sky, dynamic camera tracking shot",
    zh: "蝙蝠侠身穿黑色装甲战衣、头盔和黑色披风，在雨夜霓虹闪烁的哥谭市屋顶连续奔跑跳跃，电影级画面，镜头跟随，动作连续流畅"
  },
  {
    match: /\b(iron\s*man|tony\s*stark)\b/i,
    isAnime: false,
    en: "Cinematic movie shot of Iron Man in his sleek red and gold metallic superhero armor with glowing blue arc reactor on his chest, flying fast through the clouds with glowing repulsor jets in his hands and boots, dynamic camera tracking shot",
    zh: "钢铁侠身穿红金金属装甲，胸口闪烁蓝色反应堆光芒，手掌和脚底喷射火焰在云层间高速连续飞行，电影级特效画面，动作连续流畅"
  }
];

async function translatePair(text, langpair) {
  if (!text) return "";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3200);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 460))}&langpair=${langpair}`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (
        translated &&
        !translated.includes("MYMEMORY WARNING") &&
        !translated.includes("QUERY LENGTH LIMIT")
      ) {
        return translated;
      }
    }
  } catch (_) {}
  return "";
}

async function buildBilingualVisualPrompt(rawPrompt, userStyle = "") {
  const cleaned = (rawPrompt || "").trim();

  // 1. Vérifie si le prompt mentionne un personnage / anime / univers précis
  for (const preset of CHARACTER_VISUAL_PRESETS) {
    if (preset.match.test(cleaned)) {
      const extraEn = await translatePair(cleaned, "fr|en");
      const extraZh = await translatePair(extraEn || cleaned, "en|zh-CN");
      const fullPrompt = `${preset.en}, ${extraEn || cleaned}. ${preset.zh}，${extraZh || ""}`;
      const negativePrompt = preset.isAnime
        ? "photorealistic, real person, live action, static, frozen, repetitive loop, ugly, blurry, low quality"
        : "static, frozen, repetitive loop, distant tiny subject, ugly, deformed, blurry, watermark, low quality";
      return {
        fullPrompt,
        negativePrompt,
        promptEn: `${preset.en} (${extraEn || cleaned})`,
        isAnime: preset.isAnime
      };
    }
  }

  // 2. Détecte si l'utilisateur demande un anime / manga / dessin animé en général
  const isAnimeRequest =
    /\b(anime|manga|otaku|cartoon|dessin\s*anim[eé]|ghibli|shonen|ninja|samoura[iï])\b/i.test(
      cleaned
    ) || userStyle.toLowerCase().includes("anime");

  // 3. Traduction bilingue Français -> Anglais ET Anglais -> Chinois (car EasyAnimateV5.1-12b-zh-InP est bilingue EN+ZH)
  const translatedEn = (await translatePair(cleaned, "fr|en")) || cleaned;
  const translatedZh = await translatePair(translatedEn, "en|zh-CN");

  const effectiveStyle = isAnimeRequest
    ? "Japanese 2D anime animation style, vibrant colors, fluid sakuga continuous motion, 日本二维动漫风格，色彩鲜艳，动作连续流畅"
    : `${userStyle || "photorealistic 4k cinema movie shot, ultra detailed"}, 电影级高清真实画面，细节丰富，镜头跟随，动作大幅度连续流畅`;

  const fullPrompt = `Close up dynamic tracking shot: ${translatedEn}. Continuous progressive physical action and smooth camera movement from start to finish, ${effectiveStyle}. ${
    translatedZh ? `${translatedZh}，连续流畅动作，高清细节。` : ""
  }`;

  const negativePrompt = isAnimeRequest
    ? "photorealistic, real human, static, frozen, repetitive loop, ugly, blurry, low quality"
    : "static, frozen, repetitive loop, distant tiny subject, jittery, ugly, deformed, blurry, watermark, text, low quality";

  return {
    fullPrompt,
    negativePrompt,
    promptEn: translatedEn,
    isAnime: isAnimeRequest
  };
}

function base64ToUint8Array(base64Raw) {
  const binaryString = atob(base64Raw);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function uploadBase64ImageToEAS(base64DataUri) {
  const match = base64DataUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const mimeType = match ? match[1] : "image/jpeg";
  const base64Raw = match ? match[2] : base64DataUri;
  const bytes = base64ToUint8Array(base64Raw);
  const ext = mimeType.split("/")[1] || "jpg";

  const formData = new FormData();
  const blob = new Blob([bytes], { type: mimeType });
  formData.append("files", blob, `upload.${ext}`);

  const upResp = await fetch(`${EAS_HOST}/upload`, {
    method: "POST",
    body: formData
  });

  if (!upResp.ok) {
    throw new Error(`Échec de l'envoi d'image vers le GPU (${upResp.status})`);
  }

  const upJson = await upResp.json();
  if (!Array.isArray(upJson) || !upJson[0]) {
    throw new Error("Chemin d'image non retourné par le serveur GPU");
  }
  return upJson[0];
}

async function runContinuous81FramesAlibaba({
  fullPrompt,
  negativePrompt,
  aspect = "16:9",
  speed = "fast",
  isImage = false,
  startImagePath = null,
  attemptIndex = 0,
  onEvent = () => {}
}) {
  let width = 512;
  let height = 288;

  if (aspect === "9:16") {
    width = 288;
    height = 512;
  } else if (aspect === "1:1") {
    width = 384;
    height = 384;
  } else if (speed === "high" && attemptIndex === 0) {
    width = 672;
    height = 384;
  } else {
    width = 512;
    height = 288;
  }

  const steps = speed === "high" && attemptIndex === 0 ? 12 : 11;
  // 81 frames = 10.125 secondes continues en une seule passe (aucune répétition de 1s !)
  const frames = isImage ? 1 : 81;

  const genMethod = isImage ? "Image Generation" : "Video Generation";
  const seed = String(Math.floor(Math.random() * 99999999));
  const sessionHash =
    Math.random().toString(36).substring(2, 10) +
    Math.random().toString(36).substring(2, 6);

  const startImageObj =
    startImagePath && startImagePath.startsWith("/tmp/")
      ? { path: startImagePath, meta: { _type: "gradio.FileData" } }
      : null;

  const payload = {
    data: [
      "models/Diffusion_Transformer/EasyAnimateV5.1-12b-zh-InP",
      "none",
      "none",
      "none",
      0.55,
      fullPrompt,
      negativePrompt,
      "Flow",
      steps,
      "Generate by",
      width,
      height,
      512,
      genMethod,
      frames,
      6.0,
      startImageObj,
      null,
      null,
      null,
      0.7,
      seed
    ],
    fn_index: 5,
    session_hash: sessionHash
  };

  onEvent({
    type: "joining",
    attempt: attemptIndex + 1,
    width,
    height,
    frames,
    steps
  });

  const abortCtrl = new AbortController();
  const totalGuardTimer = setTimeout(() => {
    abortCtrl.abort(new Error("Délai maximal de rendu atteint"));
  }, 240000);

  try {
    const joinResp = await fetch(`${EAS_HOST}/queue/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: abortCtrl.signal
    });

    if (!joinResp.ok) {
      throw new Error(`Join HTTP ${joinResp.status}`);
    }

    const joinData = await joinResp.json();

    const streamResp = await fetch(
      `${EAS_HOST}/queue/data?session_hash=${sessionHash}`,
      {
        method: "GET",
        headers: { Accept: "text/event-stream" },
        signal: abortCtrl.signal
      }
    );

    if (!streamResp.ok || !streamResp.body) {
      throw new Error(`Stream HTTP ${streamResp.status}`);
    }

    const reader = streamResp.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;

        let msg;
        try {
          msg = JSON.parse(jsonStr);
        } catch (_) {
          continue;
        }

        if (msg.msg === "estimation") {
          const rank = (msg.rank ?? 0) + 1;
          onEvent({
            type: "queue",
            rank,
            queueSize: msg.queue_size ?? 1,
            eta: Math.round(msg.rank_eta || 55)
          });
        } else if (msg.msg === "process_starts") {
          onEvent({
            type: "processing",
            eta: Math.round(msg.eta || 55),
            frames
          });
        } else if (msg.msg === "unexpected_error" || msg.msg === "queue_full") {
          throw new Error(msg.message || `Gradio ${msg.msg}`);
        } else if (msg.msg === "process_completed") {
          if (msg.success === false) {
            throw new Error(msg?.output?.error || "GPU process_completed failed");
          }

          const outData = msg?.output?.data || [];

          if (isImage && outData[0]?.value) {
            const imgVal = outData[0].value;
            const imgUrl = imgVal.url || `${EAS_HOST}/file=${imgVal.path}`;
            return {
              url: imgUrl,
              rawUrl: imgUrl,
              path: imgVal.path,
              eventId: joinData.event_id,
              engine: "Alibaba PAI EasyAnimate 12B (Image GPU Dédié)"
            };
          }

          const vidVal =
            outData[1]?.value?.video ||
            outData[1]?.video ||
            outData[1]?.value;

          if (vidVal && (vidVal.url || vidVal.path)) {
            const rawVideoUrl = vidVal.url || `${EAS_HOST}/file=${vidVal.path}`;
            const exact10sUrl = `/api/video10s?url=${encodeURIComponent(rawVideoUrl)}`;
            return {
              url: exact10sUrl,
              rawUrl: rawVideoUrl,
              path: vidVal.path,
              eventId: joinData.event_id,
              framesGenerated: frames,
              durationSeconds: 10.0,
              playbackRate: 1.0,
              continuous: true,
              engine: "Alibaba PAI EasyAnimate 12B (81 Frames Continues • 10.0s Exact • 1x)"
            };
          }

          throw new Error(outData[2] || "Sortie GPU sans fichier média");
        }
      }
    }

    throw new Error("Flux GPU fermé avant la fin du rendu");
  } finally {
    clearTimeout(totalGuardTimer);
  }
}

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }

  const startTime = Date.now();
  let body = {};

  try {
    if (req.method === "GET") {
      const urlObj = new URL(req.url);
      body = Object.fromEntries(urlObj.searchParams.entries());
    } else {
      body = await req.json();
    }
  } catch (_) {
    body = {};
  }

  const rawPrompt = (
    body.prompt ||
    "Un lion majestueux marche dans la savane africaine au lever du soleil, lumière dorée cinématique 4K"
  ).trim();
  const style =
    body.style ||
    "photorealistic 4k cinema movie shot, ultra detailed, natural fluid motion";
  const aspect = body.aspect || "16:9";
  const speed = body.speed || "fast";
  const mode = body.mode || "t2v";
  const isImage = mode === "image" || body.isImage === true || body.isImage === "true";

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => {
        try {
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                ...obj,
                elapsedMs: Date.now() - startTime
              }) + "\n"
            )
          );
        } catch (_) {}
      };

      const heartbeatTimer = setInterval(() => {
        send({ type: "heartbeat" });
      }, 2500);

      try {
        send({
          type: "init",
          message: "Analyse visuelle bilingue (FR → EN + ZH) de votre prompt et lancement des 81 frames continues..."
        });

        const { fullPrompt, negativePrompt, promptEn } =
          await buildBilingualVisualPrompt(rawPrompt, style);

        let startImagePath = body.startImagePath || null;
        if (!startImagePath && body.startImageBase64) {
          send({
            type: "uploading",
            message: "Transfert de l'image vers le cluster GPU dédié..."
          });
          startImagePath = await uploadBase64ImageToEAS(body.startImageBase64);
        }

        let lastError = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            if (attempt > 0) {
              send({
                type: "retry",
                attempt: attempt + 1,
                message: "Nouvelle tentative sur le cluster GPU pour votre prompt..."
              });
            }

            const result = await runContinuous81FramesAlibaba({
              fullPrompt,
              negativePrompt,
              aspect,
              speed: attempt > 0 ? "fast" : speed,
              isImage,
              startImagePath,
              attemptIndex: attempt,
              onEvent: (ev) => send(ev)
            });

            clearInterval(heartbeatTimer);
            send({
              type: "completed",
              ok: true,
              url: result.url,
              rawUrl: result.rawUrl,
              path: result.path,
              framesGenerated: result.framesGenerated || 81,
              continuous: true,
              durationSeconds: isImage ? null : 10.0,
              playbackRate: 1.0,
              engine: result.engine,
              promptOriginal: rawPrompt,
              promptEn,
              attempt: attempt + 1
            });
            controller.close();
            return;
          } catch (err) {
            lastError = err;
          }
        }

        throw lastError || new Error("Le cluster GPU n'a pas pu terminer la génération.");
      } catch (err) {
        clearInterval(heartbeatTimer);
        send({
          type: "error",
          ok: false,
          error: err.message || "Erreur lors de la génération GPU"
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "X-Accel-Buffering": "no"
    }
  });
}
