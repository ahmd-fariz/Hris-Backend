import { API_Backend, API_Frontend } from "./api/api.js";
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import db from "./config/Database.js";
import FileUpload from "express-fileupload";
import session from "express-session";
import SequelizeStore from "connect-session-sequelize";
// Bagian route
import AbsenRoute from "./routes/AbsenRoute.js";
import AlphaRoute from "./routes/AlphaRoute.js";
import AuthRoute from "./routes/AuthRoute.js";
import HariLiburRoute from "./routes/HariLiburRoute.js";
import RoleRoute from "./routes/RoleRoute.js";
import SettingRoute from "./routes/SettingRoute.js";
import SuratRoute from "./routes/SuratRoute.js";
import UserRoute from "./routes/UserRoute.js";
import dotenv from "dotenv";
dotenv.config(); // Memuat variabel lingkungan dari file .env

const app = express(); // Membuat aplikasi Express

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const sessionStore = SequelizeStore(session.Store); // Mengonfigurasi session store untuk Sequelize

const store = new sessionStore({
  db: db, // Menghubungkan session store dengan database
});

(async () => {
  await db.sync();
})();

// Konfigurasi middleware session
app.use(
  session({
    secret: process.env.SESS_SECRET, // Kunci rahasia untuk enkripsi sesi
    resave: false, // Tidak menyimpan ulang sesi yang tidak berubah
    saveUninitialized: true, // Menyimpan sesi baru yang belum diinisialisasi
    store: store, // Menyimpan sesi di database menggunakan Sequelize store
    cookie: {
      secure: "auto", // Mengatur cookie agar hanya dikirim melalui HTTPS (otomatis tergantung pada lingkungan)
    },
  })
);
// Konfigurasi middleware CORS
app.use(
  cors({
    credentials: true, // Mengizinkan pengiriman kredensial seperti cookie
    origin: [API_Frontend, API_Backend],
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);

app.use(express.json()); // Middleware untuk parsing JSON
app.use(FileUpload()); // Middleware untuk menangani upload file
// Menyajikan file statis dari folder 'public'
app.use(express.static("public"));
app.use(express.static("public/absen"));
app.use(express.static("public/geolocation"));
app.use(express.static("public/images"));
app.use(express.static("public/logo"));
app.use(express.static("public/signature"));


// Menggunakan route handler untuk berbagai rute
app.use(AbsenRoute); // Rute untuk absensi
app.use(AlphaRoute); // Rute untuk alpha
app.use(AuthRoute); // Rute untuk autentikasi
app.use(HariLiburRoute); // Rute untuk hari libur
app.use(RoleRoute); // Rute untuk role
app.use(SettingRoute); // Rute untuk setting
app.use(SuratRoute); // Rute untuk surat
app.use(UserRoute); // Rute untuk pengguna

store.sync(); // Menyinkronkan tabel session dengan database

app.listen(process.env.APP_PORT, "0.0.0.0", () => {
  console.log("Server up and Running...."); // Menjalankan server pada port yang ditentukan
});
