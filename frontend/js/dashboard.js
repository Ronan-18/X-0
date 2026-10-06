// ========================================
// X.0 DASHBOARD
// ========================================


// ========================================
// AUTHENTIFICATION
// ========================================

const token =
    localStorage.getItem("x0_token");


if (!token) {

    window.location.href =
        "index.html";

}


// ========================================
// CHARGER LE VRAI UTILISATEUR
// ========================================

async function loadCurrentUser() {

    try {

        const response =
            await fetch(
                "/me",
                {

                    method:
                        "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"

                    }

                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "x0_token"
            );

            localStorage.removeItem(
                "x0_user"
            );

            window.location.href =
                "index.html";

            return false;

        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success ||
            !data.user
        ) {

            throw new Error(
                data.message ||
                "Utilisateur introuvable."
            );

        }


        // ========================================
        // UTILISATEUR RÉEL
        // ========================================

        const user =
            data.user;


        // On met également à jour le localStorage
        // avec les informations vérifiées par le serveur.

        localStorage.setItem(
            "x0_user",
            JSON.stringify(user)
        );


        // ========================================
        // EMAIL NAVBAR
        // ========================================

        const userEmail =
            document.getElementById(
                "userEmail"
            );


        if (userEmail) {

            userEmail.textContent =
                user.email;

        }


        // ========================================
        // EMAIL COMPTE
        // ========================================

        const accountEmail =
            document.getElementById(
                "accountEmail"
            );


        if (accountEmail) {

            accountEmail.textContent =
                user.email;

        }


        // ========================================
        // NOM AFFICHÉ
        // ========================================

        const userName =
            document.getElementById(
                "userName"
            );


        if (userName) {

            const name =
                user.email.split("@")[0];

            userName.textContent =
                name + " 👋";

        }


        console.log(
            "👤 Compte X.0 vérifié :",
            user.email
        );


        return true;

    }

    catch (error) {

        console.error(
            "❌ Erreur récupération compte :",
            error
        );

        return false;

    }

}
// ========================================
// CONFIGURATION DES PLANS
// ========================================

const planDetails = {

    starter: {

        name:
            "X.0 Starter",

        ram:
            "2 Go",

        cpu:
            "100% CPU",

        disk:
            "20 Go",

        database:
            "1 DB"

    },


    standard: {

        name:
            "X.0 Standard",

        ram:
            "4 Go",

        cpu:
            "200% CPU",

        disk:
            "40 Go",

        database:
            "2 DB"

    },


    pro: {

        name:
            "X.0 Pro",

        ram:
            "8 Go",

        cpu:
            "300% CPU",

        disk:
            "80 Go",

        database:
            "4 DB"

    },


    premium: {

        name:
            "X.0 Premium",

        ram:
            "16 Go",

        cpu:
            "400% CPU",

        disk:
            "160 Go",

        database:
            "8 DB"

    }

};


// ========================================
// CHARGER LES INFOS UTILISATEUR
// ========================================

try {

    const user =
        JSON.parse(userData);


    const userEmail =
        document.getElementById(
            "userEmail"
        );


    const accountEmail =
        document.getElementById(
            "accountEmail"
        );


    const userName =
        document.getElementById(
            "userName"
        );


    if (userEmail) {

        userEmail.textContent =
            user.email;

    }


    if (accountEmail) {

        accountEmail.textContent =
            user.email;

    }


    if (userName) {

        const name =
            user.email.split("@")[0];

        userName.textContent =
            name + " 👋";

    }

}

catch (error) {

    console.error(
        "❌ Erreur utilisateur :",
        error
    );

}


// ========================================
// CHARGER LES SERVICES
// ========================================

