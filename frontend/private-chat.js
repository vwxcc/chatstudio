(() => {
    "use strict";

    const API = {
        chat: id => "/api/chats/" + encodeURIComponent(id),
        requests: "/api/requests",
        requestStatus: id => "/api/requests/" + encodeURIComponent(id),
        file: id => "/api/files/" + encodeURIComponent(id)
    };

    const state = {
        chatId: null,
        chat: null,
        busy: false,
        files: []
    };

    const esc = value => String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    function addStyles() {
        if (document.getElementById("chatstudio-private-chat-styles")) return;

        const style = document.createElement("style");
        style.id = "chatstudio-private-chat-styles";
        style.textContent = [
            ".cs-private-overlay{position:fixed;inset:0;z-index:500;background:var(--bg,#f5f1ea);display:flex;flex-direction:column;}",
            ".cs-private-head{height:64px;flex:0 0 64px;display:flex;align-items:center;gap:12px;padding:0 22px;border-bottom:1px solid var(--border,#ddd6cb);background:rgba(250,247,241,.94);backdrop-filter:blur(12px);}",
            ".cs-private-back,.cs-private-close{width:38px;height:38px;border:1px solid var(--border,#ddd6cb);border-radius:11px;background:var(--card,#fffdf9);color:var(--text,#25231f);cursor:pointer;font-size:18px;}",
            ".cs-private-title{min-width:0;flex:1;font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".cs-private-model{color:var(--muted,#817a70);font-size:11px;white-space:nowrap;}",
            ".cs-private-body{width:min(900px,calc(100% - 28px));margin:0 auto;flex:1;min-height:0;overflow-y:auto;padding:28px 0 18px;}",
            ".cs-private-message{display:flex;margin:0 0 22px;}",
            ".cs-private-message.user{justify-content:flex-end;}",
            ".cs-private-bubble{max-width:min(760px,88%);padding:13px 15px;border-radius:16px;background:var(--card,#fffdf9);border:1px solid var(--border,#ddd6cb);box-shadow:var(--shadow,0 10px 40px rgba(54,47,38,.07));white-space:pre-wrap;line-height:1.62;font-size:14px;}",
            ".cs-private-message.user .cs-private-bubble{background:var(--accent,#25231f);color:#fff;border-color:var(--accent,#25231f);}",
            ".cs-private-role{font-size:10px;color:var(--muted,#817a70);margin:0 0 5px 3px;text-transform:uppercase;letter-spacing:.04em;}",
            ".cs-private-message.user .cs-private-role{text-align:right;color:var(--muted,#817a70);}",
            ".cs-private-files{display:flex;flex-wrap:wrap;gap:7px;margin-top:9px;}",
            ".cs-private-file{display:inline-flex;align-items:center;gap:6px;padding:6px 8px;border:1px solid var(--border,#ddd6cb);border-radius:8px;background:var(--card-soft,#faf7f1);font-size:11px;color:inherit;text-decoration:none;}",
            ".cs-private-compose{flex:0 0 auto;border-top:1px solid var(--border,#ddd6cb);background:rgba(250,247,241,.96);padding:12px 16px 16px;}",
            ".cs-private-compose-inner{width:min(900px,100%);margin:0 auto;border:1px solid var(--border,#ddd6cb);border-radius:16px;background:var(--card,#fffdf9);overflow:hidden;}",
            ".cs-private-input{display:block;width:100%;min-height:76px;max-height:190px;resize:vertical;border:0;outline:0;background:transparent;padding:14px 15px;color:var(--text,#25231f);font-size:14px;line-height:1.55;}",
            ".cs-private-tools{display:flex;align-items:center;gap:8px;padding:8px;border-top:1px solid var(--border,#ddd6cb);}",
            ".cs-private-attach{width:34px;height:34px;border:1px solid var(--border,#ddd6cb);border-radius:9px;background:var(--card-soft,#faf7f1);cursor:pointer;}",
            ".cs-private-send{margin-left:auto;min-height:34px;padding:0 14px;border:0;border-radius:9px;background:var(--accent,#25231f);color:#fff;font-size:12px;font-weight:650;cursor:pointer;}",
            ".cs-private-send:disabled{opacity:.45;cursor:default;}",
            ".cs-private-selected{display:none;gap:6px;flex-wrap:wrap;padding:0 9px 8px;}",
            ".cs-private-selected.visible{display:flex;}",
            ".cs-private-chip{font-size:10px;padding:5px 7px;border-radius:7px;background:var(--bg-soft,#eee9e1);border:1px solid var(--border,#ddd6cb);}",
            ".cs-private-status{font-size:11px;color:var(--muted,#817a70);padding:0 4px;}",
            "@media(max-width:700px){.cs-private-head{padding:0 12px}.cs-private-model{display:none}.cs-private-body{width:calc(100% - 18px);padding-top:18px}.cs-private-bubble{max-width:94%}}"
        ].join("");
        document.head.appendChild(style);
    }

    function close() {
        const overlay = document.getElementById("chatstudio-private-chat");
        if (overlay) overlay.remove();
        document.body.style.overflow = "";
        state.chatId = null;
        state.chat = null;
        state.files = [];
        state.busy = false;
    }

    function renderFiles() {
        const box = document.querySelector("#chatstudio-private-chat .cs-private-selected");
        if (!box) return;

        box.innerHTML = state.files.map((file, index) =>
            '<span class="cs-private-chip">' + esc(file.name) + ' <button type="button" data-remove="' + index + '" style="border:0;background:transparent;cursor:pointer;">×</button></span>'
        ).join("");
        box.classList.toggle("visible", state.files.length > 0);

        box.querySelectorAll("[data-remove]").forEach(button => {
            button.addEventListener("click", () => {
                state.files.splice(Number(button.dataset.remove), 1);
                renderFiles();
            });
        });
    }

    function renderMessages() {
        const body = document.querySelector("#chatstudio-private-chat .cs-private-body");
        const model = document.querySelector("#chatstudio-private-chat .cs-private-model");
        if (!body || !state.chat) return;

        const messages = Array.isArray(state.chat.messages) ? state.chat.messages : [];
        let lastModel = "";

        body.innerHTML = messages.map(message => {
            if (message.model) lastModel = message.model;
            const isUser = message.role === "user";
            const files = Array.isArray(message.files) && message.files.length
                ? '<div class="cs-private-files">' + message.files.map(file =>
                    '<a class="cs-private-file" href="' + API.file(file.id) + '" target="_blank" rel="noopener">' +
                        '📎 ' + esc(file.original_name || "Файл") +
                    '</a>'
                ).join("") + '</div>'
                : "";

            return '<div class="cs-private-message ' + (isUser ? "user" : "assistant") + '">' +
                '<div>' +
                    '<div class="cs-private-role">' + (isUser ? "Вы" : "ИИ") + '</div>' +
                    '<div class="cs-private-bubble">' + esc(message.content || "") + files + '</div>' +
                '</div>' +
            '</div>';
        }).join("");

        if (!messages.length) {
            body.innerHTML = '<div style="text-align:center;color:var(--muted);padding:50px 10px;font-size:13px;">Начните диалог.</div>';
        }

        if (model) model.textContent = lastModel ? "Модель: " + lastModel : "";
        body.scrollTop = body.scrollHeight;
    }

    async function loadChat(chatId) {
        const response = await fetch(API.chat(chatId), {
            credentials: "same-origin",
            cache: "no-store"
        });
        let data = {};
        try { data = await response.json(); } catch (_) {}
        if (!response.ok) throw new Error(data.detail || data.message || "Не удалось открыть чат.");
        state.chat = data;
        renderMessages();
    }

    async function parse(response) {
        const type = response.headers.get("content-type") || "";
        if (type.includes("application/json")) return response.json();
        const text = await response.text();
        try { return JSON.parse(text); } catch (_) { return { message: text }; }
    }

    function getSessionId() {
        let id = sessionStorage.getItem("chatstudio_session_id");
        if (!id) {
            id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
            sessionStorage.setItem("chatstudio_session_id", id);
        }
        return id;
    }

    function extractPostId(data) {
        if (!data) return null;
        if (data.post && data.post.id != null) return data.post.id;
        if (data.post_id != null) return data.post_id;
        return null;
    }

    async function poll(requestId) {
        for (let i = 0; i < 600; i++) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const response = await fetch(API.requestStatus(requestId), {
                credentials: "same-origin",
                headers: { "X-Session-ID": getSessionId() },
                cache: "no-store"
            });
            const data = await parse(response);
            if (!response.ok) throw new Error(data.detail || data.message || "Не удалось проверить запрос.");

            const postId = extractPostId(data);
            if (postId) return data;

            const status = String(data.status || "").toLowerCase();
            if (status === "error" || status === "failed") {
                throw new Error(data.detail || data.message || data.error || "ИИ не смог обработать запрос.");
            }

            const statusBox = document.querySelector("#chatstudio-private-chat .cs-private-status");
            if (statusBox) {
                statusBox.textContent = status === "queued" ? "В очереди…" : "ИИ обрабатывает запрос…";
            }
        }

        throw new Error("Запрос обрабатывается слишком долго.");
    }

    async function send() {
        if (state.busy) return;

        const input = document.querySelector("#chatstudio-private-chat .cs-private-input");
        const sendButton = document.querySelector("#chatstudio-private-chat .cs-private-send");
        const prompt = input ? input.value.trim() : "";
        if (!prompt && !state.files.length) return;

        state.busy = true;
        if (sendButton) sendButton.disabled = true;

        const form = new FormData();
        form.append("name", state.chat && state.chat.name ? state.chat.name : "Пользователь");
        form.append("prompt", prompt);
        if (state.chatId) {
            form.append("chat_id", state.chatId);
        }

        const messages = state.chat && Array.isArray(state.chat.messages) ? state.chat.messages : [];
        const lastAssistant = [...messages].reverse().find(message => message.role === "assistant" && message.post_id);
        if (lastAssistant && lastAssistant.post_id) {
            form.append("parent_post_id", lastAssistant.post_id);
        }

        state.files.forEach(file => form.append("files", file, file.name));

        const statusBox = document.querySelector("#chatstudio-private-chat .cs-private-status");
        if (statusBox) statusBox.textContent = "Отправляем…";

        try {
            const response = await fetch(API.requests, {
                method: "POST",
                credentials: "same-origin",
                headers: { "X-Session-ID": getSessionId() },
                body: form
            });
            const data = await parse(response);
            if (!response.ok) throw new Error(data.detail || data.message || data.error || "Ошибка сервера.");

            if (input) input.value = "";
            state.files = [];
            renderFiles();

            let postId = extractPostId(data);
            let statusData = null;
            if (!postId && data.request_id != null) {
                statusData = await poll(data.request_id);
            }

            if (!state.chatId && statusData && statusData.chat_id) {
                state.chatId = statusData.chat_id;
            }

            if (state.chatId) {
                await loadChat(state.chatId);
                if (window.ChatStudioRefreshChats) window.ChatStudioRefreshChats();
            }
            if (statusBox) statusBox.textContent = "";
        } catch (error) {
            if (statusBox) statusBox.textContent = error.message || "Не удалось отправить сообщение.";
        } finally {
            state.busy = false;
            if (sendButton) sendButton.disabled = false;
        }
    }

    function build(chatId) {
        addStyles();

        const overlay = document.createElement("div");
        overlay.id = "chatstudio-private-chat";
        overlay.className = "cs-private-overlay";
        overlay.innerHTML =
            '<div class="cs-private-head">' +
                '<button class="cs-private-back" type="button" aria-label="Назад">←</button>' +
                '<div class="cs-private-title"></div>' +
                '<div class="cs-private-model"></div>' +
                '<button class="cs-private-close" type="button" aria-label="Закрыть">×</button>' +
            '</div>' +
            '<main class="cs-private-body"></main>' +
            '<div class="cs-private-compose">' +
                '<div class="cs-private-compose-inner">' +
                    '<textarea class="cs-private-input" placeholder="Напишите сообщение…"></textarea>' +
                    '<div class="cs-private-selected"></div>' +
                    '<div class="cs-private-tools">' +
                        '<input class="cs-private-file-input" type="file" multiple hidden>' +
                        '<button class="cs-private-attach" type="button" title="Прикрепить файл">＋</button>' +
                        '<div class="cs-private-status"></div>' +
                        '<button class="cs-private-send" type="button">Отправить</button>' +
                    '</div>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";

        overlay.querySelector(".cs-private-title").textContent = chatId ? "Загрузка чата…" : "Новый чат";
        overlay.querySelector(".cs-private-back").addEventListener("click", close);
        overlay.querySelector(".cs-private-close").addEventListener("click", close);
        overlay.querySelector(".cs-private-send").addEventListener("click", send);
        overlay.querySelector(".cs-private-input").addEventListener("keydown", event => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                send();
            }
        });

        const fileInput = overlay.querySelector(".cs-private-file-input");
        overlay.querySelector(".cs-private-attach").addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", event => {
            state.files = state.files.concat(Array.from(event.target.files || []));
            event.target.value = "";
            renderFiles();
        });

        if (chatId) {
            loadChat(chatId).then(() => {
                const title = overlay.querySelector(".cs-private-title");
                if (title) title.textContent = state.chat.name || "Приватный чат";
            }).catch(error => {
                const title = overlay.querySelector(".cs-private-title");
                if (title) title.textContent = "Ошибка";
                const body = overlay.querySelector(".cs-private-body");
                if (body) body.innerHTML = '<div style="color:var(--danger);padding:30px;">' + esc(error.message) + '</div>';
            });
        }
            const title = overlay.querySelector(".cs-private-title");
            if (title) title.textContent = "Ошибка";
            const body = overlay.querySelector(".cs-private-body");
            if (body) body.innerHTML = '<div style="color:var(--danger);padding:30px;">' + esc(error.message) + '</div>';
        });
    }

    window.ChatStudioOpenChat = function(chatId) {
        if (!chatId) return;
        close();
        state.chatId = chatId;
        build(chatId);
    };

    window.ChatStudioNewPrivateChat = function() {
        close();
        state.chatId = null;
        build(null);
    };

    window.ChatStudioNewPrivateChat = function() {
        close();
        state.chatId = null;
        build(null);
    };
})();
