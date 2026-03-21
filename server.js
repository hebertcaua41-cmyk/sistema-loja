const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const app = express();

/* ==============================
   🔥 MIDDLEWARES
============================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ==============================
   📁 SERVIR PASTA PUBLIC
============================== */
app.use(express.static(path.join(__dirname, 'public')));

/* ==============================
   🌍 ROTA PRINCIPAL (IMPORTANTE)
   Evita erro "Not Found"
============================== */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/