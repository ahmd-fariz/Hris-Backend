import UserModel from "../models/UserModel.js"; // Mengimpor model UserModel dari file models/UserModel.js
import RoleModel from "../models/Role.js"; // Mengimpor model RoleModel dari file models/RoleModel.js
import path from "path"; // Mengimpor modul path untuk manipulasi path file
import fs from "fs"; // Mengimpor modul fs untuk operasi file system
import argon2 from "argon2"; // Mengimpor argon2 untuk hashing password
import { API_Backend } from "../api/api.js";

// Fungsi untuk membuat pengguna baru
export const CreateUser = async (req, res) => {
  const { name, email, password, confPassword, roleId } = req.body;
  if (password !== confPassword)
    return res
      .status(400)
      .json({ msg: "Password Dan Confirm Password Tidak Cocok" }); // Mengirimkan respon dengan status 400 jika password dan confirm password tidak cocok

  if (password.length < 8)
    return res.status(400).json({ msg: "Password harus minimal 8 karakter" }); // Mengirimkan respon dengan status 400 jika password kurang dari 8 karakter

  const hashPassword = await argon2.hash(password); // Meng-hash password menggunakan argon2

  // Mengambil file yang diunggah
  const file = req.files.file;
  const fileSize = file.data.length; // Mengukur ukuran file
  const ext = path.extname(file.name); // Mendapatkan ekstensi file
  const fileName = file.md5 + ext; // Membuat nama file berdasarkan hash MD5 dan ekstensi
  const url = `${API_Backend}/images/${fileName}`; // Membuat URL file gambar
  const allowedType = [".png", ".jpg", ".jpeg"]; // Daftar ekstensi file gambar yang diizinkan

  if (!allowedType.includes(ext.toLowerCase()))
    return res.status(422).json({ msg: "Invalid Images" }); // Mengirimkan respon dengan status 422 jika ekstensi file tidak valid

  if (fileSize > 5000000)
    return res.status(422).json({ msg: "Image must be less than 5 MB" }); // Mengirimkan respon dengan status 422 jika ukuran file melebihi 5 MB

  const uploadPath = `./public/images/${fileName}`; // Path untuk menyimpan file yang diunggah

  // Simpan file ke direktori
  file.mv(uploadPath, async (err) => {
    if (err) return res.status(500).json({ msg: err.message }); // Mengirimkan respon dengan status 500 jika terjadi kesalahan saat memindahkan file
    try {
      await UserModel.create({
        name: name,
        email: email,
        password: hashPassword,
        roleId: roleId,
        image: fileName,
        url,
      });
      res.status(201).json({ msg: "Register Berhasil" }); // Mengirimkan respon dengan status 201 jika pendaftaran berhasil
    } catch (error) {
      res.status(400).json({ msg: error.message }); // Mengirimkan respon dengan status 400 jika terjadi kesalahan saat menyimpan data
    }
  });
};

// Fungsi untuk mendapatkan detail pengguna berdasarkan id
export const GetUsersById = async (req, res) => {
  try {
    const response = await UserModel.findOne({
      attributes: ["id", "name", "email", "password", "roleId", "status", "url"], // Mengambil atribut id, name, email, password, roleId, dan url dari model UserModel
      where: {
        id: req.params.id, // Mencari pengguna berdasarkan id dari parameter route
      },
      include: [
        {
          model: RoleModel,
          attributes: ["nama_role", "jam_pulang", "denda_telat"], // Mengambil atribut name dari model RoleModel
        },
      ],
    });
    res.status(200).json(response); // Mengirimkan respon dengan status 200 dan data pengguna dalam format JSON
  } catch (error) {
    res.status(500).json({ msg: error.message }); // Mengirimkan respon dengan status 500 dan pesan error jika terjadi kesalahan
  }
};

