# Hệ thống Pháp bảo V1.6 – Equipment & Artifact System V2.0

Bảng 36 công thức + chỉ số + nội tại: **[ARTIFACTS.md](ARTIFACTS.md)** (sinh từ dữ liệu). Giá trị biên đo được của từng món: **[ARTIFACT-BALANCE.md](ARTIFACT-BALANCE.md)**. Kết quả kiểm thử: **[V1.6-REPORT.md](V1.6-REPORT.md)**.

## 1. Tệp mã

| Tệp | Nội dung |
|---|---|
| `js/data/artifacts.js` | Dữ liệu: 8 nguyên liệu (`COMPONENTS`), 36 pháp bảo (`ARTIFACT_LIST` → `ARTIFACTS`, `RECIPES`), 29 loại nội tại (`PASSIVE_KINDS` – mô tả sinh từ tham số), `recipeOf` (A+B = B+A), `validateArtifacts`, `LEGACY_ITEM_MAP` |
| `js/items/artifact-system.js` | `ArtifactInventory` (sổ vật phẩm + giao dịch nguyên tử), `ArtifactCraftingSystem`, `ArtifactEquipment`, `ArtifactStats` (lớp chỉ số trang bị), `ArtifactRewards` (PvE), cid bản sao tướng |
| `js/items/artifact-passives.js` | `ArtifactPassives` (nội tại trong trận, theo bước mô phỏng) + `ArtifactVFX` (hiệu ứng theo nhóm, theo mức đồ hoạ) |
| `js/items/artifact-ui.js` | `ArtifactUI`: dock Kho pháp bảo, ghép, kéo thả / chạm, tooltip, xem trước chỉ số, 3 ô trên bảng thông tin tướng, bảng 36 công thức |
| `js/items/equipment-test-runner.js` | `EquipmentTestRunner.run()` – kiểm thử trong game (console / bảng Debug), chạy trên bản chụp sandbox |
| `tests/equipment.js` · `tests/artifact-balance.js` · `tools/gen-artifacts-doc.js` | Kiểm thử giao diện chuột / cảm ứng · thí nghiệm giá trị biên · sinh ARTIFACTS.md |

Móc vào mã cũ (nhỏ, có chú thích): `Unit.items` (getter đọc sổ), `Unit.computeStats` (tách công thức chỉ số), `critNow`; `DamageCalculator` (chí mạng / sát thương chí mạng / sát thương kỹ năng theo trang bị); `dealDamage` (Bất Diệt Thần Giáp `onLethal`, phát `crit` cho sự kiện); `applyStun` (`onCC`); `TraitEngine.computeBonus` (lớp trang bị); `simStep` (`ArtifactPassives.update`); `startBattle` / `setupRound`; mua / bán / gộp sao / lưu / tải trong `14-game.js`.

## 2. Mô hình dữ liệu – không mất, không nhân đôi

Một **sổ duy nhất** `ArtifactInventory.recs: Map<instanceId, record>`:

```
{ instanceId: 'it17',            // vật phẩm cụ thể – số tăng dần, không dùng lại
  itemId: 'tru_tien_kiem',       // loại (nguyên liệu / pháp bảo)
  loc: 'inv' | 'unit',           // trong kho hoặc trên tướng
  ownerId: 'c12' | null,         // mã bản sao tướng (cid) khi loc = 'unit'
  slot: 0..9 (kho) | 10..39 (ô tạm giữ) | 0..2 (ô trang bị) }
```

* Tướng **không giữ bản sao danh sách đồ**: `Unit.items` đọc thẳng từ sổ theo `cid` (lưu đệm theo phiên bản sổ). Mỗi vật phẩm là một bản ghi có đúng một `loc` → không thể ở hai nơi.
* `cid` đi theo bản sao tướng khi chuyển hàng chờ ↔ bàn, đổi chỗ, lưu / tải; khi nâng sao, bản chính giữ `cid`.
* **Giao dịch nguyên tử** `ArtifactInventory.tx(label, ids, fn)`: chép sổ → chạy `fn` → kiểm tra bất biến (`check`) → lỗi / bất biến sai thì **khôi phục nguyên trạng**. Không cho lồng giao dịch; vật phẩm đang **giữ chỗ** (chờ người chơi xác nhận ghép) bị từ chối ở mọi giao dịch khác. Mọi thao tác (ghép, trang bị, chuyển, tháo, bán, nâng sao, thưởng, sắp xếp kho) đều đi qua `tx`.
* Bất biến: instanceId duy nhất, loại hợp lệ, mỗi ô kho / ô trang bị một vật phẩm, tối đa 3 món / tướng, chỉ **pháp bảo** được trang bị; `audit()` thêm: mọi chủ sở hữu đang tồn tại.
* **Ô tạm giữ** (30 ô sau 10 ô kho): đồ trả về khi kho đầy (bán tướng, nâng sao, phần thưởng) vào đây thay vì mất; hiển thị viền đỏ "tạm" + cảnh báo. Ghép / trang bị lấy được từ ô tạm giữ. Hết cả ô tạm giữ thì thao tác bị huỷ (bán / nâng sao không xảy ra).

