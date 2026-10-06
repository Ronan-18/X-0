require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const Stripe = require("stripe");
const path = require("path");

const app = express();


// ======================================================
// CONFIGURATION
// ======================================================

const PORT = process.env.PORT || 3000;

const JWT_SECRET =
    process.env.JWT_SECRET || "X0_DEV_SECRET_CHANGE_ME";

const PUBLIC_URL =
    process.env.PUBLIC_URL || `http://localhost:${PORT}`;

if (!process.env.STRIPE_SECRET_KEY) {
    console.error(
        "❌ STRIPE_SECRET_KEY manquant dans le fichier .env"
    );
}

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);


// ======================================================
// CHEMINS
// ======================================================

const FRONTEND_PATH =
    path.join(__dirname, "..", "frontend");

const DATABASE_PATH =
    path.join(__dirname, "x0.db");


// ======================================================
// MIDDLEWARE DE BASE
// ======================================================

// Le frontend est servi directement par X.0
app.use(
    express.static(FRONTEND_PATH)
);


// CORS principalement utile si le frontend
// est temporairement servi depuis une autre origine.
app.use(
    cors({
        credentials: true
    })
);


// ======================================================
// BASE DE DONNÉES
// ======================================================

const db =
    new Database(DATABASE_PATH);

console.log(
    "✅ Base de données X.0 connectée"
);


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

console.log(
    "✅ Table users vérifiée"
);


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
            .prepare(
                `PRAGMA table_info(${table})`
            )
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


console.log(
    "✅ Table orders vérifiée"
);


// ======================================================
// COOKIE DE SESSION
// ======================================================

const COOKIE_NAME =
    "x0_session";


// ======================================================
// OUTILS COOKIE
// ======================================================

function isProduction() {

    return (
        process.env.NODE_ENV ===
        "production"
    );
}


function setSessionCookie(
    res,
    token
) {

    const maxAge =
        7 * 24 * 60 * 60 * 1000;

    const secure =
        isProduction();

    const cookieParts = [

        `${COOKIE_NAME}=${encodeURIComponent(token)}`,

        "HttpOnly",

        "Path=/",

        "SameSite=Lax",

        `Max-Age=${Math.floor(
            maxAge / 1000
        )}`

    ];

    if (secure) {

        cookieParts.push(
            "Secure"
        );
    }

    res.setHeader(
        "Set-Cookie",
        cookieParts.join("; ")
    );
}


function clearSessionCookie(
    res
) {

    const cookieParts = [

        `${COOKIE_NAME}=`,

        "HttpOnly",

        "Path=/",

        "SameSite=Lax",

        "Max-Age=0"

    ];

    if (isProduction()) {

        cookieParts.push(
            "Secure"
        );
    }

    res.setHeader(
        "Set-Cookie",
        cookieParts.join("; ")
    );
}


function getCookie(
    req,
    name
) {

    const cookieHeader =
        req.headers.cookie;

    if (!cookieHeader) {
        return null;
    }

    const cookies =
        cookieHeader
            .split(";")
            .map(
                item => item.trim()
            );

    const cookie =
        cookies.find(
            item =>
                item.startsWith(
                    `${name}=`
                )
        );

    if (!cookie) {
        return null;
    }

    return decodeURIComponent(
        cookie.substring(
            name.length + 1
        )
    );
}


// ======================================================
// AUTHENTIFICATION
// ======================================================

function getAuthenticatedUser(
    req
) {

    const token =
        getCookie(
            req,
            COOKIE_NAME
        );

    if (!token) {

        return null;
    }

    try {

        return jwt.verify(
            token,
            JWT_SECRET
        );

    } catch {

        return null;
    }
}


function authenticateToken(
    req,
    res,
    next
) {

    const user =
        getAuthenticatedUser(
            req
        );

    if (!user) {

        return res.status(401).json({

            success: false,

            message:
                "Connexion requise."

        });
    }

    req.user =
        user;

    next();
}


// ======================================================
// STRIPE WEBHOOK
// IMPORTANT : AVANT express.json()
// ======================================================

