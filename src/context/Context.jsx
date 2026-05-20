import { createContext, useCallback, useMemo, useState } from "react";
import streamReply from "../config/gemini";
import {
  readImageAsAttachment,
  MAX_ATTACHMENTS,
} from "../utils/imageAttachment";

export const Context = createContext();

function newChatId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function truncateTitle(text, max = 42) {
  const t = (text || "").trim();
  if (t.length <= max) return t || "New chat";
  return `${t.slice(0, max)}…`;
}

// eslint-disable-next-line react/prop-types -- app-internal provider
const ContextProvider = ({ children }) => {
  const [input, setInput] = useState("");
  const [recentPrompt, setRecentPrompt] = useState("");
  const [recentImagePreviews, setRecentImagePreviews] = useState([]);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);

  const [resultData, setResultData] = useState("");

  /** Saved when starting a new chat; reopened from sidebar */
  const [savedChats, setSavedChats] = useState([]);
  /** Non-null when the main pane shows a restored history item (don't duplicate on New Chat) */
  const [activeSavedChatId, setActiveSavedChatId] = useState(null);

  /** @type {{ id: string, mimeType: string, data: string, previewUrl: string }[]} */
  const [attachments, setAttachments] = useState([]);

  const removeAttachment = useCallback((id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addAttachments = useCallback(async (fileList) => {
    const files = Array.from(fileList || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length === 0) {
      window.alert("Please choose image files (PNG, JPEG, WebP, or GIF).");
      return;
    }

    const newItems = [];
    for (const file of files) {
      try {
        newItems.push(await readImageAsAttachment(file));
      } catch (err) {
        window.alert(
          `${file.name}: ${err.message || "Could not add this file."}`
        );
      }
    }
    if (newItems.length === 0) return;

    setAttachments((prev) => {
      const room = Math.max(0, MAX_ATTACHMENTS - prev.length);
      if (room === 0) {
        window.alert(
          `You can attach up to ${MAX_ATTACHMENTS} images at once. Remove one to add more.`
        );
        return prev;
      }
      const toMerge = newItems.slice(0, room);
      if (newItems.length > room) {
        window.alert(
          `Only ${room} more image(s) were added (max ${MAX_ATTACHMENTS} total).`
        );
      }
      return [...prev, ...toMerge];
    });
  }, []);

  const openChat = useCallback(
    (id) => {
      const chat = savedChats.find((c) => c.id === id);
      if (!chat) return;
      setInput("");
      setAttachments([]);
      setRecentPrompt(chat.userPrompt);
      setRecentImagePreviews([...chat.imagePreviews]);
      setResultData(chat.assistantText);
      setShowResult(true);
      setLoading(false);
      setActiveSavedChatId(chat.id);
    },
    [savedChats]
  );

  const startNewChat = useCallback(() => {
    const hasConversation =
      showResult &&
      (recentPrompt.trim() !== "" || recentImagePreviews.length > 0);

    const isLiveSession = activeSavedChatId === null;

    if (hasConversation && isLiveSession) {
      const entry = {
        id: newChatId(),
        title: truncateTitle(
          recentPrompt.trim() ||
            (recentImagePreviews.length ? "Image" : "New chat")
        ),
        userPrompt: recentPrompt.trim() || "Describe this image",
        imagePreviews: [...recentImagePreviews],
        assistantText: resultData,
        createdAt: Date.now(),
      };
      setSavedChats((prev) => [entry, ...prev]);
    }

    setInput("");
    setAttachments([]);
    setShowResult(false);
    setLoading(false);
    setResultData("");
    setRecentPrompt("");
    setRecentImagePreviews([]);
    setActiveSavedChatId(null);
  }, [
    showResult,
    recentPrompt,
    recentImagePreviews,
    resultData,
    activeSavedChatId,
  ]);

  const onSent = useCallback(
    async (optionalPrompt) => {
      const text = (optionalPrompt ?? input).trim();
      const imagePayload = attachments.map(({ mimeType, data }) => ({
        mimeType,
        data,
      }));

      if (!text && imagePayload.length === 0) return;

      setActiveSavedChatId(null);

      const previews = attachments.map((a) => a.previewUrl);
      setRecentPrompt(text || "Describe this image");
      setRecentImagePreviews(previews);
      setShowResult(true);
      setLoading(true);
      setResultData("");

      setAttachments([]);
      setInput("");

      let sawStreamText = false;
      try {
        const finalText = await streamReply(
          text,
          (partial) => {
            if (partial) {
              setResultData(partial);
              if (!sawStreamText) {
                sawStreamText = true;
                setLoading(false);
              }
            }
          },
          imagePayload
        );
        if (!finalText?.trim() && !sawStreamText) {
          setResultData(
            "No reply was returned. Try a different prompt or check API quota."
          );
        }
      } catch (err) {
        const message =
          err?.message || "Request failed. Check your API key and network.";
        setResultData(`Error: ${message}`);
      } finally {
        setLoading(false);
      }
    },
    [input, attachments]
  );

  const contextValue = useMemo(
    () => ({
      savedChats,
      activeSavedChatId,
      openChat,
      onSent,
      setRecentPrompt,
      recentPrompt,
      recentImagePreviews,
      showResult,
      loading,
      resultData,
      input,
      setInput,
      attachments,
      addAttachments,
      removeAttachment,
      startNewChat,
    }),
    [
      savedChats,
      activeSavedChatId,
      openChat,
      onSent,
      recentPrompt,
      recentImagePreviews,
      showResult,
      loading,
      resultData,
      input,
      attachments,
      addAttachments,
      removeAttachment,
      startNewChat,
    ]
  );

  return (
    <Context.Provider value={contextValue}>{children}</Context.Provider>
  );
};

export default ContextProvider;
