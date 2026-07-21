# Task: Seed từ vựng vào D1 từ data đã chuẩn bị sẵn

## Input (3 file trong `scripts/seed-vocab/data/` — tôi sẽ copy vào repo)
1. **`vocab-enriched-batch1.json`** — 199 từ ĐÃ enrich đầy đủ (word, meaning_vi, example, ipa, band, domain, pos, state). Đây vừa là data seed đợt 1, vừa là **chuẩn chất lượng (few-shot reference)** cho phần enrich còn lại.
2. **`wordlist-general.json`** — 7.292 từ general A1→C1, có band + IPA (nguồn: Oxford 5000 + CEFR-J + ipa-dict). Từ nào có `"enriched": true` là đã nằm trong batch1, bỏ qua.
3. **`wordlist-domain.json`** — 104 từ chuyên ngành (Lập trình / Kinh tế / Xã hội / Văn học) có band + IPA. Entry có `"ipa_source": "manual"` là IPA điền tay (tech terms không có trong dict) — giữ nguyên, không cần verify lại. Từ có `"enriched": true` bỏ qua.

Lưu ý: 203 từ trong wordlist-general đã được gán sẵn `domain` (từ vừa general vừa chuyên ngành) — giữ nguyên giá trị đó khi seed.

## Việc 1 — Seed batch1 ngay (không cần LLM)
1. Đọc `server/database/schema.ts`, map field của JSON vào cột bảng vocab. Field nào schema không có thì báo tôi trước khi tự ý thêm cột.
2. Validate toàn bộ 199 entries bằng Zod (word non-empty, band ∈ A1..C1, state = 'New').
3. Sinh `seed-batch1.sql` — INSERT batch tối đa 500 rows/statement, có `ON CONFLICT (word) DO NOTHING` (hoặc cơ chế idempotent tương đương theo schema).
4. Apply local: `wrangler d1 execute <db> --local --file=...` → verify count + spot-check 5 rows → báo tôi trước khi apply `--remote`.

## Việc 2 — Enrich phần còn lại (~7.190 từ, chạy sau khi tôi duyệt batch1)
Viết pipeline theo prompt seed-vocab đã có trong project knowledge, với các điều chỉnh:
- Input là 2 wordlist trên (KHÔNG cần fetch dataset nữa — bước 01, 02 của pipeline cũ bỏ qua)
- Chỉ enrich entry chưa có `enriched: true`
- **Chuẩn chất lượng = batch1**: đưa 5–8 entry mẫu từ `vocab-enriched-batch1.json` (đủ band, đủ domain) vào prompt LLM làm few-shot. Yêu cầu giữ đúng phong cách: nghĩa VI ngắn gọn có chú thích trong ngoặc khi cần, ví dụ 1 câu tự nhiên, độ khó câu tương xứng band, thuật ngữ lập trình thì ví dụ mang ngữ cảnh kỹ thuật thật
- Batch 50 từ/request, checkpoint resume, Zod validate, failed.json — như pipeline gốc
- Model dùng loại nhỏ/rẻ (Haiku hoặc tương đương) — việc này không cần model lớn
- Chạy thử 100 từ đầu → dừng cho tôi review → mới chạy full

## Acceptance criteria
1. Batch1: 199 rows trong D1 local, đúng schema, chạy lại script không duplicate
2. Câu "SELECT band, COUNT(*) GROUP BY band" khớp phân bổ file nguồn
3. Pipeline enrich: resume được, failed.json rỗng hoặc có lý do
4. Không commit file chứa API key; input JSON được commit (data không nhạy cảm)
