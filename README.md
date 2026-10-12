# Video Marker

Website lokal untuk memberi penanda waktu pada video tutorial, lalu berpindah ke penanda sebelumnya/berikutnya.

## Kebutuhan
- Node.js versi 20 atau lebih baru (disarankan)
- npm

## Menjalankan

Buka terminal di folder proyek ini, lalu jalankan:

```bash
npm install
npm run dev
```

Buka URL lokal yang ditampilkan Vite, biasanya `http://localhost:5173`.

Untuk memeriksa build produksi:

```bash
npm run build
npm run preview
```

## Cara pakai
1. Klik **Pilih video** dan pilih file video lokal.
2. Putar video dan jeda saat tampilan tombol berubah.
3. Opsional: isi nama penanda, misalnya `Chord 1`.
4. Klik **Tambah penanda** atau tekan `M`.
5. Gunakan tombol Sebelumnya/Berikutnya atau panah kiri/kanan untuk berpindah penanda.
6. Klik sebuah penanda di daftar atau timeline untuk melompat langsung ke waktu itu.
7. Nama penanda dapat diedit langsung di daftar.
8. Penanda disimpan otomatis di localStorage browser. Tombol impor/ekspor di daftar digunakan untuk memindahkan data penanda sebagai JSON.

## Shortcut
- `Space`: putar/jeda video
- `M`: tambah penanda
- `←`: penanda sebelumnya
- `→`: penanda berikutnya
- `Q`: tambah penanda
- `A`: penanda sebelumnya
- `D`: penanda berikutnya

Shortcut hanya bekerja saat fokus tidak berada di kolom input.

## Catatan
- Video tidak diunggah ke server; browser membuka file lokal.
- Penanda tersimpan berdasarkan nama file, ukuran, dan waktu modifikasi. Jika file yang sama dipilih lagi pada browser yang sama, penanda akan dimuat kembali.
- File JSON penanda tidak menyertakan video itu sendiri.