## 3. Quy tắc

| Thao tác | Quy tắc |
|---|---|
| Ghép | 2 nguyên liệu khác instance, cùng trong kho, có công thức → tiêu hao đúng 2, tạo đúng 1 pháp bảo ở ô của nguyên liệu thứ nhất. Có bước **xem trước + xác nhận**; khi chờ xác nhận 2 nguyên liệu bị giữ chỗ. Bấm liên tục chỉ ghép 1 lần. Không ghép pháp bảo hoàn chỉnh. Không ghép lúc giao chiến. |
| Trang bị | Chỉ ở giai đoạn chuẩn bị; chỉ pháp bảo; chỉ tướng phe ta (bàn hoặc hàng chờ); tối đa 3. Trang bị một món đang ở tướng khác = **chuyển** (tướng cũ mất món đó). |
| Tháo | Nút ↩ trên ô trang bị (bảng thông tin tướng) → về ô kho thường; kho đầy thì từ chối. |
| Bán tướng | Mọi pháp bảo về kho (thường trước, tạm giữ sau) **trước** khi bán; không đủ chỗ → không bán. |
| Nâng sao | Bản chính (trên bàn, nếu không thì bản hàng chờ đầu) **giữ đồ đang mang**; ô trống nhận đồ của 2 bản phụ theo thứ tự; dư về kho / ô tạm giữ; hết chỗ → huỷ lần nâng sao này (lần mua cũng được hoàn tiền nếu cần chỗ hàng chờ). |
| Tướng chết / hết vòng | Không ảnh hưởng (đồ ở sổ, không ở đối tượng 3D). |
| Giao chiến | Kho ẩn, mọi giao dịch đổi đồ bị từ chối. |

## 4. Quy trình chỉ số

`Gốc → × sao → × (1 + Σ% tộc/hệ) → + trang bị → hiệu ứng tạm thời (StatusEffectManager) → chỉ số cuối` (`Unit.computeStats`, `TraitEngine.computeBonus` → `ArtifactStats.apply`).

