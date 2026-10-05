// ========================================
// X.0 DASHBOARD
// ========================================


// ========================================
// VÉRIFICATION CONNEXION
// ========================================

const token = localStorage.getItem("x0_token");
const userData = localStorage.getItem("x0_user");

if (!token || !userData) {

    window.location.href = "index.html";

}


// ========================================
// CHARGER LES INFOS UTILISATEUR
// ========================================

try {

    const user = JSON.parse(userData);

    const userEmail =
        document.getElementById("userEmail");

    const accountEmail =
        document.getElementById("accountEmail");

    const userName =
        document.getElementById("userName");


    if (userEmail) {
        userEmail.textContent = user.email;
    }


    if (accountEmail) {
        accountEmail.textContent = user.email;
    }


    if (userName) {

        const name =
            user.email.split("@")[0];

        userName.textContent =
            name + " 👋";

    }

} catch (error) {

    console.error(
        "❌ Erreur utilisateur :",
        error
    );

}


// ========================================
// OUVRIR MODALE COMMANDE
// ========================================

function openOrder() {

    const modal =
        document.getElementById("orderModal");

    if (modal) {

        modal.classList.add("active");

    }

}


// ========================================
// FERMER MODALE COMMANDE
// ========================================

function closeOrder() {

    const modal =
        document.getElementById("orderModal");

    if (modal) {

        modal.classList.remove("active");

    }

}


// ========================================
// CHOIX DU SERVICE
// ========================================

function selectService(service) {

    // ================================
    // MINECRAFT
    // ================================

    if (service === "minecraft") {

        closeOrder();

        window.location.href =
            "minecraft.html";

        return;

    }


    // ================================
    // WEB HOSTING
    // ================================

    if (service === "web") {

        alert(
            "🌐 Le Web Hosting X.0 sera bientôt disponible."
        );

        return;

    }


    // ================================
    // VPS
    // ================================

    if (service === "vps") {

        alert(
            "🖥️ Les VPS X.0 seront bientôt disponibles."
        );

        return;

    }

}


// ========================================
// DÉCONNEXION
// ========================================

function logout() {

    localStorage.removeItem(
        "x0_token"
    );

    localStorage.removeItem(
        "x0_user"
    );

    window.location.href =
        "index.html";

}


// ========================================
// FERMER LA MODALE EN CLIQUANT À L'EXTÉRIEUR
// ========================================

document.addEventListener(
    "click",
    function (event) {

        const modal =
            document.getElementById("orderModal");

        if (!modal) {
            return;
        }

        if (
            event.target === modal
        ) {

            closeOrder();

        }

    }
);