app.post(
    "/stripe/webhook",

    express.raw({
        type: "application/json"
    }),

    async (req, res) => {

        const signature =
            req.headers[
                "stripe-signature"
            ];

        let event;

        try {

            if (
                !process.env
                    .STRIPE_WEBHOOK_SECRET
            ) {

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
                    process.env
                        .STRIPE_WEBHOOK_SECRET
                );

        } catch (error) {

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
        // CHECKOUT TERMINÉ
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
                    .get(
                        session.id
                    );


            if (!order) {

                console.error(
                    "❌ Commande introuvable pour la session :",
                    session.id
                );

                return res.json({
                    received: true
                });
            }


            // ==================================================
            // IDEMPOTENCE
            // ==================================================

            if (
                order.status ===
                    "paid" ||

                order.status ===
                    "provisioning" ||

                order.status ===
                    "waiting_for_pterodactyl" ||

                order.status ===
                    "active"
            ) {

                console.log(
                    `ℹ️ Commande #${order.id} déjà traitée.`
                );

                return res.json({
                    received: true
                });
            }


            // ==================================================
            // ABONNEMENT
            // ==================================================

            const subscriptionId =
                typeof session.subscription ===
                "string"

                    ? session.subscription

                    : session
                        .subscription
                        ?.id || null;


            // ==================================================
            // PAID
            // ==================================================

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
                POUR LE MOMENT :

                Nous n'avons pas encore accès
                à Pterodactyl.

                On prépare donc la commande
                pour le futur provisioning.
            */

            db.prepare(`
                UPDATE orders

                SET
                    status = ?,
                    updated_at = CURRENT_TIMESTAMP

                WHERE id = ?
            `).run(

                "waiting_for_pterodactyl",

                order.id
            );


            console.log(
                `⏳ Commande #${order.id} → waiting_for_pterodactyl`
            );
        }


        // ==================================================
        // ABONNEMENT PAYÉ
        // ==================================================

        else if (
            event.type ===
            "invoice.paid"
        ) {

            const invoice =
                event.data.object;


            const subscriptionId =
                typeof invoice.subscription ===
                "string"

                    ? invoice.subscription

                    : invoice
                        .subscription
                        ?.id;


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

                    if (
                        order.status ===
                        "active"
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
                            `⏳ Commande #${order.id} conservée en ${order.status}.`
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
                typeof invoice.subscription ===
                "string"

                    ? invoice.subscription

                    : invoice
                        .subscription
                        ?.id;


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
        // ABONNEMENT ANNULÉ
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

app.use(
    express.json()
);


// ======================================================
// ROUTE PRINCIPALE
// ======================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            name:
                "X.0 API",

            version:
                "0.3.0",

            status:
                "online",

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


            if (
                !email ||
                !password
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Email et mot de passe obligatoires."

                });
            }


            if (
                password.length < 8
            ) {

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


            return res.status(201).json({

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

        } catch (error) {

            console.error(
                "❌ Erreur inscription :",
                error
            );


            return res.status(500).json({

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


            if (
                !email ||
                !password
            ) {

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


            // ==================================================
            // JWT
            // ==================================================

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


            // ==================================================
            // COOKIE HTTPONLY
            // ==================================================

            setSessionCookie(
                res,
                token
            );


            // ==================================================
            // IMPORTANT :
            // LE TOKEN N'EST PLUS RENVOYÉ AU JAVASCRIPT
            // ==================================================

            return res.json({

                success:
                    true,

                message:
                    "Connexion réussie.",

                user: {

                    id:
                        user.id,

                    email:
                        user.email

                }

            });

        } catch (error) {

            console.error(
                "❌ Erreur connexion :",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Erreur interne du serveur."

            });
        }
    }
);


// ======================================================
// UTILISATEUR CONNECTÉ
// ======================================================

app.get(
    "/me",

    authenticateToken,

    (req, res) => {

        const user =
            db
                .prepare(`
                    SELECT
                        id,
                        email,
                        created_at
                    FROM users
                    WHERE id = ?
                `)
                .get(
                    req.user.id
                );


        if (!user) {

            return res.status(401).json({

                success:
                    false,

                message:
                    "Utilisateur introuvable."

            });
        }


        return res.json({

            success:
                true,

            user

        });
    }
);


// ======================================================
// DÉCONNEXION
// ======================================================

app.post(
    "/logout",

    (req, res) => {

        clearSessionCookie(
            res
        );


        return res.json({

            success:
                true,

            message:
                "Déconnexion réussie."

        });
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

                    success:
                        false,

                    message:
                        "Offre invalide."

                });
            }


            // ==================================================
            // SÉCURITÉ :
            // ON RÉCUPÈRE L'UTILISATEUR DEPUIS LA DB
            // ==================================================

            const user =
                db
                    .prepare(`
                        SELECT
                            id,
                            email
                        FROM users
                        WHERE id = ?
                    `)
                    .get(
                        req.user.id
                    );


            if (!user) {

                return res.status(401).json({

                    success:
                        false,

                    message:
                        "Utilisateur introuvable."

                });
            }


            // ==================================================
            // STRIPE
            // ==================================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .create({

                        mode:
                            "subscription",


                        customer_email:
                            user.email,


                        client_reference_id:
                            String(
                                user.id
                            ),


                        metadata: {

                            user_id:
                                String(
                                    user.id
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
                            `${PUBLIC_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,


                        cancel_url:
                            `${PUBLIC_URL}/checkout.html?plan=${encodeURIComponent(plan)}`

                    });


            // ==================================================
            // COMMANDE X.0
            // ==================================================

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

                user.id,

                session.id,

                plan,

                "minecraft",

                selectedPlan.price,

                "pending"
            );


            console.log(
                `🛒 Commande créée pour ${user.email}`
            );

            console.log(
                `🎮 Plan : ${plan}`
            );

            console.log(
                `💰 Prix : ${selectedPlan.price / 100} €`
            );


            return res.json({

                success:
                    true,

                url:
                    session.url

            });

        } catch (error) {

            console.error(
                "❌ Erreur Stripe :",
                error
            );


            return res.status(500).json({

                success:
                    false,

                message:
                    "Impossible de créer la session Stripe."

            });
        }
    }
);


// ======================================================
// COMMANDES DU CLIENT
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


            return res.json({

                success:
                    true,

                orders

            });

        } catch (error) {

            console.error(
                "❌ Erreur récupération commandes :",
                error
            );


            return res.status(500).json({

                success:
                    false,

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

        console.log(
            `🌐 Frontend : ${FRONTEND_PATH}`
        );

        console.log(
            `💳 Stripe : configuré`
        );

        console.log(
            `🐉 Pterodactyl : prêt pour intégration`
        );
    }
);