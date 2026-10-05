require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const Stripe = require("stripe");

const app = express();


// ======================================================
// CONFIGURATION
// ======================================================

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET || "X0_DEV_SECRET_CHANGE_ME";

if (!process.env.STRIPE_SECRET_KEY) {
    console.error("❌ STRIPE_SECRET_KEY manquant dans le fichier .env");
}

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);


// ======================================================
// MIDDLEWARE DE BASE
// ======================================================

app.use(express.static("../frontend"));

app.use(cors());


// ======================================================
// BASE DE DONNÉES
// ======================================================

const db = new Database("x0.db");


// ======================================================
// TABLE USERS
// ======================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

console.log("✅ Base de données X.0 connectée");
console.log("✅ Table users vérifiée");


// ======================================================
// TABLE COMMANDES
// ======================================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        stripe_session_id TEXT UNIQUE,

        stripe_subscription_id TEXT,

        plan TEXT NOT NULL,

        service TEXT NOT NULL,

        price INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'pending',

        node_id INTEGER,

        pterodactyl_server_id INTEGER,

        pterodactyl_identifier TEXT,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
        REFERENCES users(id)
    )
`).run();


// ======================================================
// MIGRATION DES ANCIENNES BASES X.0
// ======================================================

function addColumnIfMissing(
    table,
    column,
    definition
) {

    const columns =
        db
            .prepare(`PRAGMA table_info(${table})`)
            .all();

    const exists =
        columns.some(
            item => item.name === column
        );

    if (!exists) {

        db.prepare(`
            ALTER TABLE ${table}
            ADD COLUMN ${column} ${definition}
        `).run();

        console.log(
            `✅ Colonne ${column} ajoutée à ${table}`
        );
    }
}


addColumnIfMissing(
    "orders",
    "stripe_subscription_id",
    "TEXT"
);

addColumnIfMissing(
    "orders",
    "node_id",
    "INTEGER"
);

addColumnIfMissing(
    "orders",
    "pterodactyl_server_id",
    "INTEGER"
);

addColumnIfMissing(
    "orders",
    "pterodactyl_identifier",
    "TEXT"
);

addColumnIfMissing(
    "orders",
    "updated_at",
    "DATETIME"
);


console.log("✅ Table orders vérifiée");


// ======================================================
// STRIPE WEBHOOK
// IMPORTANT : DOIT ÊTRE AVANT express.json()
// ======================================================

app.post(
    "/stripe/webhook",
    express.raw({
        type: "application/json"
    }),
    async (req, res) => {

        const signature =
            req.headers["stripe-signature"];

        let event;

        try {

            if (!process.env.STRIPE_WEBHOOK_SECRET) {

                console.error(
                    "❌ STRIPE_WEBHOOK_SECRET manquant."
                );

                return res.status(500).send(
                    "Webhook Stripe non configuré."
                );
            }


            event =
                stripe.webhooks.constructEvent(
                    req.body,
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET
                );

        }

        catch (error) {

            console.error(
                "❌ Signature Stripe invalide :",
                error.message
            );

            return res.status(400).send(
                `Webhook Error: ${error.message}`
            );
        }


        console.log(
            `🔔 Stripe event reçu : ${event.type}`
        );


        // ==================================================
        // PAIEMENT / CHECKOUT TERMINÉ
        // ==================================================

        if (
            event.type ===
            "checkout.session.completed"
        ) {

            const session =
                event.data.object;


            const order =
                db
                    .prepare(`
                        SELECT *
                        FROM orders
                        WHERE stripe_session_id = ?
                    `)
                    .get(session.id);


            if (!order) {

                console.error(
                    "❌ Commande introuvable pour la session :",
                    session.id
                );

                return res.json({
                    received: true
                });
            }


            // ----------------------------------------------
            // ÉVITER DE TRAITER DEUX FOIS LA COMMANDE
            // ----------------------------------------------

            if (
                order.status === "paid" ||
                order.status === "provisioning" ||
                order.status === "active"
            ) {

                console.log(
                    `ℹ️ Commande #${order.id} déjà traitée.`
                );

                return res.json({
                    received: true
                });
            }


            // ----------------------------------------------
            // RÉCUPÉRATION ABONNEMENT
            // ----------------------------------------------

            const subscriptionId =
                typeof session.subscription === "string"
                    ? session.subscription
                    : session.subscription?.id || null;


            // ----------------------------------------------
            // MISE À JOUR COMMANDE
            // ----------------------------------------------

            db.prepare(`
                UPDATE orders

                SET
                    status = ?,
                    stripe_subscription_id = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
            `).run(
                "paid",
                subscriptionId,
                order.id
            );


            console.log(
                `💳 Commande #${order.id} payée.`
            );

            console.log(
                `👤 User ID : ${order.user_id}`
            );

            console.log(
                `🎮 Plan : ${order.plan}`
            );

            console.log(
                `💰 Prix : ${order.price / 100} €`
            );


            // ==================================================
            // PROVISIONING
            // ==================================================

            /*
                PROCHAINE ÉTAPE :

                1. Choisir un node
                2. Appeler l'API Pterodactyl
                3. Créer le serveur Minecraft
                4. Enregistrer son ID
                5. Passer status à "active"
                6. Envoyer l'email
            */

            db.prepare(`
                UPDATE orders
                SET
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                "provisioning",
                order.id
            );


            console.log(
                `⚙️ Commande #${order.id} → provisioning`
            );

        }


        // ==================================================
        // ABONNEMENT PAYÉ
        // ==================================================

