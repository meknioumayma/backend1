const express = require("express");
const router = express.Router();
const db = require("../database");
const multer = require("multer");
const path = require("path");

// Configuration de multer pour le stockage des fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Assure-toi que ce dossier existe
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + file.fieldname + ext);
  }
});

const upload = multer({ storage: storage });

// Route POST /api/demande-stage
router.post("/demande-stage", upload.fields([
  { name: "cv", maxCount: 1 },
  { name: "lettre_motivation", maxCount: 1 }
]), (req, res) => {
  const {
    prenom,
    nom,
    sexe,
    date_naissance,
    email,
    telephone,
    adresse,
    niveau_etude,
    ecole
  } = req.body;

  // Vérifier les champs requis
  if (!prenom || !nom || !email || !niveau_etude || !ecole) {
    return res.status(400).json({ message: "Champs requis manquants." });
  }

  // Récupération des fichiers
  const cvFile = req.files['cv'] ? req.files['cv'][0].filename : null;
  const lettreMotivationFile = req.files['lettre_motivation'] ? req.files['lettre_motivation'][0].filename : null;

  // Génération du code de suivi
  const codeSuivi = "DEM-" + Math.random().toString(36).substr(2, 8).toUpperCase();

  // Requête SQL
  const sql = `
    INSERT INTO demandes (
      prenom, nom, sexe, date_naissance, email, telephone, adresse,
      niveau_etude, ecole, cv, lettre_motivation, code_suivi
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    prenom, nom, sexe, date_naissance, email, telephone, adresse,
    niveau_etude, ecole, cvFile, lettreMotivationFile, codeSuivi
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("Erreur lors de l'insertion :", err);
      return res.status(500).json({ message: "Erreur serveur" });
    }

    res.status(201).json({
      message: "Demande soumise avec succès",
      code_suivi: codeSuivi
    });
  });
});
router.get("/suivi-demande/:codeSuivi", (req, res) => {
    const codeSuivi = req.params.codeSuivi;
  
    console.log("Code de suivi :", codeSuivi); // Pour déboguer
  
    const sql = "SELECT * FROM demandes WHERE code_suivi = ?";
    db.query(sql, [codeSuivi], (err, result) => {
      if (err) {
        console.error("Erreur SQL :", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
  
      if (result.length === 0) {
        return res.status(404).json({ message: "Demande non trouvée" });
      }
  
      res.status(200).json(result[0]);
    });
  });
  const nodemailer = require("nodemailer");
  require("dotenv").config();
  
  // Créer un transporteur Nodemailer
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
 // Route pour obtenir toutes les demandes de stage
router.get('/demandes', (req, res) => {
  const sql = 'SELECT * FROM demandes ORDER BY id DESC';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Erreur lors de la récupération des demandes :', err);
      return res.status(500).json({ message: 'Erreur serveur' });
    }
    res.status(200).json(results);
  });
});
  
  // Route PUT pour changer l'état d'une demande
  router.put("/changer-etat/:id", (req, res) => {
    const { id } = req.params;
    const { etat } = req.body;
  
    if (!etat) {
      return res.status(400).json({ message: "L'état est requis." });
    }
  
    // Requête SQL pour mettre à jour l'état
    const sql = "UPDATE demandes SET etat = ? WHERE id = ?";
    db.query(sql, [etat, id], (err, result) => {
      if (err) {
        console.error("Erreur lors de la mise à jour de l'état :", err);
        return res.status(500).json({ message: "Erreur serveur" });
      }
  
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Demande non trouvée." });
      }
  
      // Récupérer l'e-mail du stagiaire
      const getEmailSql = "SELECT email FROM demandes WHERE id = ?";
      db.query(getEmailSql, [id], (err, result) => {
        if (err || result.length === 0) {
          console.error("Erreur lors de la récupération de l'e-mail :", err);
          return res.status(500).json({ message: "Erreur serveur" });
        }
  
        const email = result[0].email;
  
        // Préparer l'e-mail
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: `État de votre demande de stage : ${etat}`,
          text: `Bonjour,\n\nVotre demande de stage a été mise à jour avec l'état suivant : ${etat}.\n\nCordialement,\nL'équipe RH`,
        };
  
        // Envoyer l'e-mail
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Erreur lors de l'envoi de l'e-mail :", error);
            return res.status(500).json({ message: "Erreur lors de l'envoi de l'e-mail." });
          }
          console.log("E-mail envoyé : " + info.response);
          res.status(200).json({ message: "État mis à jour et e-mail envoyé avec succès." });
        });
      });
    });
  });
  

module.exports = router;