async function loadServices() {

    const container =
        document.getElementById(
            "servicesContainer"
        );


    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                "/api/orders",
                {

                    method:
                        "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${token}`,

                        "Content-Type":
                            "application/json"

                    }

                }
            );


        // ========================================
        // TOKEN EXPIRÉ / INVALIDE
        // ========================================

        if (
            response.status === 401 ||
            response.status === 403
        ) {

            localStorage.removeItem(
                "x0_token"
            );

            localStorage.removeItem(
                "x0_user"
            );

            window.location.href =
                "index.html";

            return;

        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Impossible de récupérer les services."
            );

        }


        const orders =
            Array.isArray(data.orders)
                ? data.orders
                : [];


        updateDashboardStats(
            orders
        );


        renderServices(
            orders
        );

    }

    catch (error) {

        console.error(
            "❌ Erreur chargement services :",
            error
        );


        container.innerHTML = `

            <div class="empty-service">

                <div class="empty-icon">
                    ⚠️
                </div>

                <h3>
                    Impossible de charger vos services
                </h3>

                <p>
                    Vérifiez votre connexion puis rechargez la page.
                </p>

                <button
                    class="btn-primary big"
                    onclick="loadServices()"
                >
                    Réessayer →
                </button>

            </div>

        `;

    }

}


// ========================================
// STATISTIQUES DU DASHBOARD
// ========================================

function updateDashboardStats(
    orders
) {

    const minecraftCount =
        orders.filter(
            order =>
                order.service === "minecraft" &&
                [
                    "paid",
                    "provisioning",
                    "active"
                ].includes(order.status)
        ).length;


    const webCount =
        orders.filter(
            order =>
                order.service === "web" &&
                [
                    "paid",
                    "provisioning",
                    "active"
                ].includes(order.status)
        ).length;


    const vpsCount =
        orders.filter(
            order =>
                order.service === "vps" &&
                [
                    "paid",
                    "provisioning",
                    "active"
                ].includes(order.status)
        ).length;


    const activeCount =
        orders.filter(
            order =>
                [
                    "paid",
                    "provisioning",
                    "active"
                ].includes(order.status)
        ).length;


    const cards =
        document.querySelectorAll(
            ".dashboard-card"
        );


    if (cards.length >= 4) {

        cards[0]
            .querySelector("strong")
            .textContent =
                minecraftCount;


        cards[1]
            .querySelector("strong")
            .textContent =
                webCount;


        cards[2]
            .querySelector("strong")
            .textContent =
                vpsCount;


        cards[3]
            .querySelector("strong")
            .textContent =
                activeCount;

    }

}


// ========================================
// AFFICHER LES SERVICES
// ========================================

function renderServices(
    orders
) {

    const container =
        document.getElementById(
            "servicesContainer"
        );


    if (!container) {
        return;
    }


    if (!orders.length) {

        container.innerHTML = `

            <div class="empty-service">

                <div class="empty-icon">
                    🚀
                </div>

                <h3>
                    Aucun service pour le moment
                </h3>

                <p>
                    Choisissez un service X.0 pour commencer.
                </p>

                <button
                    class="btn-primary big"
                    onclick="openOrder()"
                >
                    Commander un service →
                </button>

            </div>

        `;

        return;

    }


    container.innerHTML = "";


    orders.forEach(
        order => {

            container.appendChild(
                createServiceCard(order)
            );

        }
    );

}


// ========================================
// CRÉER UNE CARTE SERVICE
// ========================================

