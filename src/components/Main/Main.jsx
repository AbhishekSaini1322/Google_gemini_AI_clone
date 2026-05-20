import { useCallback, useContext, useEffect, useRef, useState } from "react"
import "./Main.css"
import { assets } from '../../assets/assets'
import { Context } from '../../context/Context'

const getSpeechRecognition = () => {
  if (typeof window === "undefined") return null
  return window.SpeechRecognition || window.webkitSpeechRecognition || null
}

const Main = () => {
  

  const {
    onSent,
    recentPrompt,
    recentImagePreviews,
    showResult,
    loading,
    resultData,
    setInput,
    input,
    attachments,
    addAttachments,
    removeAttachment,
  } = useContext(Context);

  const fileInputRef = useRef(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef(null)
  /** Text in the box when this mic session started */
  const speechBaseRef = useRef("")
  /** True when user clicked mic to stop (so onend does not fight abort) */
  const userStoppedRef = useRef(false)
  /** Synchronous mirror: recognition session active */
  const listeningRef = useRef(false)
  const inputRef = useRef("")

  useEffect(() => {
    inputRef.current = input
  }, [input])

  useEffect(() => {
    return () => {
      userStoppedRef.current = true
      const rec = recognitionRef.current
      if (rec) {
        try {
          rec.onresult = null
          rec.onerror = null
          rec.onend = null
          rec.abort()
        } catch {
          /* ignore */
        }
        recognitionRef.current = null
      }
      listeningRef.current = false
    }
  }, [])

  const toggleMic = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition()
    if (!SpeechRecognition) {
      window.alert(
        "Voice typing needs the Speech Recognition API. Use Chrome or Edge (desktop)."
      )
      return
    }

    if (listeningRef.current || recognitionRef.current) {
      userStoppedRef.current = true
      try {
        recognitionRef.current?.abort()
      } catch {
        /* ignore */
      }
      recognitionRef.current = null
      listeningRef.current = false
      setIsListening(false)
      return
    }

    const rec = new SpeechRecognition()
    rec.lang = navigator.language || "en-US"
    rec.continuous = true
    rec.interimResults = true

    userStoppedRef.current = false
    speechBaseRef.current = inputRef.current

    rec.onresult = (event) => {
      let spoken = ""
      for (let i = 0; i < event.results.length; i++) {
        spoken += event.results[i]?.[0]?.transcript ?? ""
      }
      setInput(speechBaseRef.current + spoken)
    }

    rec.onerror = (event) => {
      if (event.error === "aborted") return
      if (event.error === "no-speech") {
        return
      }
      recognitionRef.current = null
      listeningRef.current = false
      setIsListening(false)

      const msg =
        event.error === "not-allowed"
          ? "Mic access blocked. Allow the microphone for this site in browser settings."
          : event.error === "audio-capture"
            ? "No microphone found or capture failed. Plug in / enable a mic and try again."
            : event.error === "network"
              ? "Speech service network error — check your internet connection."
              : `Speech error: ${event.error}`
      console.warn("[SpeechRecognition]", event.error)
      window.alert(msg)
    }

    rec.onend = () => {
      if (userStoppedRef.current) {
        recognitionRef.current = null
        listeningRef.current = false
        setIsListening(false)
        return
      }
      const instance = recognitionRef.current
      if (!instance) return
      speechBaseRef.current = inputRef.current
      window.setTimeout(() => {
        if (userStoppedRef.current || recognitionRef.current !== instance) return
        try {
          instance.start()
        } catch {
          recognitionRef.current = null
          listeningRef.current = false
          setIsListening(false)
        }
      }, 0)
    }

    recognitionRef.current = rec
    listeningRef.current = true
    setIsListening(true)
    try {
      rec.start()
    } catch (err) {
      console.warn(err)
      recognitionRef.current = null
      listeningRef.current = false
      setIsListening(false)
      window.alert(
        "Could not start speech recognition. Use Chrome/Edge, allow the microphone, and click the mic again."
      )
    }
  }, [setInput])

  const handleSend = () => {
    onSent();
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files?.length) void addAttachments(files);
    e.target.value = "";
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className='main'>
      <div className='nav'>
        <p>Gemini</p>
        <img src={assets.user_icon} alt='' loading='lazy'/>
      </div>

      <div className='main-container'>
        {!showResult ? (
          <>
            <div className='greet'>
                <p><span>Hello, Dev.</span></p>
                <p>How can I help you today ?</p>
            </div>
            <div className='cards'>
                <div className='card' onClick={() => onSent("Suggest beautiful places to see on an upcoming road trip")} role='presentation'>
                   <p>Suggest beautiful places to see on an upcoming road trip</p> 
                   <img src={assets.compass_icon} alt='' loading='lazy'/>
                </div>

                <div className='card' onClick={() => onSent("Briefly summarize this concept: urban planning")} role='presentation'>
                   <p>Briefiy summarize this concept: urban planning</p> 
                   <img src={assets.bulb_icon} alt='' loading='lazy'/>
                </div>

                <div className='card' onClick={() => onSent("Brainstorm team bonding activities for our work retreat")} role='presentation'>
                   <p>Brainstrom team bonding activities for our work retreat</p> 
                   <img src={assets.message_icon} alt='' loading='lazy'/>
                </div>

                <div className='card' onClick={() => onSent("Improve the readability of the following code")} role='presentation'>
                   <p>Improve the readability of the following code</p> 
                   <img src={assets.code_icon} alt='' loading='lazy'/>
                </div>
            </div>
          </>
        ) : (
          <div className='result'>
            <div className='result-prompt'>
              {recentImagePreviews?.length > 0 ? (
                <div className='result-prompt-images'>
                  {recentImagePreviews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=''
                      className='result-thumb'
                    />
                  ))}
                </div>
              ) : null}
              <div className='result-prompt-row'>
                <img src={assets.user_icon} alt='' />
                <p>{recentPrompt}</p>
              </div>
            </div>
            <div className='result-response'>
              <img src={assets.gemini_icon} alt='' />
              <div className='result-text'>
                {loading && !resultData ? (
                  <p className='loading'>Thinking...</p>
                ) : null}
                {resultData ? (
                  <p className='markdown-plain'>{resultData}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className='main-bottom'>
            <input
              ref={fileInputRef}
              type='file'
              accept='image/png,image/jpeg,image/jpg,image/webp,image/gif'
              multiple
              className='file-input-hidden'
              aria-hidden='true'
              tabIndex={-1}
              onChange={handleFileChange}
            />
            {attachments.length > 0 ? (
              <div className='attachment-strip' role='list'>
                {attachments.map((a) => (
                  <div key={a.id} className='attachment-chip' role='listitem'>
                    <img src={a.previewUrl} alt='' />
                    <button
                      type='button'
                      className='attachment-remove'
                      aria-label='Remove image'
                      onClick={() => removeAttachment(a.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className='search-box'>
                <input
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  value={input}
                  type='text'
                  placeholder={
                    attachments.length
                      ? "Ask about your image(s)…"
                      : "Enter a prompt here"
                  }
                />
                <div>
                    <img
                      src={assets.gallery_icon}
                      alt=''
                      title='Upload images'
                      role='presentation'
                      onClick={handleGalleryClick}
                    />
                    <img
                      src={assets.mic_icon}
                      alt={isListening ? "Stop listening" : "Speak to type"}
                      title={isListening ? "Click to stop" : "Click to speak — text appears in the box"}
                      className={isListening ? "mic-active" : ""}
                      onClick={toggleMic}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          toggleMic()
                        }
                      }}
                    />
                    <img onClick={handleSend} src={assets.send_icon} alt='Send' role='presentation'/>
                </div>
            </div>
            <p className='bottom-info'>
            Gemini may display inaccurate info, including about people, so double-check its responses. Your privacy and Gemini Apps
            </p>
        </div>
      </div>

    </div>
  )
}

export default Main