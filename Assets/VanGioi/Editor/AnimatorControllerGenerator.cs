using System.IO;
using UnityEditor;
using UnityEditor.Animations;
using UnityEngine;

namespace VanGioi.EditorTools
{
    /// <summary>
    /// Sinh Animator Controller mẫu đúng hợp đồng tham số của PlayerAnimationController / EnemyAI.
    /// Các state chưa có clip (Motion = None): kéo clip của bạn vào từng state / Blend Tree là chạy.
    /// </summary>
    public static class AnimatorControllerGenerator
    {
        const string Folder = "Assets/VanGioi/Animation";

        [MenuItem("Vân Giới/Animation/Tạo Animator Controller mẫu – Người chơi", priority = 30)]
        public static void CreatePlayerController()
        {
            string path = Folder + "/AC_Player.controller";
            if (!ConfirmOverwrite(path)) return;
            var ctrl = AnimatorController.CreateAnimatorControllerAtPath(path);

            AddFloat(ctrl, "Speed"); AddFloat(ctrl, "Speed01"); AddFloat(ctrl, "VerticalSpeed");
            AddBool(ctrl, "Grounded"); AddBool(ctrl, "Sprinting"); AddInt(ctrl, "MoveState");
            AddTrigger(ctrl, "Jump"); AddTrigger(ctrl, "Land");
            AddTrigger(ctrl, "Attack"); AddInt(ctrl, "ComboStep"); AddTrigger(ctrl, "Counter");
            AddTrigger(ctrl, "Dodge"); AddBool(ctrl, "Backstep");
            AddBool(ctrl, "Blocking"); AddTrigger(ctrl, "Parry"); AddTrigger(ctrl, "Hit"); AddBool(ctrl, "Dead");

            var sm = ctrl.layers[0].stateMachine;

            // Locomotion: Blend Tree 1D theo Speed (m/s) – khớp tốc độ của PlayerController.
            var locomotion = ctrl.CreateBlendTreeInController("Locomotion", out var loco, 0);
            loco.blendType = BlendTreeType.Simple1D;
            loco.blendParameter = "Speed";
            loco.useAutomaticThresholds = false;
            loco.AddChild(null, 0f);    // Idle
            loco.AddChild(null, 2.2f);  // Walk
            loco.AddChild(null, 5.5f);  // Run
            loco.AddChild(null, 9f);    // Sprint
            sm.defaultState = locomotion;

            var jumpStart = sm.AddState("JumpStart", new Vector3(300, -120));
            var airborne = sm.AddState("Airborne", new Vector3(560, -120));
            var airTree = new BlendTree { name = "AirborneTree", blendType = BlendTreeType.Simple1D, blendParameter = "VerticalSpeed", useAutomaticThresholds = false };
            AssetDatabase.AddObjectToAsset(airTree, ctrl);
            airTree.AddChild(null, -10f); // Fall
            airTree.AddChild(null, 5f);   // Jump up
            airborne.motion = airTree;
            var land = sm.AddState("Land", new Vector3(560, 0));

            var block = sm.AddState("Block", new Vector3(300, 120));
            var parry = sm.AddState("Parry", new Vector3(560, 120));
            var hit = sm.AddState("Hit", new Vector3(-250, 120));
            var death = sm.AddState("Death", new Vector3(-250, 240));
            var dodge = sm.AddState("Dodge", new Vector3(-250, -120));
            var backstep = sm.AddState("Backstep", new Vector3(-250, -240));
            var counter = sm.AddState("Counter", new Vector3(300, 360));

            // Di chuyển / nhảy.
            To(locomotion, jumpStart, 0.08f).AddCondition(AnimatorConditionMode.If, 0, "Jump");
            To(jumpStart, airborne, 0.1f, 0.85f);
            To(locomotion, airborne, 0.15f).AddCondition(AnimatorConditionMode.IfNot, 0, "Grounded");
            To(airborne, land, 0.05f).AddCondition(AnimatorConditionMode.If, 0, "Grounded");
            To(land, locomotion, 0.15f, 0.6f);

            // Combo 4 đòn: AnyState → Attack_n khi Attack + ComboStep == n.
            for (int i = 0; i < 4; i++)
            {
                var attack = sm.AddState($"Attack_{i + 1}", new Vector3(40 + i * 180, 260));
                var t = Any(sm, attack, 0.05f);
                t.AddCondition(AnimatorConditionMode.If, 0, "Attack");
                t.AddCondition(AnimatorConditionMode.Equals, i, "ComboStep");
                To(attack, locomotion, 0.15f, 0.92f);
            }
            Any(sm, counter, 0.04f).AddCondition(AnimatorConditionMode.If, 0, "Counter");
            To(counter, locomotion, 0.15f, 0.92f);

            // Né.
            var d = Any(sm, dodge, 0.04f);
            d.AddCondition(AnimatorConditionMode.If, 0, "Dodge");
            d.AddCondition(AnimatorConditionMode.IfNot, 0, "Backstep");
            var b = Any(sm, backstep, 0.04f);
            b.AddCondition(AnimatorConditionMode.If, 0, "Dodge");
            b.AddCondition(AnimatorConditionMode.If, 0, "Backstep");
            To(dodge, locomotion, 0.12f, 0.9f);
            To(backstep, locomotion, 0.12f, 0.9f);

            // Đỡ / đỡ hoàn hảo.
            To(locomotion, block, 0.1f).AddCondition(AnimatorConditionMode.If, 0, "Blocking");
            To(block, locomotion, 0.12f).AddCondition(AnimatorConditionMode.IfNot, 0, "Blocking");
            To(block, parry, 0.03f).AddCondition(AnimatorConditionMode.If, 0, "Parry");
            To(parry, block, 0.1f, 0.9f);

            // Trúng đòn / chết.
            Any(sm, hit, 0.05f).AddCondition(AnimatorConditionMode.If, 0, "Hit");
            To(hit, locomotion, 0.15f, 0.9f);
            Any(sm, death, 0.1f).AddCondition(AnimatorConditionMode.If, 0, "Dead");
            To(death, locomotion, 0.2f).AddCondition(AnimatorConditionMode.IfNot, 0, "Dead");

            Finish(ctrl, path);
        }

