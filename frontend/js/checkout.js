/* ============================================================
   X.0 — CHECKOUT
   Production : API sur le même domaine
============================================================ */

// ============================================================
// CONFIGURATION API
// ============================================================

// Même domaine que le site.
//
// Exemple production :
// https://x0-hosting.onrender.com
//
// Le navigateur appellera automatiquement :
// /create-checkout-session
//
// Plus de localhost.
const API_URL = "";

// ============================================================
// RÉCUPÉRATION DU PLAN
// ============================================================

const urlParams =
    new URLSearchParams(
        window.location.search
    );

const selectedPlan =
    urlParams.get("plan");

// ============================================================
// OFFRES X.0
// ============================================================

const plans = {

    starter: {

        name: "X.0 Starter",

        price: "2,99 €",

        ram: "2 Go",

        cpu: "100%",

        storage: "20 Go",

        database: "1"
    },

    standard: {

        name: "X.0 Standard",

        price: "5,99 €",

        ram: "4 Go",

        cpu: "200%",

        storage: "40 Go",

        database: "2"
    },

    pro: {

        name: "X.0 Pro",

        price: "9,99 €",

        ram: "8 Go",

        cpu: "300%",

        storage: "80 Go",

        database: "4"
    },

    premium: {

        name: "X.0 Premium",

        price: "17,99 €",

        ram: "16 Go",

        cpu: "400%",

        storage: "160 Go",

        database: "8"
    }

};

// ============================================================
// ÉLÉMENTS HTML
// ============================================================

const planNameElement =
    document.getElementById(
        "planName"
    );

const planPriceElement =
    document.getElementById(
        "planPrice"
    );

const planRamElement =
    document.getElementById(
        "planRam"
    );

const planCpuElement =
    document.getElementById(
        "planCpu"
    );

const planStorageElement =
    document.getElementById(
        "planStorage"
    );

const planDatabaseElement =
    document.getElementById(
        "planDatabase"
    );

const orderPriceElement =
    document.getElementById(
        "orderPrice"
    );

const totalPriceElement =
    document.getElementById(
        "totalPrice"
    );

const checkoutMessageElement =
    document.getElementById(
        "checkoutMessage"
    );

const checkoutButton =
    document.querySelector(
        ".checkout-button"
    );

// ============================================================
// MESSAGE
// ============================================================

function showMessage(message) {

    if (
        !checkoutMessageElement
    ) {
        return;
    }

    checkoutMessageElement.textContent =
        message;
}

// ============================================================
// VÉRIFICATION DU PLAN
// ============================================================

if (
    !selectedPlan ||
    !plans[selectedPlan]
) {

    alert(
        "❌ Aucune offre Minecraft sélectionnée."
    );

    window.location.href =
        "minecraft-hosting.html";
}

// ============================================================
// PLAN ACTUEL
// ============================================================

const plan =
    plans[selectedPlan];

// ============================================================
// AFFICHAGE DU PLAN
// ============================================================

if (plan) {

    if (planNameElement) {

        planNameElement.textContent =
            plan.name;
    }

    if (planPriceElement) {

        planPriceElement.textContent =
            plan.price;
    }

    if (planRamElement) {

        planRamElement.textContent =
            plan.ram;
    }

    if (planCpuElement) {

        planCpuElement.textContent =
            plan.cpu;
    }

    if (planStorageElement) {

        planStorageElement.textContent =
            plan.storage;
    }

    if (planDatabaseElement) {

        planDatabaseElement.textContent =
            plan.database;
    }

    if (orderPriceElement) {

        orderPriceElement.textContent =
            plan.price;
    }

    if (totalPriceElement) {

        totalPriceElement.textContent =
            plan.price;
    }
}

// ============================================================
// CONTINUER VERS STRIPE
// ============================================================

async function continueCheckout() {

    // ========================================================
    // VÉRIFICATION PLAN
    // ========================================================

    if (
        !selectedPlan ||
        !plans[selectedPlan]
    ) {

        alert(
            "❌ Offre invalide."
        );

        window.location.href =
            "minecraft-hosting.html";

        return;
    }

    // ========================================================
    // VÉRIFICATION BOUTON
    // ========================================================

    if (!checkoutButton) {

        console.error(
            "❌ Bouton checkout introuvable."
        );

        return;
    }

    // ========================================================
    // ÉTAT CHARGEMENT
    // ========================================================

    checkoutButton.disabled =
        true;

    checkoutButton.textContent =
        "Création du paiement...";

    showMessage(
        "Connexion sécurisée à X.0..."
    );

    try {

        // ====================================================
        // APPEL BACKEND
        // ====================================================

        const response =
            await fetch(
                `${API_URL}/create-checkout-session`,
                {
                    method: "POST",

                    credentials: "include",

                    headers: {

                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        plan:
                            selectedPlan

                    })
                }
            );

        // ====================================================
        // LECTURE RÉPONSE
        // ====================================================

        let data;

        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Le serveur X.0 a renvoyé une réponse invalide."
            );
        }

        // ====================================================
        // ERREUR API
        // ====================================================

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Erreur serveur X.0."
            );
        }

        if (!data.success) {

            throw new Error(
                data.message ||
                "Impossible de créer la session Stripe."
            );
        }

        // ====================================================
        // VÉRIFICATION URL STRIPE
        // ====================================================

        if (!data.url) {

            throw new Error(
                "Stripe n'a pas retourné d'URL de paiement."
            );
        }

        // ====================================================
        // DEBUG
        // ====================================================

        console.log(
            "✅ Session Stripe créée."
        );

        console.log(
            "🛒 Plan :",
            selectedPlan
        );

        console.log(
            "💳 Redirection Stripe :",
            data.url
        );

        // ====================================================
        // MESSAGE
        // ====================================================

        showMessage(
            "✅ Paiement créé. Redirection vers Stripe..."
        );

        // ====================================================
        // REDIRECTION STRIPE
        // ====================================================

        window.location.href =
            data.url;

    } catch (error) {

        console.error(
            "❌ Erreur Checkout :",
            error
        );

        showMessage(
            `❌ ${error.message}`
        );

        alert(
            "❌ Impossible de créer le paiement.\n\n" +
            error.message
        );

        checkoutButton.disabled =
            false;

        checkoutButton.textContent =
            "Continuer →";
    }
}

// ============================================================
// RETOUR AUX OFFRES
// ============================================================

function goBack() {

    window.location.href =
        "minecraft-hosting.html";
}

// ============================================================
// DEBUG
// ============================================================

console.log(
    "🚀 X.0 Checkout chargé."
);

console.log(
    "🛒 Plan sélectionné :",
    selectedPlan
);

console.log(
    "🌐 API : même domaine"
);