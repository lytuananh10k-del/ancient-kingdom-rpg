using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace VanGioi.Input
{
    /// <summary>
    /// Đọc bàn phím, chuột và tay cầm. Hỗ trợ cả Input System Package (mặc định của Unity 6)
    /// lẫn Input Manager cũ – tự chọn theo Project Settings > Player > Active Input Handling.
    /// </summary>
    public sealed class DesktopInputReader
    {
        /// <summary>Tốc độ xoay camera bằng cần phải tay cầm (pixel tương đương / giây).</summary>
        public float GamepadLookSpeed = 1200f;

        public void Read(ref PlayerInputState s)
        {
            bool cursorLocked = Cursor.lockState == CursorLockMode.Locked;
#if ENABLE_INPUT_SYSTEM
            var kb = Keyboard.current;
            if (kb != null)
            {
                var move = Vector2.zero;
                if (kb.wKey.isPressed || kb.upArrowKey.isPressed) move.y += 1f;
                if (kb.sKey.isPressed || kb.downArrowKey.isPressed) move.y -= 1f;
                if (kb.dKey.isPressed || kb.rightArrowKey.isPressed) move.x += 1f;
                if (kb.aKey.isPressed || kb.leftArrowKey.isPressed) move.x -= 1f;
                s.Move += move;

                s.SprintHeld |= kb.leftShiftKey.isPressed;
                s.JumpPressed |= kb.spaceKey.wasPressedThisFrame;
                s.JumpHeld |= kb.spaceKey.isPressed;
                s.WalkTogglePressed |= kb.capsLockKey.wasPressedThisFrame;
                s.DodgePressed |= kb.leftCtrlKey.wasPressedThisFrame;
                s.LockOnPressed |= kb.tKey.wasPressedThisFrame;
                s.Skill1Pressed |= kb.qKey.wasPressedThisFrame;
                s.Skill2Pressed |= kb.eKey.wasPressedThisFrame;
                s.Skill3Pressed |= kb.rKey.wasPressedThisFrame;
                s.Skill4Pressed |= kb.fKey.wasPressedThisFrame;
                s.InventoryPressed |= kb.tabKey.wasPressedThisFrame;
                s.MapPressed |= kb.mKey.wasPressedThisFrame;
                s.PausePressed |= kb.escapeKey.wasPressedThisFrame;
                s.DebugTogglePressed |= kb.f1Key.wasPressedThisFrame;
                s.QualityCyclePressed |= kb.f2Key.wasPressedThisFrame;
            }

            var mouse = Mouse.current;
            if (mouse != null)
            {
                // Chỉ xoay camera khi con trỏ bị khoá, hoặc đang giữ chuột phải.
                if (cursorLocked || mouse.rightButton.isPressed) s.Look += mouse.delta.ReadValue();
                float scroll = mouse.scroll.ReadValue().y;
                if (Mathf.Abs(scroll) > 0.01f) s.Zoom += Mathf.Sign(scroll);
                if (cursorLocked) s.AttackPressed |= mouse.leftButton.wasPressedThisFrame;
                s.LockOnPressed |= mouse.middleButton.wasPressedThisFrame;
            }

            var pad = Gamepad.current;
            if (pad != null)
            {
                s.Move += pad.leftStick.ReadValue();
                s.Look += pad.rightStick.ReadValue() * GamepadLookSpeed * Time.unscaledDeltaTime;
                s.SprintHeld |= pad.leftStickButton.isPressed || pad.leftTrigger.isPressed;
                s.JumpPressed |= pad.buttonSouth.wasPressedThisFrame;
                s.JumpHeld |= pad.buttonSouth.isPressed;
                s.DodgePressed |= pad.buttonEast.wasPressedThisFrame;
                s.AttackPressed |= pad.buttonWest.wasPressedThisFrame;
                s.Skill1Pressed |= pad.buttonNorth.wasPressedThisFrame;
                s.LockOnPressed |= pad.rightStickButton.wasPressedThisFrame;
                s.PausePressed |= pad.startButton.wasPressedThisFrame;
                s.MapPressed |= pad.selectButton.wasPressedThisFrame;
            }
#else
            var move = Vector2.zero;
            if (UnityEngine.Input.GetKey(KeyCode.W) || UnityEngine.Input.GetKey(KeyCode.UpArrow)) move.y += 1f;
            if (UnityEngine.Input.GetKey(KeyCode.S) || UnityEngine.Input.GetKey(KeyCode.DownArrow)) move.y -= 1f;
            if (UnityEngine.Input.GetKey(KeyCode.D) || UnityEngine.Input.GetKey(KeyCode.RightArrow)) move.x += 1f;
            if (UnityEngine.Input.GetKey(KeyCode.A) || UnityEngine.Input.GetKey(KeyCode.LeftArrow)) move.x -= 1f;
            s.Move += move;

            s.SprintHeld |= UnityEngine.Input.GetKey(KeyCode.LeftShift);
            s.JumpPressed |= UnityEngine.Input.GetKeyDown(KeyCode.Space);
            s.JumpHeld |= UnityEngine.Input.GetKey(KeyCode.Space);
            s.WalkTogglePressed |= UnityEngine.Input.GetKeyDown(KeyCode.CapsLock);
            s.DodgePressed |= UnityEngine.Input.GetKeyDown(KeyCode.LeftControl);
            s.LockOnPressed |= UnityEngine.Input.GetKeyDown(KeyCode.T) || UnityEngine.Input.GetMouseButtonDown(2);
            s.Skill1Pressed |= UnityEngine.Input.GetKeyDown(KeyCode.Q);
            s.Skill2Pressed |= UnityEngine.Input.GetKeyDown(KeyCode.E);
            s.Skill3Pressed |= UnityEngine.Input.GetKeyDown(KeyCode.R);
            s.Skill4Pressed |= UnityEngine.Input.GetKeyDown(KeyCode.F);
            s.InventoryPressed |= UnityEngine.Input.GetKeyDown(KeyCode.Tab);
            s.MapPressed |= UnityEngine.Input.GetKeyDown(KeyCode.M);
            s.PausePressed |= UnityEngine.Input.GetKeyDown(KeyCode.Escape);
            s.DebugTogglePressed |= UnityEngine.Input.GetKeyDown(KeyCode.F1);
            s.QualityCyclePressed |= UnityEngine.Input.GetKeyDown(KeyCode.F2);

            if (cursorLocked || UnityEngine.Input.GetMouseButton(1))
            {
                // Trục "Mouse X/Y" mặc định có hệ số 0.1 → nhân 10 để xấp xỉ pixel.
                s.Look += new Vector2(UnityEngine.Input.GetAxisRaw("Mouse X"), UnityEngine.Input.GetAxisRaw("Mouse Y")) * 10f;
            }
            float scroll = UnityEngine.Input.mouseScrollDelta.y;
            if (Mathf.Abs(scroll) > 0.01f) s.Zoom += Mathf.Sign(scroll);
            if (cursorLocked) s.AttackPressed |= UnityEngine.Input.GetMouseButtonDown(0);
#endif
        }
    }
}