function createServiceCard(
    order
) {

    const card =
        document.createElement(
            "div"
        );


    card.className =
        "service-card";


    const plan =
        planDetails[
            order.plan
        ] || {

            name:
                "X.0 Service",

            ram:
                "—",

            cpu:
                "—",

            disk:
                "—",

            database:
                "—"

        };


    const status =
        getStatusInfo(
            order.status
        );


    const serviceName =
        order.service === "minecraft"
            ? "Minecraft Hosting"
            : order.service;


    const serverId =
        order.pterodactyl_server_id
            ? `#${order.pterodactyl_server_id}`
            : "En attente";


    const identifier =
        order.pterodactyl_identifier
            ? order.pterodactyl_identifier
            : "Non attribué";


    card.innerHTML = `

        <div class="service-card-header">

            <div class="service-card-title">

                <div class="service-icon">
                    🎮
                </div>

                <div>

                    <span class="service-type">
                        ${escapeHtml(serviceName)}
                    </span>

                    <h3>
                        ${escapeHtml(plan.name)}
                    </h3>

                </div>

            </div>


            <div class="service-status ${status.className}">
                ${status.icon}
                ${status.label}
            </div>

        </div>


        <div class="service-card-body">

            <div class="service-spec">

                <span>RAM</span>

                <strong>
                    ${escapeHtml(plan.ram)}
                </strong>

            </div>


            <div class="service-spec">

                <span>CPU</span>

                <strong>
                    ${escapeHtml(plan.cpu)}
                </strong>

            </div>


            <div class="service-spec">

                <span>Stockage</span>

                <strong>
                    ${escapeHtml(plan.disk)}
                </strong>

            </div>


            <div class="service-spec">

                <span>Bases de données</span>

                <strong>
                    ${escapeHtml(plan.database)}
                </strong>

            </div>

        </div>


        <div class="service-card-footer">

            <div>

                <span>
                    Commande
                </span>

                <strong>
                    #${order.id}
                </strong>

            </div>


            <div>

                <span>
                    Serveur
                </span>

                <strong>
                    ${serverId}
                </strong>

            </div>


            <div>

                <span>
                    Identifier
                </span>

                <strong>
                    ${escapeHtml(identifier)}
                </strong>

            </div>

        </div>

    `;


    return card;

}


// ========================================
// STATUT SERVICE
// ========================================

function getStatusInfo(
    status
) {

    switch (status) {

        case "active":

            return {

                label:
                    "Actif",

                icon:
                    "🟢",

                className:
                    "status-active"

            };


        case "provisioning":

            return {

                label:
                    "Provisioning...",

                icon:
                    "🟡",

                className:
                    "status-provisioning"

            };


        case "paid":

            return {

                label:
                    "Paiement confirmé",

                icon:
                    "💳",

                className:
                    "status-paid"

            };


        case "payment_failed":

            return {

                label:
                    "Paiement échoué",

                icon:
                    "🔴",

                className:
                    "status-failed"

            };


        case "cancelled":

            return {

                label:
                    "Annulé",

                icon:
                    "⚫",

                className:
                    "status-cancelled"

            };


        case "pending":

            return {

                label:
                    "En attente",

                icon:
                    "🟠",

                className:
                    "status-pending"

            };


        default:

            return {

                label:
                    status || "Inconnu",

                icon:
                    "⚪",

                className:
                    "status-unknown"

            };

    }

}


// ========================================
// PROTECTION CONTRE HTML
// ========================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ========================================
// OUVRIR MODALE COMMANDE
// ========================================

function openOrder() {

    const modal =
        document.getElementById(
            "orderModal"
        );


    if (modal) {

        modal.classList.add(
            "active"
        );

    }

}


// ========================================
// FERMER MODALE COMMANDE
// ========================================

function closeOrder() {

    const modal =
        document.getElementById(
            "orderModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


// ========================================
// CHOIX DU SERVICE
// ========================================

function selectService(
    service
) {

    // ================================
    // MINECRAFT
    // ================================

    if (
        service === "minecraft"
    ) {

        closeOrder();

        window.location.href =
            "minecraft.html";

        return;

    }


    // ================================
    // WEB HOSTING
    // ================================

    if (
        service === "web"
    ) {

        alert(
            "🌐 Le Web Hosting X.0 sera bientôt disponible."
        );

        return;

    }


    // ================================
    // VPS
    // ================================

    if (
        service === "vps"
    ) {

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
            document.getElementById(
                "orderModal"
            );


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


// ========================================
// CHARGEMENT INITIAL
// ========================================

async function initializeDashboard() {

    const authenticated =
        await loadCurrentUser();


    if (!authenticated) {
        return;
    }


    await loadServices();

}


initializeDashboard();