# Vạn Kiếm Kỳ Trận (bản HTML5 / Three.js)

Auto chess tu tiên anime 3D chạy trực tiếp trên trình duyệt (Android, iOS, Windows). Một file: `index.html`.
Thư viện: Three.js r128 (cdnjs) + GLTFLoader (jsDelivr).

Chạy thử: mở `index.html` qua một web server tĩnh (ví dụ `npx serve web`) hoặc dùng link artifact.

## Cấu trúc mã (các module trong `index.html`)
| Mục | Module | Vai trò |
|---|---|---|
| 1 | QualityManager | 4 mức Thấp / Vừa / Cao / Tối đa, tự giảm khi FPS < 38 kéo dài 4 giây |
| 2 | ShaderLibrary | Toon / cel 3 bậc, rim light, viền (inverted hull), dissolve, hạt GPU, ribbon, pháp trận, xung kích, kiếm khí, khiên Fresnel, bầu trời, biển mây |
| 3 | Bloom | Bloom tự viết (bright pass → blur → cộng), ngưỡng cao để không cháy trắng |
| 4 | ParticlePool | Hạt GPU dùng bộ đệm vòng, giới hạn theo mức đồ hoạ |
| 5 | RibbonBatch | Nhiều dải vệt hướng camera trong 1 draw call (vệt kiếm, sét, tóc, dải lụa) |
| 6 | VFXManager | Pool mesh hiệu ứng, cập nhật, dọn dẹp |
| 7 | CharacterRig | Nhân vật thủ tục có khớp, động tác chuẩn bị → va chạm → thu chiêu, IK hướng nhìn, váy/tóc/dải lụa có chuyển động phụ |
| 8 | GLTFRig | Thay bằng GLB/GLTF có xương: AnimationMixer, crossfade, bỏ root motion ngang, socket tay phải |
| 9 | AnimationStateMachine | Trạng thái logic có chặn kẹt (maxTime → fallback) |
| 10 | SkillTimeline | Sự kiện theo thời gian mô phỏng: AnimationEvent, SpawnVFX, PlaySound, LaunchProjectile, ApplyDamage, ApplyStatusEffect, CameraImpulse, Cleanup; pause / resume / seek / cancel |
| 12 | CombatCamera | Góc nhìn auto chess, xoay / zoom chuột & cảm ứng, rung (trauma), impulse lò xo, camera điện ảnh có thể tắt |
| 17 | ProjectileSystem | Đạn pháp, cầu lửa, u hồn truy đuổi |
| 19 | SKILLS (SkillDefinitions) | Vạn Kiếm Quy Tông (5 giai đoạn), Thiên Lôi Quyết, Hỏa Phượng Phần Thiên, Hộ Thể Chân Khí; phe địch: Huyết Ảnh Trảm, U Minh Chú, Phá Địa Hống |
| 25 | Benchmark | 15 giây cảnh nặng nhất: FPS TB, 1% thấp, draw call, tam giác, hạt, đề xuất mức |

Mô phỏng chạy bước cố định 60 Hz; sát thương nằm trên timeline mô phỏng nên không đổi theo FPS.

## GLB / GLTF
Cài đặt → "Chọn file .glb". Tên clip được nhận theo mẫu: Idle, Walk, Run, Dash, Attack01–03, HeavyAttack,
SkillCast, UltimateCast, Hit, Stun, Knockback, Death, Victory. Kiếm gắn vào xương có tên chứa RightHand / hand_r.
Mô hình được tự co về cao 1.8 m; dịch chuyển ngang của xương Hips bị loại bỏ (logic tự di chuyển nhân vật).

## Giới hạn hiện tại
Nhân vật và animation là placeholder thủ tục, không phải animation dựng tay. Chưa có IK chân, chưa có VFX Graph.