// Fungsi untuk mendapatkan semua pengguna
export const GetUsers = async (req, res) => {
  try {
    const response = await UserModel.findAll({
      attributes: ["id", "name", "email", "roleId", "status", "url"], // Mengambil atribut id, name, email, roleId, dan image dari model UserModel
      include: [
        {
          model: RoleModel,
          attributes: ["nama_role", "jam_pulang", "denda_telat"], // Mengambil atribut name dari model RoleModel
        },
      ],
    });
    res.status(200).json(response); // Mengirimkan respon dengan status 200 dan data pengguna dalam format JSON
  } catch (error) {
    res.status(500).json({ msg: error.message }); // Mengirimkan respon dengan status 500 dan pesan error jika terjadi kesalahan
  }
};

// Fungsi untuk mendapatkan foto absensi pengguna
export const GetUserFotoAbsen = async (req, res) => {
  try {
    const response = await UserModel.findAll({
      attributes: ["id", "url_foto_absen", "name"], // Mengambil atribut id, url_foto_absen, dan name dari model UserModel
    });
    res.status(200).json(response); // Mengirimkan respon dengan status 200 dan data foto absensi dalam format JSON
  } catch (error) {
    res.status(500).json({ msg: error.message }); // Mengirimkan respon dengan status 500 dan pesan error jika terjadi kesalahan
  }
};

// Fungsi untuk mendapatkan pengguna berdasarkan roleId
export const GetUsersByRole = async (req, res) => {
  try {
    const response = await UserModel.findAll({
      attributes: ["id", "name", "email", "roleId", "image", "url_foto_absen", "status"], // Mengambil atribut id, name, email, roleId, image, dan url_foto_absen dari model UserModel
      where: {
        roleId: req.params.roleId, // Mencari pengguna berdasarkan roleId dari parameter route
      },
      include: [
        {
          model: RoleModel,
          attributes: ["nama_role", "jam_pulang", "denda_telat"], // Mengambil atribut name dari model RoleModel
        },
      ],
    });
    if (response.length === 0)
      return res
        .status(404)
        .json({ msg: "Tidak ada pengguna dengan roleId ini" }); // Mengirimkan respon dengan status 404 jika tidak ada pengguna dengan roleId tersebut
    res.status(200).json(response); // Mengirimkan respon dengan status 200 dan data pengguna dalam format JSON
  } catch (error) {
    res.status(500).json({ msg: error.message }); // Mengirimkan respon dengan status 500 dan pesan error jika terjadi kesalahan
  }
};

