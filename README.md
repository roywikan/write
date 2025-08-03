# Mind Mapper - Editor Peta Pikiran Berbasis Web

![Screenshot Aplikasi Mind Mapper](link_ke_screenshot_anda.png)

Aplikasi web editor peta pikiran (mind map) yang intuitif dan kaya fitur. Dibuat dengan HTML, CSS, dan JavaScript murni, memanfaatkan kekuatan pustaka D3.js untuk visualisasi dan Quill.js untuk pengeditan teks.

**[Lihat Versi Live di GitHub Pages!](https://roywikan.github.io/write/)**

---

## ✨ Fitur Utama

- **Visualisasi Hierarkis:** Buat dan kelola struktur peta pikiran dengan mudah.
- **Manajemen Node Interaktif:**
    - **Pilih & Edit:** Klik satu kali untuk memilih node dan mengedit judul serta kontennya di panel samping.
    - **Collapse & Expand:** Klik dua kali pada sebuah node untuk menyembunyikan atau menampilkan cabangnya.
    - **Drag & Drop:** Pindahkan node dengan mudah untuk mengubah strukturnya menjadi anak dari node lain.
- **Editor Teks Kaya (Rich Text Editor):**
    - Didukung oleh [Quill.js](https://quilljs.com/), mendukung format seperti **tebal**, *miring*, <u>garis bawah</u>, dan hyperlink.
- **Pencarian Cerdas:**
    - Cari node berdasarkan judul atau kontennya.
    - Node yang cocok akan disorot secara visual di peta pikiran.
    - Kata kunci yang dicari akan di-highlight langsung di dalam editor teks saat node dipilih.
- **Ekspor Serbaguna:**
    - **Ekspor ke DOCX:** Menghasilkan file `.docx` yang terstruktur rapi dengan penomoran, format teks, dan hyperlink yang dapat diklik, kompatibel dengan Microsoft Word dan Google Docs.
    - **Ekspor ke TXT:** Menghasilkan outline teks biasa yang bersih dan mudah dibaca.
- **Keamanan Data:**
    - **Indikator Perubahan:** Notifikasi visual (judul tab dengan `*` dan tombol "Save As" yang berdenyut) akan muncul jika ada perubahan yang belum disimpan.
    - **Peringatan Saat Menutup:** Browser akan menampilkan dialog konfirmasi jika Anda mencoba menutup halaman dengan pekerjaan yang belum disimpan.
- **Manajemen File:**
    - Buat peta pikiran baru, buka file `.json` yang ada, dan simpan pekerjaan Anda sebagai file `.json`.
- **Keyboard Shortcuts:**
    - `Ctrl + S`: Simpan sebagai file `.json` (memicu dialog "Save As...").
    - `Ctrl + N`: Buat peta pikiran baru.
    - `Ctrl + E`: Ekspor sebagai file `.txt`.
    - `Ctrl + D`: Ekspor sebagai file `.docx`.
    - `Delete` / `Backspace`: Hapus node yang sedang dipilih.

---

## 🛠️ Teknologi yang Digunakan

- **[D3.js](https://d3js.org/):** Untuk rendering dan manipulasi visualisasi data (peta pikiran).
- **[Quill.js](https://quilljs.com/):** Sebagai editor teks kaya.
- **[FileSaver.js](https://github.com/eligrey/FileSaver.js/):** Untuk fungsionalitas menyimpan file di sisi klien.
- **[docx](https://docx.js.org/):** Untuk membuat dan mengekspor file `.docx` dari JavaScript.

---

## 🚀 Cara Menjalankan

Proyek ini adalah aplikasi web statis dan dapat dibuka langsung di browser.

1.  **Clone Repositori:**
    ```bash
    git clone https://github.com/roywikan/write.git
    ```
2.  **Buka `index.html`:**
    Cukup buka file `index.html` di browser web modern pilihan Anda (seperti Chrome atau Firefox).

---

## 📜 Lisensi

Proyek ini dilisensikan di bawah [Lisensi MIT](LICENSE.md).
