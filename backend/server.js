require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const Stripe = require("stripe");

const app = express();


// ================================
// MIDDLEWARE
// ================================

app.use(express.static("../frontend"));

app.use(cors());

app.use(express.json());


// ================================
// CONFIGURATION
// ================================

const JWT_SECRET = "X0_DEV_SECRET_CHANGE_ME";

const stripe = new Stripe(
    process.env.STRIPE_SECRET_KEY
);


// ================================
// AUTHENTIFICATION JWT
// ================================

function authenticateToken(req, res, next) {

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
                    message: "Token invalide ou expiré."
                });

            }

            req.user = user;

            next();

        }
    );

}


// ================================
// BASE DE DONNÉES
// ================================

const db = new Database("x0.db");


// ================================
// TABLE USERS
// ================================

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


// ================================
// TABLE COMMANDES
// ================================

db.prepare(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        user_id INTEGER NOT NULL,

        stripe_session_id TEXT UNIQUE,

        plan TEXT NOT NULL,

        service TEXT NOT NULL,

        price INTEGER NOT NULL,

        status TEXT NOT NULL DEFAULT 'pending',

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (user_id)
        REFERENCES users(id)
    )
`).run();

console.log("✅ Table orders vérifiée");


// ================================
// ROUTE PRINCIPALE
// ================================

app.get("/", (req, res) => {

    res.json({

        name: "X.0 API",

        version: "0.1.0",

        status: "online"

    });

});


// ================================
// INSCRIPTION
// ================================

app.post("/register", async (req, res) => {

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
            email.toLowerCase().trim();


        const existingUser =
            db
                .prepare(
                    "SELECT id FROM users WHERE email = ?"
                )
                .get(normalizedEmail);


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
            db.prepare(`
                INSERT INTO users (
                    email,
                    password
                )
                VALUES (?, ?)
            `).run(
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

});


// ================================
// CONNEXION
// ================================

app.post("/login", async (req, res) => {

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
            email.toLowerCase().trim();


        const user =
            db
                .prepare(
                    "SELECT * FROM users WHERE email = ?"
                )
                .get(normalizedEmail);


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

});


// ================================
// STRIPE CHECKOUT
// ================================

app.post(
    "/create-checkout-session",
    authenticateToken,
    async (req, res) => {

        try {

            const {
                plan
            } = req.body;


            // ================================
            // OFFRES X.0
            // ================================

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


            const selectedPlan =
                plans[plan];


            if (!selectedPlan) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Offre invalide."

                });

            }


            // ================================
            // CRÉATION SESSION STRIPE
            // ================================

            const session =
                await stripe
                    .checkout
                    .sessions
                    .create({

                        mode:
                            "subscription",


                        payment_method_types: [
                            "card"
                        ],


                        customer_email:
                            req.user.email,


                        client_reference_id:
                            String(req.user.id),


                        metadata: {

                            user_id:
                                String(req.user.id),

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
                            "http://localhost:3000/success.html",


                        cancel_url:
                            "http://localhost:3000/checkout.html"

                    });


            // ================================
            // ENREGISTREMENT COMMANDE
            // ================================

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


            // ================================
            // RÉPONSE
            // ================================

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


// ================================
// SERVEUR
// ================================

const PORT = 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `🚀 X.0 API démarrée sur http://localhost:${PORT}`
        );

    }
);