* **Cộng thẳng**: công (+10/linh kiếm), phép thuật (AP), giáp, kháng phép, máu, năng lượng khởi đầu.
* **Phần trăm cộng dồn**: tốc đánh (cộng vào hệ số tộc/hệ), chí mạng, sát thương chí mạng, hút máu, hút máu toàn phần, sát thương kỹ năng.
* **Tạm thời** (trạng thái có thời hạn, đồng hồ mô phỏng): giảm giáp / kháng phép, tăng tốc đánh, giảm sát thương nhận, cộng dồn công theo thời gian, khiên.
* **Hồi chiêu**: hồi máu khi thi triển (2 s), năng lượng khi nhận đòn (0,5 s), năng lượng khi chí mạng (0,5 s).
* **Một lần mỗi trận**: khiên máu thấp, Bất Diệt (giữ 1 máu), giải khống chế, khiên / giảm sát thương đầu trận.
* Hàm thuần, dựng lại từ đầu mỗi lần đội hình đổi → vẽ giao diện bao nhiêu lần cũng không cộng dồn (kiểm thử #17).

## 5. Nội tại và chuỗi sự kiện

Nghe sự kiện qua `TraitEvents` (đăng ký khi vào trận, gỡ khi hết trận) + 2 móc (`onLethal`, `onCC`) + `update(dt)` theo bước mô phỏng.

| Nguồn kích hoạt | Điều kiện | Có thể kích hoạt sự kiện tiếp? |
|---|---|---|
| Đòn đánh thường trúng (`opts.attack`, không proc / dot) | sét mỗi đòn thứ 3, tia phụ, cộng dồn tốc đánh, giảm giáp, năng lượng, hồi máu, kết liễu, chí mạng → tốc đánh / năng lượng / chí mạng | Sát thương phụ mang `proc` → **không** kích hoạt nội tại nào |
| Kỹ năng gốc trúng (`opts.skill`, không proc) | giảm kháng phép | Không |
| Nhận đòn đánh thường | phản đòn (sát thương phép `proc + reflect`), năng lượng khi bị đánh, khiên máu thấp | Phản đòn **không** bị phản lại (không vòng lặp) |
| Thi triển | tốc đánh, hồi đồng minh, năng lượng sau khi thi triển xong | Năng lượng có thể giúp tung kỹ năng sớm hơn – kỹ năng vẫn cần đầy năng lượng |
| Theo thời gian | công tăng dần, thiêu đốt vùng, hồi máu, hồi năng lượng | Không |

Lưới an toàn: độ sâu lồng tối đa 2 (`ArtifactPassives.MAX_DEPTH`), vượt thì bỏ qua và đếm `CombatAudit.artDepthBlocked`. Toàn bộ logic dùng RNG có seed + đồng hồ mô phỏng → **LOW = ULTRA**, ×1 = ×2 (kiểm thử #18).

## 6. Giao diện

* **Dock Kho pháp bảo** (phải, dưới nút Menu; thu gọn bằng nút 法): 10 ô 44 px (+ ô tạm giữ viền đỏ), đếm `n/10`, gợi ý trạng thái, nút 📜 mở **bảng 36 công thức** (ma trận 8×8, chạm để xem chi tiết). Tự giới hạn chiều cao để không đè cửa hàng / nút Giao chiến; ẩn khi giao chiến.
* **Android**: chạm nguyên liệu 1 (hiện các pháp bảo ghép được với nguyên liệu đang có) → chạm nguyên liệu 2 → bảng xác nhận (tên, chỉ số, nội tại, kích hoạt, giới hạn) → Ghép / Huỷ. Chạm pháp bảo → chạm tướng (bàn / hàng chờ) để trang bị; chạm tướng địch → báo lỗi. Nhấn giữ ô → tooltip.
* **Windows**: kéo nguyên liệu thả lên nguyên liệu (ghép), kéo pháp bảo thả lên tướng (trang bị), kéo vào ô trống (sắp xếp); rê chuột lên ô → tooltip; khi đang cầm pháp bảo, rê lên tướng → **chỉ số trước → sau** (tính bằng đúng công thức trận).
* **Bảng thông tin tướng**: 3 ô pháp bảo (tên + điều kiện kích hoạt; sau trận: số lần kích hoạt, sát thương, hồi, khiên, năng lượng), ↩ tháo; chạm ô để chọn rồi chạm tướng khác để chuyển; dòng "Nếu trang bị …" khi đang cầm pháp bảo.
* Thao tác kho dùng `pointer capture` riêng, chặn lan xuống canvas → không xung đột với kéo tướng. Mọi lỗi có thông báo rõ ràng.

## 7. VFX

`ArtifactVFX.play(nhóm, tướng)` dùng lại pool hạt / pháp trận / sóng / vệt chém của `VFXManager` (không tạo material / geometry mới); màu theo nhóm lưu đệm. Giãn cách tối thiểu mỗi tướng (0,6 s ở LOW → 0,18 s ở ULTRA), số hạt ×0,35 (LOW) → ×1,5 (ULTRA); pháp trận từ MEDIUM, sóng phụ từ HIGH / ULTRA. Chỉ dùng `Math.random` – không đụng RNG trận.

## 8. Lưu trữ

Bản lưu **v3**: `inv { nextId, items: [[instanceId, itemId, 'i'|'u', ownerId, slot]] }`, `cid` trên mục hàng chờ / tướng trên bàn, `cidSeq`, `rewardLog` (vòng đã nhận thưởng). Chuyển đổi v2 → v3: 6 trang bị cũ → nguyên liệu trong kho. Trước khi ghi đè bản cũ, bản gốc được chép sang `vkkt_save_backup_v<cũ>`. Khi tải: làm sạch (instance trùng, chủ không tồn tại, ô sai, nguyên liệu "đang trang bị" → về kho; loại lạ bị bỏ) – không bỏ vật phẩm hợp lệ.

## 9. Chuẩn bị cho tuần 6

* `ArtifactInventory` đã có `instanceId` riêng + trường mở rộng được trên bản ghi → thêm cấp cường hoá (+1…+15), khảm ngọc chỉ cần thêm trường + bước `SAVE_MIGRATIONS[3]`.
* `PASSIVE_KINDS` + `ArtifactPassives` (bảng `switch` theo loại) → thêm loại nội tại mới = 1 mục dữ liệu + 1 nhánh xử lý; mô tả sinh từ tham số.
* `ArtifactStats.apply` là nơi duy nhất cộng chỉ số trang bị → hệ số cường hoá / bộ trang bị gắn vào đây.
* `tests/artifact-balance.js` đo giá trị biên từng món – dùng để chỉnh số khi có thêm cấp / bộ.
* Chưa có: tháo đồ bằng vật phẩm đặc biệt (kiểu "nam châm"), kéo thả trực tiếp từ ô trang bị trên bảng thông tin sang tướng khác (hiện là chạm → chạm), ghép trực tiếp trên tướng (TFT cho phép gắn nguyên liệu rồi ghép trên tướng – ở đây chỉ gắn pháp bảo hoàn chỉnh).
