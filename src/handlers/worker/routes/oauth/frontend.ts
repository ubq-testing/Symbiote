export function renderOAuthResultPage({
    title,
    status,
    message,
    detail,
  }: {
    title: string;
    status: "success" | "error";
    message: string;
    detail?: string;
  }) {
    const accent = status === "success" ? "#0f5132" : "#842029";
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .card {
      border: 1px solid ${accent};
      background: #161b22;
      padding: 2rem;
      border-radius: 12px;
      max-width: 520px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
    }
    h1 {
      color: ${accent};
      margin-top: 0;
    }
    p {
      margin: 0.5rem 0 0;
      line-height: 1.6;
    }
    .detail {
      margin-top: 1rem;
      padding: 1rem;
      background: #0d1117;
      border-radius: 8px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    ${detail ? `<div class="detail">${detail}</div>` : ""}
  </div>
</body>
</html>`;
  }