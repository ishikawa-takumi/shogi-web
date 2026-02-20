import type { Plugin } from "vite";
import { spawn } from "node:child_process";

interface QARequestBody {
  question: string;
  history: { role: string; content: string }[];
  boardContext?: {
    sfen: string;
    openingName: string;
    sideToMove: "sente" | "gote";
    tags: readonly string[];
    moveIndex: number;
    expectedMovesUsi: readonly string[];
    teachingComment: string | null;
  } | null;
}

export default function geminiQaPlugin(): Plugin {
  return {
    name: "gemini-qa",
    configureServer(server) {
      server.middlewares.use("/api/qa", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk: Buffer) => {
          body += chunk.toString();
        });

        req.on("end", () => {
          let parsed: QARequestBody;
          try {
            parsed = JSON.parse(body) as QARequestBody;
          } catch {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Invalid JSON" }));
            return;
          }

          const { question, history, boardContext } = parsed;

          const systemLines = [
            "あなたは将棋の指導者です。定跡、手筋、戦略について日本語で丁寧に回答してください。",
            "回答は簡潔に、要点を絞ってください。マークダウンは使わず、プレーンテキストで答えてください。",
          ];

          if (boardContext) {
            systemLines.push(
              "",
              "【現在の盤面情報】",
              `SFEN: ${boardContext.sfen}`,
              `定跡: ${boardContext.openingName}`,
              `手番: ${boardContext.sideToMove === "sente" ? "先手" : "後手"}`,
              `手数: ${boardContext.moveIndex}`,
              `正解手: ${boardContext.expectedMovesUsi.join(", ")}`,
            );
            if (boardContext.tags.length > 0) {
              systemLines.push(`タグ: ${boardContext.tags.join(", ")}`);
            }
            if (boardContext.teachingComment) {
              systemLines.push(`解説: ${boardContext.teachingComment}`);
            }
          }

          const historyText = history
            .map((msg) => `${msg.role === "user" ? "生徒" : "指導者"}: ${msg.content}`)
            .join("\n");

          const prompt = [
            systemLines.join("\n"),
            "",
            historyText ? `【会話履歴】\n${historyText}\n` : "",
            `生徒: ${question}`,
            "",
            "指導者:",
          ]
            .filter(Boolean)
            .join("\n");

          const child = spawn("gemini", [], {
            stdio: ["pipe", "pipe", "pipe"],
            timeout: 60_000,
          });

          let stdout = "";
          let stderr = "";
          child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
          child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });

          child.on("close", (code) => {
            if (code !== 0) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: stderr || `gemini exited with code ${code}` }));
              return;
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ answer: stdout.trim() }));
          });

          child.stdin.write(prompt);
          child.stdin.end();
        });
      });
    },
  };
}
