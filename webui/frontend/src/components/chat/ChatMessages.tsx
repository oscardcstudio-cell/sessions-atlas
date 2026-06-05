import { useRef, useEffect } from "react";
import type { AllMessage } from "../../types";
import {
  isChatMessage,
  isSystemMessage,
  isToolMessage,
  isToolResultMessage,
  isPlanMessage,
  isThinkingMessage,
  isTodoMessage,
} from "../../types";
import {
  ChatMessageComponent,
  SystemMessageComponent,
  ToolMessageComponent,
  ToolResultMessageComponent,
  PlanMessageComponent,
  ThinkingMessageComponent,
  TodoMessageComponent,
  LoadingComponent,
} from "../MessageComponents";

interface ChatMessagesProps {
  messages: AllMessage[];
  isLoading: boolean;
}

interface ResultStats {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Extract model from init system message
  const modelName = (() => {
    for (const m of messages) {
      if (m.type === "system" && "subtype" in m && m.subtype === "init") {
        return (m as unknown as { model: string }).model;
      }
    }
    return null;
  })();

  // Map assistant message timestamp → result stats
  const resultMap = new Map<number, ResultStats>();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.type === "result" && "usage" in msg) {
      for (let j = i - 1; j >= 0; j--) {
        const prev = messages[j];
        if (isChatMessage(prev) && prev.role === "assistant") {
          const r = msg as unknown as { usage: { input_tokens: number; output_tokens: number }; total_cost_usd: number };
          resultMap.set(prev.timestamp, {
            inputTokens: r.usage.input_tokens,
            outputTokens: r.usage.output_tokens,
            costUsd: r.total_cost_usd,
          });
          break;
        }
      }
    }
  }

  // Filter: hide init and result messages (their data appears in message footers)
  const visible = messages.filter((m) => {
    if (m.type === "system" && "subtype" in m && m.subtype === "init") return false;
    if (m.type === "result") return false;
    return true;
  });

  const renderMessage = (message: AllMessage, index: number) => {
    const key = `${message.timestamp}-${index}`;
    if (isChatMessage(message)) {
      const stats = message.role === "assistant" ? resultMap.get(message.timestamp) ?? null : null;
      return <ChatMessageComponent key={key} message={message} modelName={modelName} stats={stats} />;
    } else if (isSystemMessage(message)) {
      return <SystemMessageComponent key={key} message={message} />;
    } else if (isToolMessage(message)) {
      return <ToolMessageComponent key={key} message={message} />;
    } else if (isToolResultMessage(message)) {
      return <ToolResultMessageComponent key={key} message={message} />;
    } else if (isPlanMessage(message)) {
      return <PlanMessageComponent key={key} message={message} />;
    } else if (isThinkingMessage(message)) {
      return <ThinkingMessageComponent key={key} message={message} />;
    } else if (isTodoMessage(message)) {
      return <TodoMessageComponent key={key} message={message} />;
    }
    return null;
  };

  return (
    <div
      ref={messagesContainerRef}
      className="flex-1 overflow-y-auto p-4 sm:p-8 mb-3 flex flex-col"
    >
      {visible.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex-1" aria-hidden="true" />
          {visible.map(renderMessage)}
          {isLoading && <LoadingComponent />}
          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center text-center">
      <div>
        <div className="text-5xl mb-5 opacity-30">✱</div>
        <p className="text-base font-medium text-[#6a6a6a]">Start a conversation with Claude</p>
        <p className="text-sm mt-1.5 text-[#555]">Type your message below to begin</p>
      </div>
    </div>
  );
}
