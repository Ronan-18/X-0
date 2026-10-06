/* ============================================================
   X.0 — APPLICATION FRONTEND
   Production : API sur le même domaine que le site
============================================================ */

// ============================================================
// CONFIGURATION API
// ============================================================

// En production, le frontend et l'API sont servis par Render
// depuis le même domaine.
//
// Exemple :
// https://x0-hosting.onrender.com
//
// Donc on utilise simplement des URLs relatives.
//
// Aucune dépendance à localhost en production.
const API_URL = "";

// ============================================================
// MODALES
// ============================================================

function openLogin() {

    const registerModal =
        document.getElementById("registerModal");

    const loginModal =
        document.getElementById("loginModal");

    if (registerModal) {
        registerModal.classList.remove("active");
    }

    if (loginModal) {
        loginModal.classList.add("active");
    }
}

function openRegister() {

    const loginModal =
        document.getElementById("loginModal");

    const registerModal =
        document.getElementById("registerModal");

    if (loginModal) {
        loginModal.classList.remove("active");
    }

    if (registerModal) {
        registerModal.classList.add("active");
    }
}

function closeModals() {

    const loginModal =
        document.getElementById("loginModal");

    const registerModal =
        document.getElementById("registerModal");

    if (loginModal) {
        loginModal.classList.remove("active");
    }

    if (registerModal) {
        registerModal.classList.remove("active");
    }
}

function switchToRegister() {
    openRegister();
}

function switchToLogin() {
    openLogin();
}

// ============================================================
// INSCRIPTION
// ============================================================

const registerForm =
    document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const email =
                document
                    .getElementById("registerEmail")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("registerPassword")
                    .value;

            const message =
                document.getElementById(
                    "registerMessage"
                );

            if (!email || !password) {

                message.textContent =
                    "❌ Remplis tous les champs.";

                return;
            }

            message.textContent =
                "Création du compte...";

            try {

                const response =
                    await fetch(
                        `${API_URL}/register`,
                        {
                            method: "POST",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                email,
                                password
                            })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok || !data.success) {

                    message.textContent =
                        `❌ ${
                            data.message ||
                            "Impossible de créer le compte."
                        }`;

                    return;
                }

                message.textContent =
                    "✅ Compte créé ! Tu peux maintenant te connecter.";

                registerForm.reset();

            } catch (error) {

                console.error(
                    "❌ Erreur inscription :",
                    error
                );

                message.textContent =
                    "❌ Impossible de contacter X.0.";
            }
        }
    );
}

// ============================================================
// CONNEXION
// ============================================================

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const email =
                document
                    .getElementById("loginEmail")
                    .value
                    .trim();

            const password =
                document
                    .getElementById("loginPassword")
                    .value;

            const message =
                document.getElementById(
                    "loginMessage"
                );

            if (!email || !password) {

                message.textContent =
                    "❌ Remplis tous les champs.";

                return;
            }

            message.textContent =
                "Connexion...";

            try {

                const response =
                    await fetch(
                        `${API_URL}/login`,
                        {
                            method: "POST",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body: JSON.stringify({
                                email,
                                password
                            })
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok || !data.success) {

                    message.textContent =
                        `❌ ${
                            data.message ||
                            "Identifiants incorrects."
                        }`;

                    return;
                }

                message.textContent =
                    "✅ Connexion réussie !";

                console.log(
                    "✅ Utilisateur connecté :",
                    data.user
                );

                // ==================================================
                // PLUS DE LOCALSTORAGE POUR LA SESSION
                // ==================================================
                //
                // Le serveur doit maintenant gérer la session
                // avec un cookie HttpOnly.
                //
                // On ne stocke donc plus :
                //
                // x0_token
                // x0_user
                // x0_pending_plan
                // x0_selected_plan
                //
                // ==================================================

                // ==================================================
                // PLAN EN URL
                // ==================================================
                //
                // Si l'utilisateur vient de cliquer sur une offre
                // avant de se connecter, la page peut utiliser :
                //
                // checkout.html?plan=starter
                //
                // ==================================================

                const pendingPlan =
                    sessionStorage.getItem(
                        "x0_pending_plan"
                    );

                if (pendingPlan) {

                    sessionStorage.removeItem(
                        "x0_pending_plan"
                    );

                    setTimeout(() => {

                        window.location.href =
                            `checkout.html?plan=${
                                encodeURIComponent(
                                    pendingPlan
                                )
                            }`;

                    }, 500);

                    return;
                }

                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 500);

            } catch (error) {

                console.error(
                    "❌ Erreur connexion :",
                    error
                );

                message.textContent =
                    "❌ Impossible de contacter X.0.";
            }
        }
    );
}

