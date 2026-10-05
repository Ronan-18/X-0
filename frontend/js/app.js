const API_URL = "http://localhost:3000";

// ================================
// MODALES
// ================================

function openLogin() {
    document.getElementById("registerModal").classList.remove("active");
    document.getElementById("loginModal").classList.add("active");
}

function openRegister() {
    document.getElementById("loginModal").classList.remove("active");
    document.getElementById("registerModal").classList.add("active");
}

function closeModals() {
    document.getElementById("loginModal").classList.remove("active");
    document.getElementById("registerModal").classList.remove("active");
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

document
    .getElementById("registerForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = document
            .getElementById("registerEmail")
            .value;

        const password = document
            .getElementById("registerPassword")
            .value;

        const message = document.getElementById("registerMessage");

        message.textContent = "Création du compte...";

        try {

            const response = await fetch(`${API_URL}/register`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (data.success) {

                message.textContent =
                    "✅ Compte créé ! Tu peux maintenant te connecter.";

                document.getElementById("registerForm").reset();

            } else {

                message.textContent =
                    `❌ ${data.message}`;
            }

        } catch (error) {

            console.error(error);

            message.textContent =
                "❌ Impossible de contacter X.0.";
        }
    });

// ================================
// CONNEXION
// ================================

document
    .getElementById("loginForm")
    .addEventListener("submit", async (event) => {

        event.preventDefault();

        const email = document
            .getElementById("loginEmail")
            .value;

        const password = document
            .getElementById("loginPassword")
            .value;

        const message = document.getElementById("loginMessage");

        message.textContent = "Connexion...";

        try {

            const response = await fetch(`${API_URL}/login`, {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

if (data.success) {

    localStorage.setItem("x0_token", data.token);

    localStorage.setItem(
        "x0_user",
        JSON.stringify(data.user)
    );

    message.textContent =
        "✅ Connexion réussie !";

    console.log("Utilisateur connecté :", data.user);

    // Redirection vers le dashboard
    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 500);

} else {

                message.textContent =
                    `❌ ${data.message}`;
            }

        } catch (error) {

            console.error(error);

            message.textContent =
                "❌ Impossible de contacter X.0.";
        }
    });

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

    // Utilisateur connecté
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
                "Erreur utilisateur :",
                error
            );

            localStorage.removeItem("x0_token");
            localStorage.removeItem("x0_user");
        }

    }

    // Utilisateur non connecté
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
// DÉCONNEXION DEPUIS LA NAVBAR
// =========================================================

function logoutFromNavbar() {

    localStorage.removeItem("x0_token");
    localStorage.removeItem("x0_user");

    updateNavbar();

    window.location.reload();
}


// Vérifie l'état de connexion au chargement
document.addEventListener(
    "DOMContentLoaded",
    updateNavbar
);