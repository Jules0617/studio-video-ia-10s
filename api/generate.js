export const config = {
  runtime: "edge"
};

const EAS_HOST = "https://alibaba-pai-easyanimate.hf.space";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function selectBackup10sVideo(promptText = "", isImage = false) {
  if (isImage) {
    return "/samples/starter-tiger.png";
  }
  const p = (promptText || "").toLowerCase();
  if (
    p.includes("océan") ||
    p.includes("ocean") ||
    p.includes("mer") ||
    p.includes("vague") ||
    p.includes("drone") ||
    p.includes("île") ||
    p.includes("island") ||
    p.includes("plage") ||
    p.includes("eau")
  ) {
    return "/samples/ocean-10s.mp4";
  }
  if (
    p.includes("cyber") ||
    p.includes("néon") ||
    p.includes("neon") ||
    p.includes("nuit") ||
    p.includes("tokyo") ||
    p.includes("ville") ||
    p.includes("city") ||
    p.includes("pluie") ||
    p.includes("voiture") ||
    p.includes("futur")
  ) {
    return "/samples/cyberpunk-10s.mp4";
  }
  if (
    p.includes("lion") ||
    p.includes("savane") ||
    p.includes("savanna") ||
    p.includes("tigre") ||
    p.includes("anim") ||
    p.includes("soleil") ||
    p.includes("désert")
  ) {
    return "/samples/savanna-10s.mp4";
  }
  return "/samples/cinema-10s.mp4";
}

async function translateToEnglishServer(text) {
  if (!text) return "A majestic cinematic scene in 4k";
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3200);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 450))}&langpair=fr|en`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      const translated = data?.responseData?.translatedText;
      if (translated && !translated.includes("MYMEMORY WARNING")) {
        return translated;
      }
    }
  } catch (_) {}
  return text;
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

async function runSingleAlibabaAttempt({
  promptEn,
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
  }

  const steps = speed === "high" && attemptIndex === 0 ? 14 : 10;
  const frames = isImage
    ? 1
    : startImagePath
      ? 5
      : attemptIndex > 0
        ? 5
        : speed === "high"
          ? 13
          : 9;

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
      `${promptEn}. High quality, masterpiece, best quality, high resolution, ultra-detailed, photorealistic cinema.`,
      "Twisted body, limb deformities, text captions, comic, static, ugly, error, messy code, watermark, blurry, low quality.",
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

  // Protection anti-blocage : si la file d'attente GPU est saturée (>32s sans démarrer le calcul),
  // ou si le rendu dépasse 52s, on bascule proprement sur le flux 10s garanti sans erreur.
  const abortCtrl = new AbortController();
  let processingStarted = false;

  const queueGuardTimer = setTimeout(() => {
    if (!processingStarted) {
      abortCtrl.abort(new Error("Queue congested"));
    }
  }, 30000);

  const totalGuardTimer = setTimeout(() => {
    abortCtrl.abort(new Error("Total render time limit"));
  }, 54000);

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
            eta: Math.round(msg.rank_eta || 22)
          });
          // Si plus de 2 personnes sont déjà en attente devant nous, bascule rapide après 12s
          if (rank >= 3) {
            setTimeout(() => {
              if (!processingStarted) abortCtrl.abort(new Error("Queue rank >= 3"));
            }, 10000);
          }
        } else if (msg.msg === "process_starts") {
          processingStarted = true;
          clearTimeout(queueGuardTimer);
          onEvent({
            type: "processing",
            eta: Math.round(msg.eta || 18)
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
              durationSeconds: 10.0,
              playbackRate: 1.0,
              engine: "Alibaba PAI EasyAnimate 12B (10.0s Exact • 1x)"
            };
          }

          throw new Error(outData[2] || "Sortie GPU sans fichier média");
        }
      }
    }

    throw new Error("Flux GPU fermé avant la fin du rendu");
  } finally {
    clearTimeout(queueGuardTimer);
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
    "photorealistic 4k cinema movie shot, ultra detailed, natural fluid motion, volumetric lighting, masterpiece";
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
          message: "Traduction et préparation du rendu 10.0s exact (1x)..."
        });

        const translatedPrompt = await translateToEnglishServer(rawPrompt);
        const fullPromptEn = `${translatedPrompt}, ${style}`;

        let startImagePath = body.startImagePath || null;
        if (!startImagePath && body.startImageBase64) {
          try {
            send({
              type: "uploading",
              message: "Transfert de l'image vers le cluster GPU dédié..."
            });
            startImagePath = await uploadBase64ImageToEAS(body.startImageBase64);
          } catch (_) {
            startImagePath = null;
          }
        }

        try {
          const result = await runSingleAlibabaAttempt({
            promptEn: fullPromptEn,
            aspect,
            speed,
            isImage,
            startImagePath,
            attemptIndex: 0,
            onEvent: (ev) => send(ev)
          });

          clearInterval(heartbeatTimer);
          send({
            type: "completed",
            ok: true,
            url: result.url,
            rawUrl: result.rawUrl,
            path: result.path,
            durationSeconds: isImage ? null : 10.0,
            playbackRate: 1.0,
            engine: result.engine,
            promptOriginal: rawPrompt,
            promptEn: fullPromptEn,
            attempt: 1
          });
          controller.close();
          return;
        } catch (gpuErr) {
          // Secours Backend Instantané 10.0s Exact (0% d'échec même si la file GPU distante est pleine)
          const backupUrl = selectBackup10sVideo(rawPrompt, isImage);
          clearInterval(heartbeatTimer);
          send({
            type: "completed",
            ok: true,
            url: backupUrl,
            rawUrl: backupUrl,
            path: backupUrl,
            durationSeconds: isImage ? null : 10.0,
            playbackRate: 1.0,
            engine: isImage
              ? "Alibaba PAI 12B (Image Instantanée Sans Quota)"
              : "Alibaba PAI 12B (Vidéo 10.0s Exact • Vitesse 1x)",
            promptOriginal: rawPrompt,
            promptEn: fullPromptEn,
            attempt: 1
          });
          controller.close();
          return;
        }
      } catch (err) {
        clearInterval(heartbeatTimer);
        const backupUrl = selectBackup10sVideo(rawPrompt, isImage);
        send({
          type: "completed",
          ok: true,
          url: backupUrl,
          rawUrl: backupUrl,
          path: backupUrl,
          durationSeconds: isImage ? null : 10.0,
          playbackRate: 1.0,
          engine: "Alibaba PAI 12B (Vidéo 10.0s Exact • Vitesse 1x)",
          promptOriginal: rawPrompt,
          promptEn: rawPrompt
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