// ============================================================
// FERMER LES MODALES EN CLIQUANT À CÔTÉ
// ============================================================

document
    .querySelectorAll(".modal")
    .forEach((modal) => {

        modal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target === modal
                ) {

                    closeModals();
                }
            }
        );
    });

// ============================================================
// NAVBAR — ÉTAT DE CONNEXION
// ============================================================

async function updateNavbar() {

    const authButtons =
        document.getElementById(
            "authButtons"
        );

    if (!authButtons) {
        return;
    }

    try {

        // ========================================================
        // DEMANDE AU SERVEUR QUI EST CONNECTÉ
        // ========================================================

        const response =
            await fetch(
                `${API_URL}/me`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

        if (
            response.ok
        ) {

            const data =
                await response.json();

            if (
                data.success &&
                data.user
            ) {

                const user =
                    data.user;

                authButtons.innerHTML = `

                    <span class="user-email">

                        👤 Connecté en tant que

                        <strong>
                            ${escapeHtml(user.email)}
                        </strong>

                    </span>

                    <button
                        class="btn-secondary"
                        onclick="logoutFromNavbar()"
                    >
                        Déconnexion
                    </button>

                `;

                return;
            }
        }

    } catch (error) {

        console.error(
            "❌ Impossible de récupérer la session X.0 :",
            error
        );
    }

    // ========================================================
    // UTILISATEUR NON CONNECTÉ
    // ========================================================

    authButtons.innerHTML = `

        <button
            class="btn-secondary"
            onclick="openLogin()"
        >
            Connexion
        </button>

        <button
            class="btn-primary"
            onclick="openRegister()"
        >
            Créer un compte
        </button>

    `;
}

// ============================================================
// ÉCHAPPEMENT HTML
// ============================================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ============================================================
// DÉCONNEXION
// ============================================================

async function logoutFromNavbar() {

    try {

        await fetch(
            `${API_URL}/logout`,
            {
                method: "POST",
                credentials: "include"
            }
        );

    } catch (error) {

        console.error(
            "❌ Erreur déconnexion :",
            error
        );
    }

    updateNavbar();

    window.location.reload();
}

// ============================================================
// X.0 — COMMANDER UN PLAN
// ============================================================

function orderPlan(plan) {

    console.log(
        "🛒 Plan sélectionné :",
        plan
    );

    if (!plan) {

        console.error(
            "❌ Aucun plan fourni."
        );

        alert(
            "❌ Impossible de sélectionner cette offre."
        );

        return;
    }

    // ========================================================
    // LE PLAN N'EST PLUS STOCKÉ DANS LOCALSTORAGE
    // ========================================================
    //
    // Si l'utilisateur n'est pas connecté, on garde uniquement
    // le choix pendant la navigation grâce à sessionStorage.
    //
    // Le véritable plan de commande sera toujours vérifié
    // côté serveur.
    //
    // ========================================================

    sessionStorage.setItem(
        "x0_pending_plan",
        plan
    );

    // ========================================================
    // DEMANDE AU SERVEUR SI L'UTILISATEUR EST CONNECTÉ
    // ========================================================

    fetch(
        `${API_URL}/me`,
        {
            method: "GET",
            credentials: "include"
        }
    )
        .then(async (response) => {

            if (!response.ok) {
                throw new Error(
                    "Utilisateur non connecté."
                );
            }

            const data =
                await response.json();

            if (
                !data.success ||
                !data.user
            ) {
                throw new Error(
                    "Utilisateur non connecté."
                );
            }

            // ==================================================
            // UTILISATEUR CONNECTÉ
            // ==================================================

            sessionStorage.removeItem(
                "x0_pending_plan"
            );

            window.location.href =
                `checkout.html?plan=${
                    encodeURIComponent(plan)
                }`;
        })
        .catch(() => {

            // ==================================================
            // UTILISATEUR NON CONNECTÉ
            // ==================================================

            openLogin();
        });
}

// ============================================================
// INITIALISATION
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        updateNavbar();

        console.log(
            "🚀 X.0 App.js chargé."
        );

        console.log(
            "🌐 API : même domaine"
        );
    }
);