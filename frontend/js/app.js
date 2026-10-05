const API_URL = "http://localhost:3000";

// ================================
// MODALES
// ================================

function openLogin() {
const registerModal = document.getElementById("registerModal");
const loginModal = document.getElementById("loginModal");

 
if (registerModal) {
    registerModal.classList.remove("active");
}

if (loginModal) {
    loginModal.classList.add("active");
}
 

}

function openRegister() {
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");

 
if (loginModal) {
    loginModal.classList.remove("active");
}

if (registerModal) {
    registerModal.classList.add("active");
}
 

}

function closeModals() {
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");

 
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

// ================================
// INSCRIPTION
// ================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

 
registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    const message =
        document.getElementById("registerMessage");

    message.textContent =
        "Création du compte...";

    try {

        const response =
            await fetch(`${API_URL}/register`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            });

        const data =
            await response.json();

        if (data.success) {

            message.textContent =
                "✅ Compte créé ! Tu peux maintenant te connecter.";

            registerForm.reset();

        } else {

            message.textContent =
                `❌ ${data.message}`;

        }

    } catch (error) {

        console.error(
            "❌ Erreur inscription :",
            error
        );

        message.textContent =
            "❌ Impossible de contacter X.0.";

    }

});
 

}

// ================================
// CONNEXION
// ================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

 
loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("loginMessage");

    message.textContent =
        "Connexion...";

    try {

        const response =
            await fetch(`${API_URL}/login`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            });

        const data =
            await response.json();

        if (data.success) {

            // ==================================================
            // STOCKAGE UNIFORME DE LA SESSION X.0
            // ==================================================

            localStorage.setItem(
                "x0_token",
                data.token
            );

            localStorage.setItem(
                "x0_user",
                JSON.stringify(data.user)
            );

            message.textContent =
                "✅ Connexion réussie !";

            console.log(
                "✅ Utilisateur connecté :",
                data.user
            );

            // ==================================================
            // SI UN PLAN ÉTAIT EN ATTENTE
            // ==================================================

            const pendingPlan =
                localStorage.getItem("x0_pending_plan");

            if (pendingPlan) {

                console.log(
                    "🛒 Commande en attente :",
                    pendingPlan
                );

                // On transforme le plan en plan sélectionné
                localStorage.setItem(
                    "x0_selected_plan",
                    pendingPlan
                );

                // On supprime l'attente
                localStorage.removeItem(
                    "x0_pending_plan"
                );

                // Redirection directe vers le checkout
                setTimeout(() => {

                    window.location.href =
                        `checkout.html?plan=${encodeURIComponent(pendingPlan)}`;

                }, 500);

                return;
            }

            // ==================================================
            // AUCUNE COMMANDE EN ATTENTE
            // ==================================================

            setTimeout(() => {

                window.location.href =
                    "dashboard.html";

            }, 500);

        } else {

            message.textContent =
                `❌ ${data.message}`;

        }

    } catch (error) {

        console.error(
            "❌ Erreur connexion :",
            error
        );

        message.textContent =
            "❌ Impossible de contacter X.0.";

    }

});
 

}

// ================================
// FERMER EN CLIQUANT À CÔTÉ
// ================================

document.querySelectorAll(".modal").forEach((modal) => {

 
modal.addEventListener("click", (event) => {

    if (event.target === modal) {
        closeModals();
    }

});
 

});

// =========================================================
// NAVBAR — ÉTAT DE CONNEXION
// =========================================================

function updateNavbar() {

 
const authButtons =
    document.getElementById("authButtons");

if (!authButtons) {
    return;
}

const token =
    localStorage.getItem("x0_token");

const userData =
    localStorage.getItem("x0_user");

// =====================================================
// UTILISATEUR CONNECTÉ
// =====================================================

if (token && userData) {

    try {

        const user =
            JSON.parse(userData);

        authButtons.innerHTML = `
            <span class="user-email">
                👤 Connecté en tant que
                <strong>${user.email}</strong>
            </span>

            <button
                class="btn-secondary"
                onclick="logoutFromNavbar()"
            >
                Déconnexion
            </button>
        `;

    } catch (error) {

        console.error(
            "❌ Erreur utilisateur :",
            error
        );

        localStorage.removeItem("x0_token");
        localStorage.removeItem("x0_user");

    }

}

// =====================================================
// UTILISATEUR NON CONNECTÉ
// =====================================================

else {

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
 

}

// =========================================================
// DÉCONNEXION
// =========================================================

function logoutFromNavbar() {

 
localStorage.removeItem("x0_token");
localStorage.removeItem("x0_user");

// Nettoyage éventuel d'une commande en attente
localStorage.removeItem("x0_pending_plan");
localStorage.removeItem("x0_selected_plan");

updateNavbar();

window.location.reload();
 

}

// =========================================================
// X.0 — COMMANDER UN PLAN
// =========================================================

function orderPlan(plan) {

 
console.log(
    "🛒 Plan sélectionné :",
    plan
);

// =====================================================
// TOKEN X.0
// =====================================================

const token =
    localStorage.getItem("x0_token");

// =====================================================
// PLAN
// =====================================================

if (!plan) {

    console.error(
        "❌ Aucun plan fourni."
    );

    alert(
        "❌ Impossible de sélectionner cette offre."
    );

    return;
}

// =====================================================
// UTILISATEUR NON CONNECTÉ
// =====================================================

if (!token) {

    console.log(
        "🔐 Utilisateur non connecté."
    );

    // Mémorise le plan choisi
    localStorage.setItem(
        "x0_pending_plan",
        plan
    );

    // Ouvre la connexion
    openLogin();

    return;
}

// =====================================================
// UTILISATEUR CONNECTÉ
// =====================================================

console.log(
    "✅ Utilisateur connecté."
);

// Enregistre le plan
localStorage.setItem(
    "x0_selected_plan",
    plan
);

// Redirection vers checkout
window.location.href =
    `checkout.html?plan=${encodeURIComponent(plan)}`;
 

}

// =========================================================
// INITIALISATION
// =========================================================

document.addEventListener(
"DOMContentLoaded",
() => {

 
    updateNavbar();

    console.log(
        "🚀 X.0 App.js chargé."
    );

    console.log(
        "🔐 Token présent :",
        Boolean(
            localStorage.getItem("x0_token")
        )
    );

    console.log(
        "🛒 Plan sélectionné :",
        localStorage.getItem("x0_selected_plan")
    );

}
 

);
