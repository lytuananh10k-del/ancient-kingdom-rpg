using UnityEngine;
using VanGioi.Utils;

namespace VanGioi.Player
{
    /// <summary>
    /// Dựng nhân vật placeholder: một tu sĩ áo trắng-lam, đeo kiếm sau lưng,
    /// cao ~1.78 m, làm từ primitive có hệ khớp kiểu Humanoid.
    /// </summary>
    public static class PlaceholderCharacterBuilder
    {
        public sealed class Palette
        {
            public Material Robe, RobeTrim, Skin, Hair, Boots, Blade, Hilt;

            public static Palette CreateDefault() => new Palette
            {
                Robe = MaterialFactory.Lit("M_Char_Robe", new Color(0.86f, 0.89f, 0.92f), 0.25f),
                RobeTrim = MaterialFactory.Lit("M_Char_RobeTrim", new Color(0.20f, 0.38f, 0.58f), 0.3f),
                Skin = MaterialFactory.Lit("M_Char_Skin", new Color(0.93f, 0.78f, 0.66f), 0.35f),
                Hair = MaterialFactory.Lit("M_Char_Hair", new Color(0.06f, 0.05f, 0.05f), 0.5f),
                Boots = MaterialFactory.Lit("M_Char_Boots", new Color(0.15f, 0.13f, 0.12f), 0.2f),
                Blade = MaterialFactory.Lit("M_Char_Blade", new Color(0.80f, 0.86f, 0.92f), 0.85f, 1f),
                Hilt = MaterialFactory.Lit("M_Char_Hilt", new Color(0.55f, 0.40f, 0.18f), 0.6f, 0.6f),
            };
        }

