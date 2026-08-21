# SHT Development SOP (locked flow)
> Diadaptasi dari **OneMission Development SOP** milik kang Adit, diterapkan ke project **Sudut Haramain Tour (SHT)**.
> Status: **LOCKED** (21 Agustus 2026) — jadi aturan final project SHT.
> Keputusan bootstrap: (1) agent diizinkan initial commit sekali; (2) PAT akan disiapkan kang untuk push ke `dev`; (3) stack dari dokumen bisnis.

## 1. Repository Scope
Jangan mencampur source code antar-repo.

| Repository | Tanggung Jawab |
|---|---|
| **sht-web** | Frontend customer: homepage, panduan, katalog layanan, direktori/paket, estimator, halaman publik, CTA WhatsApp. |
| **sht-admin** | Admin/HQ: backend, manajemen konten, layanan & harga, data hotel, user, leads/pendaftaran, settings. |

*(Pembagian detail akan dikunci final setelah dokumen bisnis diterima.)*

## 2. Branch Responsibility
| Branch | Fungsi | Rule |
|---|---|---|
| `main` | Production | **Protected. Jangan push/merge langsung.** |
| `dev` | Integration / staging / development | Source utama untuk feature branch. |
| `feature/*` | Task-specific development | Implement → test/build → commit → push → **STOP**. |
| `hotfix/*` | Urgent production fix | Branch dari `main`, push hotfix only, **user yang merge**. |

**RULE UTAMA:** Jangan pernah push atau merge ke `main`. Kata "gas", "lanjut", "selesaikan", atau "deploy" **bukan** izin untuk push/merge ke `main`.

## 3. Normal Feature Flow
```bash
git fetch origin --prune
git checkout dev
git pull --ff-only origin dev
git checkout -B feature/<task-name>
# implementasi...
npm install
npm run build
# jika ada test terkait:
# npx tsx --tsconfig jsconfig.json --test tests/<test-file>.test.js
git add .
git commit -m "feat(scope): message"
git push -u origin feature/<task-name>
```
Setelah push: **STOP**. Jangan merge ke dev/main.

## 4. Small Change Flow
Perubahan kecil yang eksplisit aman boleh langsung di `dev`: pull dulu → implement → `npm run build` → commit `fix(scope): message` → push `dev` → **STOP**. Jangan dipakai untuk fitur besar/berisiko.

## 5. Hotfix Flow
Branch dari `main` (bukan dev): fetch → checkout main → pull → `git checkout -B hotfix/<fix-name>` → implement → build → commit → push `hotfix/<fix-name>`. **User yang merge ke main.** Setelah production aman, sinkron balik ke `dev` via workflow manual/user.

## 6. Code Change Rules
- Audit existing implementation sebelum coding.
- Reuse architecture & service existing; jangan buat parallel implementation.
- Jangan refactor unrelated code. Jangan ubah module di luar scope task.
- Jangan ubah database schema kecuali memang diperlukan task.
- Jangan hapus/rusak fitur existing yang masih dipakai.
- Jangan mencampur kode antar repository.
- Jika build/typecheck/test gagal, jelaskan apakah failure terkait task atau known unrelated issue.

## 7. Validation Rules
Minimal `npm run build` di project yang diubah. Jalankan test terkait bila tersedia. Jangan sentuh perubahan di luar scope untuk memperbaiki known unrelated issue kecuali user meminta.

## 8. Final Report Format
Setiap task selesai wajib report:
```
Branch:
Commit:
Files changed:
Validation:
Build:
Tests:
PR/Merge-ready:
Pull command:
```
Pull command contoh:
```bash
git fetch origin
git checkout feature/<task-name>
git pull --ff-only origin feature/<task-name>
# jika local branch belum ada:
git checkout -b feature/<task-name> origin/feature/<task-name>
```

## 9. User Communication
- Panggil user **"kang"** atau **"a"**. Jangan "mas".
- Gaya singkat, langsung eksekusi, report tetap lengkap.
- Major work boleh mulai dengan **"Bismillah kang"**.

## 10. GitHub Push Authentication
Jika credential tersedia hanya sementara, pakai temporary auth header. **Jangan simpan token** di remote URL, git config, file repo, atau .env.
```bash
TOKEN='...'
AUTH=$(printf 'x-access-token:%s' "$TOKEN" | base64 | tr -d '\n')
git -c http.extraHeader="Authorization: Basic $AUTH" push -u origin feature/<branch>
unset TOKEN AUTH
```
Jika token tidak ada / push gagal auth → laporkan branch & commit lokal ada tapi push terblokir credential.

## 11. Absolute Donts
- ❌ Push ke main. ❌ Merge ke main.
- ❌ Merge feature ke dev kecuali user eksplisit meminta.
- ❌ Deploy production atas inisiatif sendiri.
- ❌ Simpan secret/token ke repo.
- ❌ Ubah unrelated code demi "perfect cleanup".

## 12. Quick Summary
```
dev → feature/* → implement → test/build → commit → push feature/* → report → STOP
main = production, protected, user-controlled.
```

---
## ⚠️ Catatan Adaptasi khusus SHT (butuh keputusan kang)
1. **Repo masih kosong (0 commit).** Flow ini mengasumsikan `main` & `dev` sudah ada. Untuk bootstrap awal, perlu keputusan: kang yang buat initial commit, atau kasih izin eksplisit saya membuat initial commit di `main` lalu buat branch `dev` — ini satu-satunya pengecualian, sekali saja.
2. **Push ke GitHub butuh token** (repo public, tapi push tetap butuh auth). Nanti saat fase push, kang perlu kasih PAT sementara via flow section 10, atau kang push sendiri dari local saya.
3. **Perintah validasi** (`npm run build`, dst.) menyesuaikan stack final yang dipilih setelah dokumen bisnis diterima.
