using System;
using System.Collections.Generic;
using UnityEngine;

namespace VanGioi.Utils
{
    /// <summary>
    /// Object pool đơn giản cho component (VFX, số sát thương, đạn…): tái sử dụng thay vì
    /// Instantiate / Destroy liên tục → không tạo rác GC, không giật khung hình trên Android.
    /// </summary>
    public sealed class ComponentPool<T> where T : Component
    {
        readonly Func<T> factory;
        readonly Stack<T> free = new Stack<T>();
        readonly int maxSize;

        public int CountAll { get; private set; }
        public int CountFree => free.Count;

        public ComponentPool(Func<T> factory, int prewarm = 0, int maxSize = 64)
        {
            this.factory = factory;
            this.maxSize = maxSize;
            for (int i = 0; i < prewarm; i++) Release(Create());
        }

        T Create()
        {
            CountAll++;
            return factory();
        }

        public T Get()
        {
            T item = null;
            while (free.Count > 0 && item == null) item = free.Pop(); // bỏ qua phần tử đã bị huỷ
            if (item == null) item = Create();
            item.gameObject.SetActive(true);
            return item;
        }

        public void Release(T item)
        {
            if (item == null) return;
            if (free.Count >= maxSize)
            {
                UnityEngine.Object.Destroy(item.gameObject);
                CountAll--;
                return;
            }
            item.gameObject.SetActive(false);
            free.Push(item);
        }
    }
}
