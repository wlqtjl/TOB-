// unity/Assets/Scripts/Rendering/EntityMeshPool.cs
// Mesh pool — reusable Mesh objects to avoid per-frame GC pressure.
//
// TelemetryRenderer uses DrawMeshInstanced so it does not need individual
// MeshFilter/MeshRenderer components per entity.  This pool is used by
// future systems that need per-entity GameObjects (e.g., click-to-inspect).
//
// Rule: never Instantiate() a Mesh inside Update(). Always rent/return.

using System.Collections.Generic;
using UnityEngine;

public class EntityMeshPool : MonoBehaviour
{
    [Header("Pool Config")]
    public Mesh   templateMesh;
    public int    initialPoolSize = 256;

    private readonly Queue<Mesh> _free = new();
    private readonly List<Mesh>  _all  = new();  // for cleanup

    void Awake()
    {
        for (int i = 0; i < initialPoolSize; i++)
            AddToPool();
    }

    /// <summary>Rent a Mesh from the pool. Creates one if the pool is empty.</summary>
    public Mesh Rent()
    {
        if (_free.Count == 0)
        {
            Debug.LogWarning("[OmniSim] EntityMeshPool exhausted — growing pool.");
            AddToPool();
        }
        return _free.Dequeue();
    }

    /// <summary>Return a Mesh to the pool. Clears it before returning.</summary>
    public void Return(Mesh mesh)
    {
        mesh.Clear();
        _free.Enqueue(mesh);
    }

    private void AddToPool()
    {
        Mesh m = templateMesh != null
            ? Instantiate(templateMesh)
            : new Mesh { name = "PooledEntityMesh" };
        _all.Add(m);
        _free.Enqueue(m);
    }

    void OnDestroy()
    {
        foreach (var m in _all)
            if (m != null) Destroy(m);
    }

    public int FreeCount => _free.Count;
    public int TotalCount => _all.Count;
}