// ==================================================
// ABONNEMENT PAYÉ
// ==================================================

else if (
    event.type === "invoice.paid"
) {

    const invoice =
        event.data.object;


    const subscriptionId =
        typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;


    if (subscriptionId) {

        const order =
            db
                .prepare(`
                    SELECT *
                    FROM orders
                    WHERE stripe_subscription_id = ?
                `)
                .get(
                    subscriptionId
                );


        if (!order) {

            console.log(
                `ℹ️ Aucun ordre X.0 trouvé pour l'abonnement ${subscriptionId}.`
            );

        } else {

            /*
                IMPORTANT :

                Un paiement d'abonnement Stripe réussi
                ne signifie PAS que le serveur Minecraft
                est déjà créé.

                Tant que Pterodactyl n'a pas créé le serveur,
                on conserve le statut "provisioning".

                C'est le futur provisioning Pterodactyl
                qui passera la commande à "active".
            */

            if (
                order.status === "active"
            ) {

                console.log(
                    `ℹ️ Commande #${order.id} déjà active.`
                );

            } else {

                db.prepare(`
                    UPDATE orders

                    SET
                        updated_at = CURRENT_TIMESTAMP

                    WHERE id = ?
                `).run(
                    order.id
                );


                console.log(
                    `💳 Abonnement ${subscriptionId} payé.`
                );

                console.log(
                    `⚙️ Commande #${order.id} conservée en ${order.status}.`
                );

            }

        }

    }

}


        // ==================================================
        // PAIEMENT ÉCHOUÉ
        // ==================================================

        else if (
            event.type ===
            "invoice.payment_failed"
        ) {

            const invoice =
                event.data.object;


            const subscriptionId =
                typeof invoice.subscription === "string"
                    ? invoice.subscription
                    : invoice.subscription?.id;


            if (subscriptionId) {

                db.prepare(`
                    UPDATE orders

                    SET
                        status = 'payment_failed',
                        updated_at = CURRENT_TIMESTAMP

                    WHERE stripe_subscription_id = ?
                `).run(
                    subscriptionId
                );

                console.log(
                    `⚠️ Paiement échoué pour ${subscriptionId}`
                );
            }

        }


        // ==================================================
        // ABONNEMENT SUPPRIMÉ
        // ==================================================

        else if (
            event.type ===
            "customer.subscription.deleted"
        ) {

            const subscription =
                event.data.object;


            db.prepare(`
                UPDATE orders

                SET
                    status = 'cancelled',
                    updated_at = CURRENT_TIMESTAMP

                WHERE stripe_subscription_id = ?
            `).run(
                subscription.id
            );


            console.log(
                `❌ Abonnement ${subscription.id} annulé.`
            );
        }


        return res.json({
            received: true
        });

    }
);


// ======================================================
// JSON
// IMPORTANT : APRÈS LE WEBHOOK
// ======================================================

app.use(express.json());


// ======================================================
// JWT
// ======================================================

function authenticateToken(
    req,
    res,
    next
) {

    const authHeader =
        req.headers["authorization"];

    const token =
        authHeader &&
        authHeader.split(" ")[1];


    if (!token) {

        return res.status(401).json({
            success: false,
            message: "Token manquant."
        });

    }


    jwt.verify(
        token,
        JWT_SECRET,
        (error, user) => {

            if (error) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Token invalide ou expiré."
                });

            }


            req.user = user;

            next();

        }
    );

}


// ======================================================
// ROUTE PRINCIPALE
// ======================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            name: "X.0 API",

            version: "0.2.0",

            status: "online",

            infrastructure:
                "Pterodactyl-ready"

        });

    }
);


// ======================================================
// INSCRIPTION
// ======================================================

app.post(
    "/register",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            if (!email || !password) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email et mot de passe obligatoires."

                });

            }


            if (password.length < 8) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Le mot de passe doit contenir au moins 8 caractères."

                });

            }


            const normalizedEmail =
                email
                    .toLowerCase()
                    .trim();


            const existingUser =
                db
                    .prepare(`
                        SELECT id
                        FROM users
                        WHERE email = ?
                    `)
                    .get(
                        normalizedEmail
                    );


            if (existingUser) {

                return res.status(409).json({

                    success: false,

                    message:
                        "Un compte existe déjà avec cet email."

                });

            }


            const hashedPassword =
                await bcrypt.hash(
                    password,
                    12
                );


            const result =
                db
                    .prepare(`
                        INSERT INTO users (
                            email,
                            password
                        )
                        VALUES (?, ?)
                    `)
                    .run(
                        normalizedEmail,
                        hashedPassword
                    );


            res.status(201).json({

                success: true,

                message:
                    "Compte X.0 créé avec succès.",

                user: {

                    id:
                        result.lastInsertRowid,

                    email:
                        normalizedEmail

                }

            });

        }

        catch (error) {

            console.error(
                "❌ Erreur inscription :",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Erreur interne du serveur."

            });

        }

    }
);


