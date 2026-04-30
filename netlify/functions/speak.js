// netlify/functions/speak.js
// Uses eleven_turbo_v2 for 2-3x faster audio generation
// with no noticeable quality difference for spoken word content.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let text;
  try {
    ({ text } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!text || !text.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: "No text provided" }) };
  }

  const elevenKey = process.env.ELEVENLABS_KEY;
  const voiceId   = process.env.ELEVENLABS_VOICE_ID;

  if (!elevenKey || !voiceId) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing ElevenLabs credentials" }) };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": elevenKey,
        },
        body: JSON.stringify({
          text: text.trim(),
          // eleven_turbo_v2 is 2-3x faster than eleven_monolingual_v1
          // with virtually identical quality for spoken word content
          model_id: "eleven_turbo_v2",
          voice_settings: {
  stability: 0.75,
  similarity_boost: 0.85,
  style: 0.0,
  use_speaker_boost: true,
},
            stability: 0.6,
            similarity_boost: 0.85,
            style: 0.2,
            use_speaker_boost: true,
          },
          // Request optimized streaming audio format for faster delivery
          output_format: "mp3_44100_128",
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("ElevenLabs error:", err);
      return { statusCode: 502, body: JSON.stringify({ error: "Voice API error" }) };
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audio: base64Audio, contentType: "audio/mpeg" }),
    };

  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
