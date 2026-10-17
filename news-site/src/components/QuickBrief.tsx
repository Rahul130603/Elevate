"use client";

import { useEffect, useState } from "react";
import type { BriefEvent, StoryBrief } from "@/lib/brief";
import { getBriefCopy } from "@/lib/brief-copy";
import type { Locale } from "@/lib/i18n";

const labels: Record<Locale, [string, string]> = {
  en: ["Preparing your summary… You can read the original story below while you wait.", "Try again"],
  ta: ["சுருக்கம் தயாராகிறது… அதுவரை கீழே அசல் செய்தியைப் படிக்கலாம்.", "மீண்டும் முயற்சி"],
  hi: ["सारांश तैयार हो रहा है… नीचे मूल खबर पढ़ सकते हैं।", "फिर कोशिश करें"],
  bn: ["সারাংশ তৈরি হচ্ছে… নিচে মূল খবর পড়তে পারেন।", "আবার চেষ্টা করুন"],
  ml: ["സംഗ്രഹം തയ്യാറാക്കുന്നു… താഴെ യഥാർത്ഥ വാർത്ത വായിക്കാം.", "വീണ്ടും ശ്രമിക്കുക"],
  gu: ["સારાંશ તૈયાર થઈ રહ્યો છે… નીચે મૂળ સમાચાર વાંચી શકો છો.", "ફરી પ્રયાસ કરો"],
  mr: ["सारांश तयार होत आहे… खाली मूळ बातमी वाचू शकता.", "पुन्हा प्रयत्न करा"],
};

type Phase = "loading" | "streaming" | "done" | "error";

export function QuickBrief({ locale, story, signature }: { locale: Locale; story: string; signature: string }) {
  const [lines, setLines] = useState<string[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [reason, setReason] = useState<"quota" | "unavailable" | null>(null);
  const [attempt, setAttempt] = useState(0);
  const copy = getBriefCopy(locale);

  useEffect(() => {
    const controller = new AbortController();
    setLines([]);
    setPhase("loading");
    setReason(null);

    (async () => {
      try {
        const response = await fetch("/admin-news/api/brief?stream=1", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locale, story, signature }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`brief request failed (${response.status})`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handle = (event: BriefEvent) => {
          if (event.type === "line") {
            setLines((previous) => [...previous, event.text]);
            setPhase("streaming");
          } else {
            const brief: StoryBrief = event.brief;
            setLines(brief.lines);
            setReason(event.reason ?? null);
            setPhase("done");
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const frames = buffer.split("\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            if (!frame.trim()) continue;
            try {
              handle(JSON.parse(frame) as BriefEvent);
            } catch {
              // A truncated frame can only be a transport hiccup; the next one carries on.
            }
          }
        }
        if (!controller.signal.aborted) setPhase((current) => (current === "error" ? current : "done"));
      } catch {
        if (!controller.signal.aborted) setPhase("error");
      }
    })();

    return () => controller.abort();
  }, [locale, story, signature, attempt]);

  const hasLines = lines.length > 0;
  const unavailable = !hasLines && (phase === "done" || phase === "error");
  const settled = phase === "done" && hasLines;

  return (
    <section
      aria-labelledby="quick-brief-heading"
      aria-busy={phase === "loading" || phase === "streaming"}
      className="mt-8 rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-900 dark:bg-ink-900"
    >
      <h2 id="quick-brief-heading" className="headline text-xl font-bold">
        {unavailable ? copy.unavailable : copy.aiBrief}
      </h2>

      <div aria-live="polite">
        {hasLines ? (
          <ul className="mt-5 space-y-4">
            {lines.map((line, index) => (
              <li
                key={index}
                className={`text-base leading-7 ${
                  phase === "streaming" && index === lines.length - 1 ? "animate-pulse motion-reduce:animate-none" : ""
                }`}
              >
                {line}
              </li>
            ))}
            {phase === "streaming" ? (
              <li aria-hidden="true" className="text-base leading-7 text-ink-400 dark:text-ink-500">
                …
              </li>
            ) : null}
          </ul>
        ) : unavailable ? (
          <div className="mt-5">
            <p className="text-sm">{reason === "quota" ? copy.quotaBody : copy.unavailableBody}</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="mt-5 rounded-lg border border-brand-600 px-5 py-2.5 text-sm font-semibold"
            >
              {labels[locale][1]}
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <p role="status" className="text-sm">
              {labels[locale][0]}
            </p>
            <div className="mt-4 space-y-3" aria-hidden="true">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-4 animate-pulse rounded bg-brand-100 motion-reduce:animate-none dark:bg-ink-800"
                  style={{ width: `${92 - row * 14}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {settled ? (
        <p className="mt-5 text-xs text-ink-500 dark:text-ink-400">
          {copy.aiLabel}. {copy.disclaimer}
        </p>
      ) : null}
    </section>
  );
}