        /// <summary>Tạo model placeholder làm con của <paramref name="visualRoot"/>.</summary>
        public static PlaceholderRig Build(Transform visualRoot, Palette palette = null)
        {
            palette ??= Palette.CreateDefault();
            var model = new GameObject("PlaceholderModel").transform;
            model.SetParent(visualRoot, false);

            // Hông (Hips) – gốc của hệ xương.
            var hips = ObjectUtil.Pivot("Hips", model, new Vector3(0, 0.95f, 0));
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Robe_Skirt", hips, new Vector3(0, -0.22f, 0), new Vector3(0.46f, 0.26f, 0.36f), palette.Robe);
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Robe_Hem", hips, new Vector3(0, -0.46f, 0), new Vector3(0.50f, 0.02f, 0.40f), palette.RobeTrim);
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Sash", hips, new Vector3(0, 0.04f, 0), new Vector3(0.38f, 0.05f, 0.29f), palette.RobeTrim);

            // Thân trên.
            var spine = ObjectUtil.Pivot("Spine", hips, new Vector3(0, 0.05f, 0));
            ObjectUtil.Primitive(PrimitiveType.Capsule, "Torso", spine, new Vector3(0, 0.28f, 0), new Vector3(0.40f, 0.30f, 0.26f), palette.Robe);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Collar", spine, new Vector3(0, 0.50f, 0.09f), new Vector3(0.20f, 0.10f, 0.05f), palette.RobeTrim);

            // Đầu.
            var head = ObjectUtil.Pivot("Head", spine, new Vector3(0, 0.62f, 0));
            ObjectUtil.Primitive(PrimitiveType.Capsule, "Neck", head, new Vector3(0, -0.04f, 0), new Vector3(0.09f, 0.06f, 0.09f), palette.Skin);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "Face", head, new Vector3(0, 0.12f, 0), new Vector3(0.21f, 0.24f, 0.22f), palette.Skin);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "Hair", head, new Vector3(0, 0.15f, -0.035f), new Vector3(0.23f, 0.23f, 0.23f), palette.Hair);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "HairBun", head, new Vector3(0, 0.29f, -0.04f), new Vector3(0.10f, 0.09f, 0.10f), palette.Hair);
            ObjectUtil.Primitive(PrimitiveType.Cube, "HairPin", head, new Vector3(0, 0.30f, -0.04f), new Vector3(0.18f, 0.012f, 0.012f), palette.Hilt);
            // Hai mắt giúp nhận biết hướng nhìn.
            ObjectUtil.Primitive(PrimitiveType.Sphere, "EyeL", head, new Vector3(-0.045f, 0.13f, 0.1f), Vector3.one * 0.025f, palette.Hair);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "EyeR", head, new Vector3(0.045f, 0.13f, 0.1f), Vector3.one * 0.025f, palette.Hair);

            // Tay (pivot ở vai).
            var lArm = BuildArm("LeftUpperArm", spine, -1f, palette);
            var rArm = BuildArm("RightUpperArm", spine, 1f, palette);

            // Chân (pivot ở khớp háng).
            var lLeg = BuildLeg("LeftUpperLeg", hips, -1f, palette);
            var rLeg = BuildLeg("RightUpperLeg", hips, 1f, palette);

            // Kiếm đeo sau lưng (sẽ thay bằng hệ thống trang bị ở Giai đoạn 4).
            var swordSocket = ObjectUtil.Pivot("Socket_BackSword", spine, new Vector3(0, 0.30f, -0.17f));
            swordSocket.localRotation = Quaternion.Euler(0, 0, 35f);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Blade", swordSocket, new Vector3(0, -0.05f, 0), new Vector3(0.05f, 0.85f, 0.012f), palette.Blade);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Guard", swordSocket, new Vector3(0, 0.38f, 0), new Vector3(0.16f, 0.03f, 0.04f), palette.Hilt);
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Grip", swordSocket, new Vector3(0, 0.49f, 0), new Vector3(0.03f, 0.09f, 0.03f), palette.Hilt);

            var rig = model.gameObject.AddComponent<PlaceholderRig>();
            rig.hips = hips;
            rig.spine = spine;
            rig.head = head;
            rig.leftUpperArm = lArm;
            rig.rightUpperArm = rArm;
            rig.leftUpperLeg = lLeg;
            rig.rightUpperLeg = rLeg;

            // Socket vũ khí tay phải – dùng cho Giai đoạn 2.
            ObjectUtil.Pivot("Socket_RightHand", rArm, new Vector3(0, -0.58f, 0.02f));
            return rig;
        }

        static Transform BuildArm(string name, Transform spine, float side, Palette p)
        {
            var shoulder = ObjectUtil.Pivot(name, spine, new Vector3(0.25f * side, 0.46f, 0));
            ObjectUtil.Primitive(PrimitiveType.Capsule, "Sleeve", shoulder, new Vector3(0.02f * side, -0.25f, 0), new Vector3(0.13f, 0.26f, 0.13f), p.Robe);
            ObjectUtil.Primitive(PrimitiveType.Cylinder, "Cuff", shoulder, new Vector3(0.02f * side, -0.48f, 0), new Vector3(0.12f, 0.02f, 0.12f), p.RobeTrim);
            ObjectUtil.Primitive(PrimitiveType.Sphere, "Hand", shoulder, new Vector3(0.02f * side, -0.56f, 0), new Vector3(0.08f, 0.09f, 0.08f), p.Skin);
            return shoulder;
        }

        static Transform BuildLeg(string name, Transform hips, float side, Palette p)
        {
            var hip = ObjectUtil.Pivot(name, hips, new Vector3(0.11f * side, -0.05f, 0));
            ObjectUtil.Primitive(PrimitiveType.Capsule, "Leg", hip, new Vector3(0, -0.42f, 0), new Vector3(0.15f, 0.42f, 0.15f), p.Robe);
            ObjectUtil.Primitive(PrimitiveType.Cube, "Boot", hip, new Vector3(0, -0.84f, 0.04f), new Vector3(0.13f, 0.12f, 0.24f), p.Boots);
            return hip;
        }
    }
}