        [MenuItem("Vân Giới/Animation/Tạo Animator Controller mẫu – Yêu thú", priority = 31)]
        public static void CreateEnemyController()
        {
            string path = Folder + "/AC_Enemy_Quadruped.controller";
            if (!ConfirmOverwrite(path)) return;
            var ctrl = AnimatorController.CreateAnimatorControllerAtPath(path);
            AddFloat(ctrl, "Speed"); AddTrigger(ctrl, "Attack"); AddTrigger(ctrl, "Hit"); AddBool(ctrl, "Dead");

            var sm = ctrl.layers[0].stateMachine;
            var locomotion = ctrl.CreateBlendTreeInController("Locomotion", out var loco, 0);
            loco.blendType = BlendTreeType.Simple1D;
            loco.blendParameter = "Speed";
            loco.useAutomaticThresholds = false;
            loco.AddChild(null, 0f);  // Idle
            loco.AddChild(null, 2f);  // Walk
            loco.AddChild(null, 7f);  // Run
            sm.defaultState = locomotion;

            var attack = sm.AddState("Attack", new Vector3(300, -100));
            var hit = sm.AddState("Hit", new Vector3(300, 0));
            var death = sm.AddState("Death", new Vector3(300, 100));
            Any(sm, attack, 0.05f).AddCondition(AnimatorConditionMode.If, 0, "Attack");
            To(attack, locomotion, 0.15f, 0.9f);
            Any(sm, hit, 0.05f).AddCondition(AnimatorConditionMode.If, 0, "Hit");
            To(hit, locomotion, 0.1f, 0.85f);
            Any(sm, death, 0.1f).AddCondition(AnimatorConditionMode.If, 0, "Dead");
            To(death, locomotion, 0.2f).AddCondition(AnimatorConditionMode.IfNot, 0, "Dead");

            Finish(ctrl, path);
        }

        // ------------------------------------------------------------------

        static bool ConfirmOverwrite(string path)
        {
            if (!AssetDatabase.IsValidFolder(Folder))
            {
                AssetDatabase.CreateFolder(Path.GetDirectoryName(Folder)?.Replace('\\', '/'), Path.GetFileName(Folder));
            }
            if (AssetDatabase.LoadAssetAtPath<AnimatorController>(path) == null) return true;
            if (!EditorUtility.DisplayDialog("Vân Giới", $"{path} đã tồn tại. Ghi đè (mất các clip đã gán)?", "Ghi đè", "Huỷ")) return false;
            AssetDatabase.DeleteAsset(path);
            return true;
        }

        static void Finish(AnimatorController ctrl, string path)
        {
            EditorUtility.SetDirty(ctrl);
            AssetDatabase.SaveAssets();
            Selection.activeObject = ctrl;
            EditorGUIUtility.PingObject(ctrl);
            Debug.Log($"[Vân Giới] Đã tạo {path}. Gán clip cho từng state rồi kéo controller vào Animator của model.");
        }

        static AnimatorStateTransition To(AnimatorState from, AnimatorState to, float duration, float exitTime = -1f)
        {
            var t = from.AddTransition(to);
            t.hasExitTime = exitTime >= 0f;
            if (t.hasExitTime) t.exitTime = exitTime;
            t.duration = duration;
            t.hasFixedDuration = true;
            return t;
        }

        static AnimatorStateTransition Any(AnimatorStateMachine sm, AnimatorState to, float duration)
        {
            var t = sm.AddAnyStateTransition(to);
            t.hasExitTime = false;
            t.duration = duration;
            t.hasFixedDuration = true;
            t.canTransitionToSelf = false;
            return t;
        }

        static void AddFloat(AnimatorController c, string n) => c.AddParameter(n, AnimatorControllerParameterType.Float);
        static void AddInt(AnimatorController c, string n) => c.AddParameter(n, AnimatorControllerParameterType.Int);
        static void AddTrigger(AnimatorController c, string n) => c.AddParameter(n, AnimatorControllerParameterType.Trigger);

        static void AddBool(AnimatorController c, string n) => c.AddParameter(n, AnimatorControllerParameterType.Bool);
    }
}
