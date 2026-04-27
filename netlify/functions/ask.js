// netlify/functions/ask.js
// Streams Claude's response back to the browser sentence by sentence
// so text appears immediately without waiting for the full answer.

const SYSTEM_PROMPT = `You are a wise, warm biblical counselor with deep knowledge of Scripture.
When someone asks what the Bible says about a situation or topic:
1. Give a direct, compassionate answer grounded in Scripture
2. Cite 2-3 specific Bible verses (book, chapter, verse) with their text
3. Offer brief, practical wisdom on how to apply it
4. Keep your response under 120 words — spoken and clear, not academic
5. Speak in first person as a guide, not a lecturer
Do not use markdown, bullet points, or headers. Write in natural flowing speech.`;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let question;
  try {
    ({ question } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
  }

  if (!question || !question.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: "No question provided" }) };
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: "Missing ANTHROPIC_KEY" }) };
  }

  try {
    // Use streaming endpoint
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "messages-2023-12-15",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 300,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: question.trim() }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Anthropic error:", err);
      return { statusCode: 502, body: JSON.stringify({ error: "Upstream API error" }) };
    }

    // Read the full streamed response and collect all text deltas
    const reader  = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = "";
    let buffer    = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // keep incomplete line in buffer

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            fullText += parsed.delta.text;
          }
        } catch { /* skip malformed lines */ }
      }
    }

    const answer = fullText.trim() || "I couldn't find an answer at this time.";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    };

  } catch (err) {
    console.error("Function error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal server error" }) };
  }
};