// Fungsi untuk memperbarui data pengguna
export const UpdateUser = async (req, res) => {
  const user = await UserModel.findOne({
    where: {
      id: req.params.id, // Mencari pengguna berdasarkan id dari parameter route
    },
  });

  if (!user) return res.status(404).json({ msg: "User Tidak di Temukan" }); // Mengirimkan respon dengan status 404 jika pengguna tidak ditemukan

  const { name, email, password, confPassword, roleId } = req.body;
  let hashPassword = user.password; // Menggunakan password lama jika tidak ada perubahan
  let fileName = user.image; // Menggunakan nama file gambar lama jika tidak ada file baru

  if (req.files) {
    // Mengecek apakah ada file yang diunggah
    const file = req.files.file; // Mengambil file dari req.files
    const fileSize = file.data.length; // Mengukur ukuran file
    const ext = path.extname(file.name); // Mendapatkan ekstensi file
    fileName = file.md5 + ext; // Membuat nama file baru berdasarkan hash MD5 dan ekstensi
    const allowedType = [".png", ".jpg", ".jpeg"]; // Daftar ekstensi file gambar yang diizinkan

    if (!allowedType.includes(ext.toLowerCase()))
      return res.status(422).json({ msg: "Invalid Images" }); // Mengirimkan respon dengan status 422 jika ekstensi file tidak valid

    if (fileSize > 5000000)
      return res.status(422).json({ msg: "Image must be less than 5 MB" }); // Mengirimkan respon dengan status 422 jika ukuran file melebihi 5 MB

    // Hapus file lama dari direktori
    const filepath = `./public/images/${user.image}`;
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath); // Menghapus file jika ada
    }

    // Simpan file baru ke direktori
    file.mv(`./public/images/${fileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message }); // Mengirimkan respon dengan status 500 jika terjadi kesalahan saat memindahkan file
    });
  }

  const url = `${API_Backend}/images/${fileName}`; // Membuat URL file gambar baru

  if (password && password !== user.password) {
    // Jika ada perubahan password
    if (password !== confPassword)
      return res
        .status(400)
        .json({ msg: "Password Dan Confirm Password Tidak Cocok" }); // Mengirimkan respon dengan status 400 jika password dan confirm password tidak cocok

    hashPassword = await argon2.hash(password); // Meng-hash password baru
  }

  // Memperbarui data pengguna
  try {
    await UserModel.update(
      {
        name: name,
        email: email,
        password: hashPassword,
        roleId: roleId,
        image: fileName,
        url,
      },
      {
        where: {
          id: user.id, // Memperbarui data berdasarkan id
        },
      }
    );
    res.status(201).json({ msg: "Update Berhasil" }); // Mengirimkan respon dengan status 201 jika pembaruan berhasil
  } catch (error) {
    res.status(400).json({ msg: error.message }); // Mengirimkan respon dengan status 400 jika terjadi kesalahan saat memperbarui data
  }
};

// Fungsi untuk memperbarui foto profil pengguna
export const UpdatePotoProfile = async (req, res) => {
  const user = await UserModel.findOne({
    where: {
      id: req.params.id, // Mencari pengguna berdasarkan id dari parameter route
    },
  });

  if (!user) return res.status(404).json({ msg: "User Tidak di Temukan" }); // Mengirimkan respon dengan status 404 jika pengguna tidak ditemukan

  let fileName = user.image; // Menggunakan nama file gambar lama jika tidak ada file baru

  if (req.files) {
    // Mengecek apakah ada file yang diunggah
    const file = req.files.file; // Mengambil file dari req.files
    const fileSize = file.data.length; // Mengukur ukuran file
    const ext = path.extname(file.name); // Mendapatkan ekstensi file
    fileName = file.md5 + ext; // Membuat nama file baru berdasarkan hash MD5 dan ekstensi
    const allowedType = [".png", ".jpg", ".jpeg"]; // Daftar ekstensi file gambar yang diizinkan

    if (!allowedType.includes(ext.toLowerCase()))
      return res.status(422).json({ msg: "Invalid Images" }); // Mengirimkan respon dengan status 422 jika ekstensi file tidak valid

    if (fileSize > 5000000)
      return res.status(422).json({ msg: "Image must be less than 5 MB" }); // Mengirimkan respon dengan status 422 jika ukuran file melebihi 5 MB

    // Hapus file lama dari direktori
    const filepath = `./public/images/${user.image}`;
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath); // Menghapus file jika ada
    }

    // Simpan file baru ke direktori
    file.mv(`./public/images/${fileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message }); // Mengirimkan respon dengan status 500 jika terjadi kesalahan saat memindahkan file
    });
  }

  // Membuat URL file gambar baru
  const url = `${API_Backend}/images/${fileName}`;
  try {
    await UserModel.update(
      {
        image: fileName,
        url,
      },
      {
        where: {
          id: user.id, // Memperbarui data pengguna berdasarkan id
        },
      }
    );
    res.status(201).json({ msg: "Update Foto Berhasil" }); // Mengirimkan respon dengan status 201 jika pembaruan berhasil
  } catch (error) {
    res.status(400).json({ msg: error.message }); // Mengirimkan respon dengan status 400 jika terjadi kesalahan saat memperbarui data
  }
};

