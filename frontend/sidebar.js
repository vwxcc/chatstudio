
(() => {
    "use strict";

    const API = {
        me: "/api/auth/me",
        chats: "/api/chats",
        files: "/api/files",
        logout: "/api/auth/logout"
    };

    const state = { user: null, chats: [] };

    const esc = value => String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    async function request(url, options) {
        const response = await fetch(url, Object.assign({
            credentials: "same-origin"
        }, options || {}));

        let data = {};
        try { data = await response.json(); } catch (_) {}

        if (!response.ok) {
            throw new Error(data.detail || data.message || "Ошибка запроса.");
        }

        return data;
    }

    function addStyles() {
        if (document.getElementById("chatstudio-sidebar-styles")) return;

        const style = document.createElement("style");
        style.id = "chatstudio-sidebar-styles";
        style.textContent = [
            ".cs-sidebar{position:fixed;inset:0 auto 0 0;z-index:300;width:292px;background:rgba(250,247,241,.97);border-right:1px solid var(--border,#ddd6cb);box-shadow:12px 0 35px rgba(54,47,38,.06);display:flex;flex-direction:column;padding:16px 12px;}",
            ".cs-sidebar-head{display:flex;align-items:center;gap:9px;padding:0 6px 12px;}",
            ".cs-sidebar-brand{font-weight:750;flex:1;letter-spacing:-.3px;}",
            ".cs-sidebar-collapse,.cs-sidebar-toggle{width:34px;height:34px;border:1px solid var(--border,#ddd6cb);border-radius:10px;background:var(--card,#fffdf9);cursor:pointer;}",
            ".cs-new-chat{width:100%;min-height:43px;border:0;border-radius:12px;background:var(--accent,#25231f);color:#fff;font-weight:650;cursor:pointer;margin-bottom:10px;}",
            ".cs-sidebar-search{width:100%;height:38px;border:1px solid var(--border,#ddd6cb);border-radius:10px;background:var(--card,#fffdf9);padding:0 11px;outline:none;color:var(--text,#25231f);margin-bottom:10px;}",
            ".cs-sidebar-section{color:var(--muted,#817a70);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:6px;}",
            ".cs-chat-list{flex:1;min-height:0;overflow-y:auto;}",
            ".cs-chat{width:100%;display:flex;border:0;background:transparent;border-radius:10px;padding:9px 8px;text-align:left;cursor:pointer;color:var(--text,#25231f);}",
            ".cs-chat:hover{background:var(--bg-soft,#eee9e1);}",
            ".cs-chat-main{min-width:0;flex:1;}",
            ".cs-chat-name{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".cs-chat-meta{color:var(--muted,#817a70);font-size:10px;margin-top:2px;}",
            ".cs-sidebar-bottom{border-top:1px solid var(--border,#ddd6cb);padding-top:10px;margin-top:10px;}",
            ".cs-user{display:flex;align-items:center;gap:9px;padding:7px 6px 10px;}",
            ".cs-avatar{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#e8e1d8;font-size:11px;font-weight:750;flex:0 0 34px;}",
            ".cs-user-main{min-width:0;flex:1;}.cs-user-name{font-size:12px;font-weight:650;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.cs-user-email{color:var(--muted,#817a70);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
            ".cs-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;}.cs-action{min-height:34px;border:1px solid var(--border,#ddd6cb);border-radius:9px;background:var(--card,#fffdf9);cursor:pointer;font-size:11px;}",
            ".cs-overlay{position:fixed;inset:0;z-index:400;background:rgba(30,27,23,.34);display:grid;place-items:center;padding:20px;}.cs-dialog{width:min(760px,100%);max-height:min(760px,calc(100vh - 40px));overflow:hidden;background:var(--card,#fffdf9);border:1px solid var(--border,#ddd6cb);border-radius:18px;box-shadow:0 25px 80px rgba(40,35,30,.2);display:flex;flex-direction:column;}.cs-dialog-head{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border,#ddd6cb);}.cs-dialog-title{font-weight:700;}.cs-close{width:34px;height:34px;border:1px solid var(--border,#ddd6cb);border-radius:9px;background:transparent;cursor:pointer;}.cs-dialog-body{overflow:auto;padding:18px;}.cs-message{margin-bottom:14px;}.cs-message-role{color:var(--muted,#817a70);font-size:10px;margin-bottom:4px;text-transform:uppercase;}.cs-message-content{white-space:pre-wrap;line-height:1.55;font-size:13px;}.cs-file-row{display:flex;align-items:center;gap:9px;padding:9px 0;border-bottom:1px solid var(--border,#ddd6cb);font-size:12px;}",
            "@media(min-width:901px){body.chatstudio-authenticated .topbar,body.chatstudio-authenticated .app{margin-left:292px;}body.chatstudio-authenticated .app{width:min(1120px,calc(100% - 324px));}}",
            ".cs-sidebar-toggle{display:none;position:fixed;left:12px;top:18px;z-index:350;}",
            "@media(max-width:900px){.cs-sidebar{transform:translateX(-100%);transition:transform .2s ease;}.cs-sidebar.cs-open{transform:translateX(0);}.cs-sidebar-toggle{display:block;}}"
        ].join("");

        document.head.appendChild(style);
    }

    function createSidebar() {
        if (document.getElementById("chatstudio-sidebar")) return;

        const sidebar = document.createElement("aside");
        sidebar.id = "chatstudio-sidebar";
        sidebar.className = "cs-sidebar";
        sidebar.innerHTML =
            '<div class="cs-sidebar-head">' +
                '<div class="cs-sidebar-brand">ChatStudio</div>' +
                '<button class="cs-sidebar-collapse" type="button" aria-label="Свернуть">‹</button>' +
            '</div>' +
            '<button class="cs-new-chat" type="button">＋ Новый чат</button>' +
            '<input class="cs-sidebar-search" type="search" placeholder="Поиск по приватным чатам" aria-label="Поиск по приватным чатам">' +
            '<div class="cs-sidebar-section">История</div>' +
            '<div class="cs-chat-list"></div>' +
            '<div class="cs-sidebar-bottom">' +
                '<div class="cs-user"><div class="cs-avatar"></div><div class="cs-user-main"><div class="cs-user-name"></div><div class="cs-user-email"></div></div></div>' +
                '<div class="cs-actions">' +
                    '<button class="cs-action" data-action="files">Файлы</button>' +
                    '<button class="cs-action" data-action="account">Аккаунт</button>' +
                    '<button class="cs-action" data-action="settings">Настройки</button>' +
                    '<button class="cs-action" data-action="logout">Выйти</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(sidebar);

        const toggle = document.createElement("button");
        toggle.className = "cs-sidebar-toggle";
        toggle.type = "button";
        toggle.textContent = "☰";
        toggle.setAttribute("aria-label", "Открыть меню");
        document.body.appendChild(toggle);

        sidebar.querySelector(".cs-sidebar-collapse").addEventListener("click", () => {
            if (window.innerWidth <= 900) {
                sidebar.classList.remove("cs-open");
            } else {
                sidebar.style.transform = sidebar.style.transform
                    ? ""
                    : "translateX(-100%)";
            }
        });

        toggle.addEventListener("click", () => sidebar.classList.toggle("cs-open"));

        sidebar.querySelector(".cs-new-chat").addEventListener("click", () => {
            if (window.ChatStudioNewPrivateChat) {
                window.ChatStudioNewPrivateChat();
            } else {
                const button = document.getElementById("headerNewButton") || document.getElementById("heroNewButton");
                if (button) button.click();
            }
            sidebar.classList.remove("cs-open");
        });

        let searchTimer = null;
        sidebar.querySelector(".cs-sidebar-search").addEventListener("input", event => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => loadChats(event.target.value.trim()), 180);
        });

        sidebar.querySelectorAll(".cs-action").forEach(button => {
            button.addEventListener("click", () => handleAction(button.dataset.action));
        });
    }

    function renderUser() {
        const sidebar = document.getElementById("chatstudio-sidebar");
        if (!sidebar || !state.user) return;

        const name = state.user.display_name || "Пользователь";
        const initials = name.trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "U";

        sidebar.querySelector(".cs-avatar").textContent = initials;
        sidebar.querySelector(".cs-user-name").textContent = name;
        sidebar.querySelector(".cs-user-email").textContent = state.user.email || "";
    }

    function renderChats() {
        const list = document.querySelector(".cs-chat-list");
        if (!list) return;

        if (!state.chats.length) {
            list.innerHTML = '<div style="padding:16px 7px;color:var(--muted);font-size:12px;">Приватных чатов пока нет.</div>';
            return;
        }

        list.innerHTML = state.chats.map(chat =>
            '<button class="cs-chat" type="button" data-chat-id="' + esc(chat.id) + '">' +
                '<div class="cs-chat-main">' +
                    '<div class="cs-chat-name">' + esc(chat.name || "Новый чат") + '</div>' +
                    '<div class="cs-chat-meta">' + String(chat.message_count || 0) + ' сообщ. · ' + esc(formatDate(chat.updated_at)) + '</div>' +
                '</div>' +
            '</button>'
        ).join("");

        list.querySelectorAll(".cs-chat").forEach(button => {
            button.addEventListener("click", () => openChat(button.dataset.chatId));
        });
    }

    function formatDate(value) {
        const date = new Date(value || "");
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    }

    async function loadChats(search) {
        try {
            const suffix = search ? "?search=" + encodeURIComponent(search) : "";
            const data = await request(API.chats + suffix);
            state.chats = Array.isArray(data.chats) ? data.chats : [];
            renderChats();
        } catch (error) {
            const list = document.querySelector(".cs-chat-list");
            if (list) list.innerHTML = '<div style="padding:16px 7px;color:var(--danger);font-size:12px;">' + esc(error.message) + '</div>';
        }
    }

    function dialog(title, body) {
        const overlay = document.createElement("div");
        overlay.className = "cs-overlay";
        overlay.innerHTML =
            '<div class="cs-dialog" role="dialog" aria-modal="true">' +
                '<div class="cs-dialog-head"><div class="cs-dialog-title">' + esc(title) + '</div><button class="cs-close" type="button" aria-label="Закрыть">×</button></div>' +
                '<div class="cs-dialog-body">' + body + '</div>' +
            '</div>';

        const close = () => overlay.remove();
        overlay.querySelector(".cs-close").addEventListener("click", close);
        overlay.addEventListener("click", event => { if (event.target === overlay) close(); });
        document.body.appendChild(overlay);
    }

    async function openChat(chatId) {
        if (window.ChatStudioOpenChat) {
            window.ChatStudioOpenChat(chatId);
            const sidebar = document.getElementById("chatstudio-sidebar");
            if (sidebar) sidebar.classList.remove("cs-open");
            return;
        }

        try {
            const chat = await request("/api/chats/" + encodeURIComponent(chatId));
            const messages = Array.isArray(chat.messages) ? chat.messages : [];

            const body = messages.length
                ? messages.map(message =>
                    '<div class="cs-message">' +
                        '<div class="cs-message-role">' + esc(message.role === "user" ? "Вы" : "ИИ") + '</div>' +
                        '<div class="cs-message-content">' + esc(message.content || "") + '</div>' +
                    '</div>'
                ).join("")
                : '<div style="color:var(--muted);font-size:13px;">В этом чате пока нет сообщений.</div>';

            dialog(chat.name || "Приватный чат", body);
        } catch (error) {
            dialog("Не удалось открыть чат", '<div style="color:var(--danger);">' + esc(error.message) + '</div>');
        }
    }

    async function showFiles() {
        try {
            const data = await request(API.files);
            const files = Array.isArray(data.files) ? data.files : [];

            const body = files.length
                ? files.map(file =>
                    '<div class="cs-file-row">' +
                        '<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(file.original_name) + '</span>' +
                        '<a href="/api/files/' + encodeURIComponent(file.id) + '" target="_blank" rel="noopener">Открыть</a>' +
                    '</div>'
                ).join("")
                : '<div style="color:var(--muted);font-size:13px;">Загруженных файлов пока нет.</div>';

            dialog("Библиотека файлов", body);
        } catch (error) {
            dialog("Файлы", '<div style="color:var(--danger);">' + esc(error.message) + '</div>');
        }
    }

    function showAccount() {
        dialog("Аккаунт",
            '<div style="display:grid;gap:9px;font-size:13px;">' +
                '<div><b>Имя:</b> ' + esc(state.user.display_name) + '</div>' +
                '<div><b>Email:</b> ' + esc(state.user.email) + '</div>' +
                '<div><b>Роль:</b> ' + esc(state.user.role) + '</div>' +
            '</div>'
        );
    }

    function showSettings() {
        dialog("Настройки",
            '<div style="color:var(--muted);font-size:13px;line-height:1.55;">Раздел настроек подключён. Параметры интерфейса добавим отдельным этапом.</div>'
        );
    }

    async function logout() {
        try { await request(API.logout, { method: "POST" }); }
        finally { window.location.reload(); }
    }

    function handleAction(action) {
        if (action === "files") showFiles();
        if (action === "account") showAccount();
        if (action === "settings") showSettings();
        if (action === "logout") logout();
    }

    async function loadPrivateChat() {
        if (window.ChatStudioOpenChat) return;
        await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "/private-chat.js";
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function init() {
        try {
            const data = await request(API.me);
            if (!data.authenticated || !data.user) return;

            state.user = data.user;
            await loadPrivateChat();
            document.body.classList.add("chatstudio-authenticated");
            addStyles();
            createSidebar();
            renderUser();
            await loadChats("");
        } catch (_) {
            // Анонимному пользователю sidebar не показываем.
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
})();
