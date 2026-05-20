import { useContext, useState } from "react";
import "./Sidebar.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/Context";

const Sidebar = () => {
  const [extended, setExtended] = useState(false);
  const {
    startNewChat,
    savedChats,
    openChat,
    activeSavedChatId,
  } = useContext(Context);

  function changeHandler() {
    setExtended(!extended);
  }

  function handleNewChat() {
    startNewChat();
  }

  function handleOpenSaved(id) {
    openChat(id);
  }

  return (
    <div className="sidebar">
      <div className="top">
        <img
          onClick={changeHandler}
          className="menu"
          src={assets.menu_icon}
          alt=""
        />
        <div
          className="new-chat"
          onClick={handleNewChat}
          role="button"
          tabIndex={0}
          title="New chat"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleNewChat();
            }
          }}
        >
          <img src={assets.plus_icon} alt="" />
          {extended ? <p>New Chat</p> : null}
        </div>
        {extended ? (
          <div className="recent">
            <p className="recent-title">Recent</p>
            <div className="recent-list">
              {savedChats.length === 0 ? (
                <p className="recent-empty">No saved chats yet</p>
              ) : (
                savedChats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`recent-entry ${
                      chat.id === activeSavedChatId ? "recent-entry-active" : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    title={chat.userPrompt}
                    onClick={() => handleOpenSaved(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenSaved(chat.id);
                      }
                    }}
                  >
                    <img src={assets.message_icon} alt="" />
                    <p>{chat.title}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </div>

      <div className="bottom">
        <div className="bottom-item recent-entry">
          <img src={assets.question_icon} alt="" />
          {extended ? <p>Help</p> : null}
        </div>

        <div className="bottom-item recent-entry">
          <img src={assets.history_icon} alt="" />
          {extended ? <p>Activity</p> : null}
        </div>

        <div className="bottom-item recent-entry">
          <img src={assets.setting_icon} alt="" />
          {extended ? <p>Setting</p> : null}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
