// ================================
// X.0 CHECKOUT
// ================================

const token =
    localStorage.getItem("x0_token");

const selectedPlan =
    localStorage.getItem("x0_selected_plan");

// ================================
// VÉRIFICATION
// ================================

if (!token) {

    alert(
        "🔐 Connecte-toi à ton compte X.0."
    );

    window.location.href =
        "index.html";

}


// ================================
// OFFRES
// ================================

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


// ================================
// VÉRIFIER L'OFFRE
// ================================

if (!selectedPlan || !plans[selectedPlan]) {

    alert(
        "❌ Aucune offre sélectionnée."
    );

    window.location.href =
        "minecraft.html";

}


// ================================
// AFFICHER L'OFFRE
// ================================

const plan =
    plans[selectedPlan];


document.getElementById(
    "planName"
).textContent =
    plan.name;


document.getElementById(
    "planPrice"
).textContent =
    plan.price;


document.getElementById(
    "planRam"
).textContent =
    plan.ram;


document.getElementById(
    "planCpu"
).textContent =
    plan.cpu;


document.getElementById(
    "planStorage"
).textContent =
    plan.storage;


document.getElementById(
    "planDatabase"
).textContent =
    plan.database;


document.getElementById(
    "orderPrice"
).textContent =
    plan.price;


document.getElementById(
    "totalPrice"
).textContent =
    plan.price;


// ================================
// CONTINUER
// ================================

async function continueCheckout() {

    const button =
        document.querySelector(".checkout-button");

    button.disabled = true;

    button.textContent =
        "Création du paiement...";

    try {

        const response =
            await fetch(
                "http://localhost:3000/create-checkout-session",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        plan:
                            selectedPlan

                    })
                }
            );

        const data =
            await response.json();

        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                "Erreur lors de la création du paiement."
            );

        }

        window.location.href =
            data.url;

    } catch (error) {

        console.error(
            "❌ Erreur Checkout :",
            error
        );

        alert(
            "❌ Impossible de créer le paiement.\n\n" +
            error.message
        );

        button.disabled = false;

        button.textContent =
            "Continuer →";

    }

}

// ================================
// RETOUR
// ================================

function goBack() {

    window.location.href =
        "minecraft.html";

}