// Fungsi untuk memperbarui foto absensi pengguna
export const UpdateForFotoAbsen = async (req, res) => {
  const user = await UserModel.findOne({
    where: {
      id: req.params.id, // Mencari pengguna berdasarkan id dari parameter route
    },
  });

  if (!user) return res.status(404).json({ msg: "User Tidak di Temukan" }); // Mengirimkan respon dengan status 404 jika pengguna tidak ditemukan

  let fileName = user.foto_absen; // Menggunakan nama file foto absensi lama jika tidak ada file baru

  if (req.files) {
    // Mengecek apakah ada file yang diunggah
    const file = req.files.file; // Mengambil file dari req.files
    const fileSize = file.data.length; // Mengukur ukuran file
    const ext = path.extname(file.name); // Mendapatkan ekstensi file
    fileName = file.md5 + ext; // Membuat nama file baru berdasarkan hash MD5 dan ekstensi
    const allowedType = [".png", ".jpg", ".jpeg"]; // Daftar ekstensi file gambar yang diizinkan

    if (!allowedType.includes(ext.toLowerCase()))
      return res.status(422).json({ msg: "Invalid Images" }); // Mengirimkan respon dengan status 422 jika ekstensi file tidak valid

    if (fileSize > 5000000)
      return res.status(422).json({ msg: "Image must be less than 5 MB" }); // Mengirimkan respon dengan status 422 jika ukuran file melebihi 5 MB

    // Tambahkan kode ini untuk memastikan folder ada
    const dir = './public/absen';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }); // Membuat folder jika belum ada
    }

    // Simpan file baru ke direktori absensi
    file.mv(`./public/absen/${fileName}`, (err) => {
      if (err) return res.status(500).json({ msg: err.message }); // Mengirimkan respon dengan status 500 jika terjadi kesalahan saat memindahkan file
    });
  }

  // Membuat URL file foto absensi baru
  const url_foto_absen = `${API_Backend}/absen/${fileName}`;

  try {
    await UserModel.update(
      {
        foto_absen: fileName,
        url_foto_absen,
      },
      {
        where: {
          id: req.params.id, // Memperbarui data pengguna berdasarkan id
        },
      }
    );
    res.status(201).json({ msg: "Update Berhasil" }); // Mengirimkan respon dengan status 201 jika pembaruan berhasil
  } catch (error) {
    res.status(400).json({ msg: error.message }); // Mengirimkan respon dengan status 400 jika terjadi kesalahan saat memperbarui data
  }
};

// Fungsi untuk memperbarui status pengguna
export const UpdateUserStatus = async (req, res) => {
  const user = await UserModel.findOne({
    where: {
      id: req.params.id, // Mencari pengguna berdasarkan id dari parameter route
    },
  });

  if (!user) return res.status(404).json({ msg: "User Tidak di Temukan" }); // Mengirimkan respon dengan status 404 jika pengguna tidak ditemukan

  const { status } = req.body; // Mengambil status baru dari body permintaan

  try {
    await UserModel.update(
      {
        status, // Memperbarui status pengguna
      },
      {
        where: {
          id: user.id, // Memperbarui data pengguna berdasarkan id
        },
      }
    );
    res.status(200).json({ msg: "Status Berhasil Diperbarui" }); // Mengirimkan respon dengan status 200 jika pembaruan berhasil
  } catch (error) {
    res.status(400).json({ msg: error.message }); // Mengirimkan respon dengan status 400 jika terjadi kesalahan saat memperbarui data
  }
};

// Fungsi untuk menghapus pengguna
export const DeleteUser = async (req, res) => {
  try {
    const user = await UserModel.findOne({
      where: {
        id: req.params.id, // Mencari pengguna berdasarkan id dari parameter route
      },
    });

    if (!user) return res.status(404).json({ msg: "User tidak ditemukan" }); // Mengirimkan respon dengan status 404 jika pengguna tidak ditemukan

    // Hapus file gambar dari direktori
    const filepath = `./public/images/${user.image}`;
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath); // Menghapus file jika ada
    }

    await user.destroy(); // Menghapus data pengguna dari database

    res
      .status(200)
      .json({ msg: `Berhasil Delete Data Dengan Username ${user.name}` }); // Mengirimkan respon dengan status 200 jika penghapusan berhasil
  } catch (error) {
    res.status(400).json({ msg: error.message }); // Mengirimkan respon dengan status 400 jika terjadi kesalahan saat menghapus data
  }
};

