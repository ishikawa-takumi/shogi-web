import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PromptNode } from "../../types/index.ts";

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  readonly prompt: PromptNode;
};

export function QAChat({ prompt }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function handleClear() {
    setMessages([]);
    setInput("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    const userMessage: Message = { role: "user", content: question };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const boardContext = {
        sfen: prompt.sfen,
        openingName: prompt.openingNameJa,
        sideToMove: prompt.sideToMove,
        tags: prompt.tags,
        moveIndex: prompt.moveIndex,
      };

      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history: messages, boardContext }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const msg = (body as { error?: string } | null)?.error ?? `HTTP ${res.status}`;
        setMessages([...updated, { role: "assistant", content: `エラー: ${msg}` }]);
        return;
      }

      const data = (await res.json()) as { answer: string };
      setMessages([...updated, { role: "assistant", content: data.answer }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "通信エラー";
      setMessages([...updated, { role: "assistant", content: `エラー: ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-500 hover:bg-stone-50 transition-colors"
      >
        この局面について質問する...
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2">
        <span className="text-sm font-medium text-stone-700">質問</span>
        <div className="flex gap-2">
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              クリア
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="max-h-60 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !loading && (
          <p className="py-4 text-center text-xs text-stone-400">
            盤面情報が自動で送信されます。
          </p>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-stone-800 text-white"
                  : "bg-stone-50 text-stone-800 border border-stone-100"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 rounded-xl bg-stone-50 px-3 py-2.5 border border-stone-100">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400 [animation-delay:300ms]" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-stone-100 px-4 py-2.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="質問を入力..."
          disabled={loading}
          className="flex-1 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:border-stone-300 focus:outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-40 disabled:cursor-default transition-colors"
        >
          送信
        </button>
      </form>
    </div>
  );
}