// ======================================================
// CONNEXION
// ======================================================

app.post(
    "/login",
    async (req, res) => {

        try {

            const {
                email,
                password
            } = req.body;


            if (!email || !password) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email et mot de passe obligatoires."

                });

            }


            const normalizedEmail =
                email
                    .toLowerCase()
                    .trim();


            const user =
                db
                    .prepare(`
                        SELECT *
                        FROM users
                        WHERE email = ?
                    `)
                    .get(
                        normalizedEmail
                    );


            if (!user) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Email ou mot de passe incorrect."

                });

            }


            const passwordCorrect =
                await bcrypt.compare(
                    password,
                    user.password
                );


            if (!passwordCorrect) {

                return res.status(401).json({

                    success: false,

                    message:
                        "Email ou mot de passe incorrect."

                });

            }


            const token =
                jwt.sign(
                    {
                        id:
                            user.id,

                        email:
                            user.email
                    },

                    JWT_SECRET,

                    {
                        expiresIn:
                            "7d"
                    }
                );


            res.json({

                success: true,

                message:
                    "Connexion réussie.",

                token,

                user: {

                    id:
                        user.id,

                    email:
                        user.email

                }

            });

        }

        catch (error) {

            console.error(
                "❌ Erreur connexion :",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Erreur interne du serveur."

            });

        }

    }
);


// ======================================================
// OFFRES X.0
// ======================================================

const plans = {

    starter: {

        name:
            "X.0 Starter",

        price:
            299

    },

    standard: {

        name:
            "X.0 Standard",

        price:
            599

    },

    pro: {

        name:
            "X.0 Pro",

        price:
            999

    },

    premium: {

        name:
            "X.0 Premium",

        price:
            1799

    }

};


// ======================================================
// STRIPE CHECKOUT
// ======================================================

app.post(
    "/create-checkout-session",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                plan
            } = req.body;


            const selectedPlan =
                plans[plan];


            if (!selectedPlan) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Offre invalide."

                });

            }


            const baseUrl =
                process.env.PUBLIC_URL ||
                "http://localhost:3000";


            // ==============================================
            // STRIPE CHECKOUT
            // ==============================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .create({

                        mode:
                            "subscription",


                        // IMPORTANT :
                        // payment_method_types a été supprimé.
                        // Stripe gère maintenant automatiquement
                        // les moyens de paiement activés
                        // dans le Dashboard.


                        customer_email:
                            req.user.email,


                        client_reference_id:
                            String(
                                req.user.id
                            ),


                        metadata: {

                            user_id:
                                String(
                                    req.user.id
                                ),

                            plan:
                                plan,

                            service:
                                "minecraft",

                            price:
                                String(
                                    selectedPlan.price
                                )

                        },


                        line_items: [

                            {

                                price_data: {

                                    currency:
                                        "eur",


                                    product_data: {

                                        name:
                                            selectedPlan.name +
                                            " — Minecraft Hosting"

                                    },


                                    recurring: {

                                        interval:
                                            "month"

                                    },


                                    unit_amount:
                                        selectedPlan.price

                                },


                                quantity:
                                    1

                            }

                        ],


                        success_url:
                            `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,


                        cancel_url:
                            `${baseUrl}/checkout.html`

                    });


            // ==============================================
            // ENREGISTREMENT COMMANDE
            // ==============================================

            db.prepare(`
                INSERT INTO orders (
                    user_id,
                    stripe_session_id,
                    plan,
                    service,
                    price,
                    status
                )

                VALUES (?, ?, ?, ?, ?, ?)
            `).run(

                req.user.id,

                session.id,

                plan,

                "minecraft",

                selectedPlan.price,

                "pending"

            );


            // ==============================================
            // RÉPONSE
            // ==============================================

            res.json({

                success:
                    true,

                url:
                    session.url

            });

        }

        catch (error) {

            console.error(
                "❌ Erreur Stripe :",
                error
            );


            res.status(500).json({

                success:
                    false,

                message:
                    "Impossible de créer la session Stripe."

            });

        }

    }
);


// ======================================================
// RÉCUPÉRER LES COMMANDES DU CLIENT
// ======================================================

app.get(
    "/api/orders",
    authenticateToken,
    (req, res) => {

        try {

            const orders =
                db
                    .prepare(`
                        SELECT
                            id,
                            plan,
                            service,
                            price,
                            status,
                            node_id,
                            pterodactyl_server_id,
                            pterodactyl_identifier,
                            created_at,
                            updated_at

                        FROM orders

                        WHERE user_id = ?

                        ORDER BY id DESC
                    `)
                    .all(
                        req.user.id
                    );


            res.json({

                success: true,

                orders

            });

        }

        catch (error) {

            console.error(
                "❌ Erreur récupération commandes :",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Impossible de récupérer les commandes."

            });

        }

    }
);


// ======================================================
// SERVEUR
// ======================================================

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 X.0 API démarrée sur le port ${PORT}`
        );

    }
);