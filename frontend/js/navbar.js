// ======================================================
// X.0 — NAVBAR
// ======================================================

const navbarToken =
    localStorage.getItem("x0_token");


// ======================================================
// CHARGER LE COMPTE
// ======================================================

async function loadNavbarUser() {

    const account =
        document.getElementById(
            "navbarAccount"
        );

    const emailElement =
        document.getElementById(
            "navbarUserEmail"
        );


    if (!account) {
        return;
    }


    // ==============================================
    // PAS CONNECTÉ
    // ==============================================

    if (!navbarToken) {

        account.innerHTML = `

            <a
                href="index.html#connexion"
                class="navbar-login"
            >
                Connexion
            </a>

            <a
                href="index.html#inscription"
                class="navbar-register"
            >
                Créer un compte
            </a>

        `;

        return;

    }


    // ==============================================
    // UTILISATEUR CONNECTÉ
    // ==============================================

    try {

        const response =
            await fetch(
                "/me",
                {

                    method:
                        "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${navbarToken}`,

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

            window.location.reload();

            return;

        }


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success ||
            !data.user
        ) {

            return;

        }


        // ==========================================
        // EMAIL RÉEL
        // ==========================================

        if (emailElement) {

            emailElement.textContent =
                data.user.email;

        }


        // ==========================================
        // SAUVEGARDE DES INFOS À JOUR
        // ==========================================

        localStorage.setItem(
            "x0_user",
            JSON.stringify(
                data.user
            )
        );

    }

    catch (error) {

        console.error(
            "❌ Erreur navbar :",
            error
        );

    }

}


// ======================================================
// DÉCONNEXION
// ======================================================

function logoutFromNavbar() {

    localStorage.removeItem(
        "x0_token"
    );


    localStorage.removeItem(
        "x0_user"
    );


    window.location.href =
        "index.html";

}


// ======================================================
// INITIALISATION
// ======================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadNavbarUser();

    }
);